package model

import (
	"errors"
	"fmt"
	"time"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

// AffiliateRecord tracks commission earned when a referred user tops up.
type AffiliateRecord struct {
	Id              int     `json:"id"`
	ReferrerId      int     `json:"referrer_id" gorm:"index"`      // 邀请者
	ReferredUserId  int     `json:"referred_user_id" gorm:"index"` // 被邀请者
	TopUpId         int     `json:"top_up_id"`
	TopUpAmount     float64 `json:"top_up_amount"`     // 充值金额
	CommissionRate  float64 `json:"commission_rate"`   // 佣金比例 (e.g. 0.30)
	CommissionAmount float64 `json:"commission_amount"` // 佣金金额
	Status          string  `json:"status" gorm:"type:varchar(20);default:'pending'"` // pending/settled
	CreateTime      int64   `json:"create_time"`
}

const (
	AffiliateRecordStatusPending = "pending"
	AffiliateRecordStatusSettled = "settled"
)

// AffiliateSettlement tracks withdrawal/settlement requests.
type AffiliateSettlement struct {
	Id          int     `json:"id"`
	UserId      int     `json:"user_id" gorm:"index"`
	Amount      float64 `json:"amount"`
	Status      string  `json:"status" gorm:"type:varchar(20);default:'pending'"` // pending/approved/rejected
	ApplyTime   int64   `json:"apply_time"`
	ApproveTime int64   `json:"approve_time"`
	Remark      string  `json:"remark" gorm:"type:varchar(255)"`
}

const (
	AffiliateSettlementStatusPending  = "pending"
	AffiliateSettlementStatusApproved = "approved"
	AffiliateSettlementStatusRejected = "rejected"
)

var (
	ErrAffiliateAlreadyApplied   = errors.New("已申请推广联盟")
	ErrAffiliateNoEarnings       = errors.New("没有可结算的收益")
	ErrAffiliateMinSettlement    = errors.New("收益不足最低结算金额")
	ErrAffiliateSettlementExists = errors.New("已有待处理的结算申请")
	ErrAffiliateSettlementDone   = errors.New("结算已完成")
)

// ─── AffiliateRecord ───

func (r *AffiliateRecord) Insert() error {
	return DB.Create(r).Error
}

func CreateAffiliateRecord(referrerId, referredUserId, topUpId int, topUpAmount float64) error {
	if referrerId == 0 || referredUserId == 0 {
		return nil
	}
	rate := float64(common.AffiliateCommissionRate) / 100.0
	record := &AffiliateRecord{
		ReferrerId:      referrerId,
		ReferredUserId:  referredUserId,
		TopUpId:         topUpId,
		TopUpAmount:     topUpAmount,
		CommissionRate:  rate,
		CommissionAmount: topUpAmount * rate,
		Status:          AffiliateRecordStatusPending,
		CreateTime:      common.GetTimestamp(),
	}
	return record.Insert()
}

type AffiliateRecordInfo struct {
	AffiliateRecord
	ReferredUserName string `json:"referred_user_name"`
}

func GetUserAffiliateRecords(userId int, startIdx int, num int) (records []*AffiliateRecordInfo, total int64) {
	DB.Table("affiliate_records").
		Where("referrer_id = ?", userId).
		Count(&total)

	DB.Table("affiliate_records").
		Select("affiliate_records.*, users.display_name as referred_user_name").
		Joins("left join users on users.id = affiliate_records.referred_user_id").
		Where("affiliate_records.referrer_id = ?", userId).
		Order("affiliate_records.id desc").
		Offset(startIdx).Limit(num).
		Find(&records)
	return
}

type AffiliateStats struct {
	TotalReferrals    int     `json:"total_referrals"`
	TotalEarnings     float64 `json:"total_earnings"`
	PendingEarnings   float64 `json:"pending_earnings"`
	SettledEarnings   float64 `json:"settled_earnings"`
	AvailableEarnings float64 `json:"available_earnings"`
	AffCode           string  `json:"aff_code"`
}

func GetUserAffiliateStats(userId int) *AffiliateStats {
	stats := &AffiliateStats{}
	u, _ := GetUserById(userId, false)
	if u != nil {
		stats.AffCode = u.AffCode
		stats.TotalReferrals = u.AffCount
	}

	// Total commission earned (pending + settled)
	DB.Table("affiliate_records").
		Where("referrer_id = ?", userId).
		Select("COALESCE(SUM(commission_amount), 0)").
		Scan(&stats.TotalEarnings)

	// Pending (not yet settled)
	DB.Table("affiliate_records").
		Where("referrer_id = ? AND status = ?", userId, AffiliateRecordStatusPending).
		Select("COALESCE(SUM(commission_amount), 0)").
		Scan(&stats.PendingEarnings)

	// Settled
	DB.Table("affiliate_records").
		Where("referrer_id = ? AND status = ?", userId, AffiliateRecordStatusSettled).
		Select("COALESCE(SUM(commission_amount), 0)").
		Scan(&stats.SettledEarnings)

	// Total approved settlements (already paid)
	var settledAmount float64
	DB.Table("affiliate_settlements").
		Where("user_id = ? AND status = ?", userId, AffiliateSettlementStatusApproved).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&settledAmount)

	// Available = total - already settled
	stats.AvailableEarnings = stats.TotalEarnings - settledAmount
	if stats.AvailableEarnings < 0 {
		stats.AvailableEarnings = 0
	}

	return stats
}

// ─── AffiliateSettlement ───

func ApplySettlement(userId int) error {
	stats := GetUserAffiliateStats(userId)
	if stats.AvailableEarnings <= 0 {
		return ErrAffiliateNoEarnings
	}
	if stats.AvailableEarnings < float64(common.AffiliateMinSettlement) {
		return ErrAffiliateMinSettlement
	}

	// Check for existing pending settlement
	var count int64
	DB.Model(&AffiliateSettlement{}).
		Where("user_id = ? AND status = ?", userId, AffiliateSettlementStatusPending).
		Count(&count)
	if count > 0 {
		return ErrAffiliateSettlementExists
	}

	// Check weekly limit: only one settlement per week
	weekAgo := time.Now().AddDate(0, 0, -7).Unix()
	DB.Model(&AffiliateSettlement{}).
		Where("user_id = ? AND apply_time > ? AND status != ?", userId, weekAgo, AffiliateSettlementStatusRejected).
		Count(&count)
	if count > 0 {
		return errors.New("每周只能申请一次结算")
	}

	return DB.Transaction(func(tx *gorm.DB) error {
		settlement := &AffiliateSettlement{
			UserId:    userId,
			Amount:    stats.AvailableEarnings,
			Status:    AffiliateSettlementStatusPending,
			ApplyTime: common.GetTimestamp(),
		}
		if err := tx.Create(settlement).Error; err != nil {
			return err
		}

		// Mark all pending records as "settled" to prevent double-counting
		return tx.Model(&AffiliateRecord{}).
			Where("referrer_id = ? AND status = ?", userId, AffiliateRecordStatusPending).
			Update("status", AffiliateRecordStatusSettled).Error
	})
}

// ─── Admin ───

type AffiliateUserInfo struct {
	UserId       int     `json:"user_id"`
	UserName     string  `json:"user_name"`
	AffCode      string  `json:"aff_code"`
	AffCount     int     `json:"aff_count"`
	TotalEarnings float64 `json:"total_earnings"`
}

func GetAffiliateList(startIdx int, num int) (affiliates []*AffiliateUserInfo, total int64) {
	DB.Table("users").
		Where("aff_code != '' AND role >= ?", common.RoleCommonUser).
		Count(&total)

	DB.Table("users").
		Select("users.id as user_id, users.display_name as user_name, users.aff_code, users.aff_count, COALESCE(SUM(ar.commission_amount), 0) as total_earnings").
		Joins("left join affiliate_records ar on ar.referrer_id = users.id").
		Where("users.aff_code != '' AND users.role >= ?", common.RoleCommonUser).
		Group("users.id").
		Order("total_earnings desc").
		Offset(startIdx).Limit(num).
		Find(&affiliates)
	return
}

type AffiliateSettlementInfo struct {
	AffiliateSettlement
	UserName string `json:"user_name"`
	AffCode  string `json:"aff_code"`
}

func GetSettlementList(status string, startIdx int, num int) (settlements []*AffiliateSettlementInfo, total int64) {
	query := DB.Table("affiliate_settlements")
	if status != "" && status != "all" {
		query = query.Where("affiliate_settlements.status = ?", status)
	}
	query.Count(&total)

	DB.Table("affiliate_settlements").
		Select("affiliate_settlements.*, users.display_name as user_name, users.aff_code").
		Joins("left join users on users.id = affiliate_settlements.user_id").
		Where(func() *gorm.DB {
			if status != "" && status != "all" {
				return DB.Where("affiliate_settlements.status = ?", status)
			}
			return DB
		}()).
		Order("affiliate_settlements.id desc").
		Offset(startIdx).Limit(num).
		Find(&settlements)
	return
}

func GetSettlementById(id int) *AffiliateSettlement {
	var s AffiliateSettlement
	err := DB.Where("id = ?", id).First(&s).Error
	if err != nil {
		return nil
	}
	return &s
}

func ApproveSettlement(id int, remark string) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		s := &AffiliateSettlement{}
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", id).First(s).Error; err != nil {
			return errors.New("结算申请不存在")
		}
		if s.Status != AffiliateSettlementStatusPending {
			return ErrAffiliateSettlementDone
		}

		s.Status = AffiliateSettlementStatusApproved
		s.ApproveTime = common.GetTimestamp()
		s.Remark = remark
		if err := tx.Save(s).Error; err != nil {
			return err
		}

		// Add quota to user's balance
		quota := s.Amount * common.QuotaPerUnit
		return tx.Model(&User{}).Where("id = ?", s.UserId).
			Update("quota", gorm.Expr("quota + ?", quota)).Error
	})
}

func RejectSettlement(id int, remark string) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		s := &AffiliateSettlement{}
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", id).First(s).Error; err != nil {
			return errors.New("结算申请不存在")
		}
		if s.Status != AffiliateSettlementStatusPending {
			return ErrAffiliateSettlementDone
		}

		s.Status = AffiliateSettlementStatusRejected
		s.ApproveTime = common.GetTimestamp()
		s.Remark = remark
		return tx.Save(s).Error
	})
}

// Log settlement action
func RecordAffiliateLog(userId int, message string) {
	if common.LogConsumeEnabled {
		RecordLog(userId, LogTypeAffiliate, fmt.Sprintf("[推广联盟] %s", message))
	}
}
