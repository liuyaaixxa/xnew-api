package model

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"

	"gorm.io/gorm"
)

type Redemption struct {
	Id           int            `json:"id"`
	UserId       int            `json:"user_id"`
	Key          string         `json:"key" gorm:"type:char(32);index:idx_redemptions_key"`
	Status       int            `json:"status" gorm:"default:1"`
	Name         string         `json:"name" gorm:"index"`
	Quota        int            `json:"quota" gorm:"default:100"`
	CreatedTime  int64          `json:"created_time" gorm:"bigint"`
	RedeemedTime int64          `json:"redeemed_time" gorm:"bigint"`
	Count        int            `json:"count" gorm:"-:all"` // only for api request
	UsedUserId   int            `json:"used_user_id"`
	GrabedUserId int            `json:"grabed_user_id"`
	GrabedTime   int64          `json:"grabed_time" gorm:"bigint"`
	DeletedAt    gorm.DeletedAt `gorm:"index"`
	ExpiredTime  int64          `json:"expired_time" gorm:"bigint"` // 过期时间，0 表示不过期
}

func GetAllRedemptions(startIdx int, num int) (redemptions []*Redemption, total int64, err error) {
	// 开始事务
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 获取总数
	err = tx.Model(&Redemption{}).Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	// 获取分页数据
	err = tx.Order("id desc").Limit(num).Offset(startIdx).Find(&redemptions).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	// 提交事务
	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return redemptions, total, nil
}

func SearchRedemptions(keyword string, startIdx int, num int) (redemptions []*Redemption, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Build query based on keyword type
	query := tx.Model(&Redemption{})

	// Only try to convert to ID if the string represents a valid integer
	if id, err := strconv.Atoi(keyword); err == nil {
		query = query.Where("id = ? OR name LIKE ?", id, keyword+"%")
	} else {
		query = query.Where("name LIKE ?", keyword+"%")
	}

	// Get total count
	err = query.Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	// Get paginated data
	err = query.Order("id desc").Limit(num).Offset(startIdx).Find(&redemptions).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return redemptions, total, nil
}

func GetRedemptionById(id int) (*Redemption, error) {
	if id == 0 {
		return nil, errors.New("id 为空！")
	}
	redemption := Redemption{Id: id}
	var err error = nil
	err = DB.First(&redemption, "id = ?", id).Error
	return &redemption, err
}

func Redeem(key string, userId int) (quota int, err error) {
	if key == "" {
		return 0, errors.New("未提供兑换码")
	}
	if userId == 0 {
		return 0, errors.New("无效的 user id")
	}
	redemption := &Redemption{}

	keyCol := "`key`"
	if common.UsingPostgreSQL {
		keyCol = `"key"`
	}
	common.RandomSleep()
	err = DB.Transaction(func(tx *gorm.DB) error {
		err := tx.Set("gorm:query_option", "FOR UPDATE").Where(keyCol+" = ?", key).First(redemption).Error
		if err != nil {
			return errors.New("无效的兑换码")
		}
		if redemption.Status != common.RedemptionCodeStatusEnabled {
			return errors.New("该兑换码已被使用")
		}
		if redemption.ExpiredTime != 0 && redemption.ExpiredTime < common.GetTimestamp() {
			return errors.New("该兑换码已过期")
		}
		err = tx.Model(&User{}).Where("id = ?", userId).Update("quota", gorm.Expr("quota + ?", redemption.Quota)).Error
		if err != nil {
			return err
		}
		redemption.RedeemedTime = common.GetTimestamp()
		redemption.Status = common.RedemptionCodeStatusUsed
		redemption.UsedUserId = userId
		err = tx.Save(redemption).Error
		return err
	})
	if err != nil {
		common.SysError("redemption failed: " + err.Error())
		return 0, ErrRedeemFailed
	}
	RecordLog(userId, LogTypeTopup, fmt.Sprintf("通过兑换码充值 %s，兑换码ID %d", logger.LogQuota(redemption.Quota), redemption.Id))
	return redemption.Quota, nil
}

func (redemption *Redemption) Insert() error {
	var err error
	err = DB.Create(redemption).Error
	return err
}

func (redemption *Redemption) SelectUpdate() error {
	// This can update zero values
	return DB.Model(redemption).Select("redeemed_time", "status", "grabed_user_id", "grabed_time").Updates(redemption).Error
}

// Update Make sure your token's fields is completed, because this will update non-zero values
func (redemption *Redemption) Update() error {
	var err error
	err = DB.Model(redemption).Select("name", "status", "quota", "redeemed_time", "expired_time").Updates(redemption).Error
	return err
}

func (redemption *Redemption) Delete() error {
	var err error
	err = DB.Delete(redemption).Error
	return err
}

func DeleteRedemptionById(id int) (err error) {
	if id == 0 {
		return errors.New("id 为空！")
	}
	redemption := Redemption{Id: id}
	err = DB.Where(redemption).First(&redemption).Error
	if err != nil {
		return err
	}
	return redemption.Delete()
}

func DeleteInvalidRedemptions() (int64, error) {
	now := common.GetTimestamp()
	result := DB.Where("status IN ? OR (status = ? AND expired_time != 0 AND expired_time < ?)", []int{common.RedemptionCodeStatusUsed, common.RedemptionCodeStatusDisabled, common.RedemptionCodeStatusGrabbed}, common.RedemptionCodeStatusEnabled, now).Delete(&Redemption{})
	return result.RowsAffected, result.Error
}

// GetFlashSaleInfo returns the count and quota of available flash sale codes
func GetFlashSaleInfo() (count int64, quota int, err error) {
	err = DB.Model(&Redemption{}).
		Where("status = ?", common.RedemptionCodeStatusEnabled).
		Select("COUNT(*) as count, COALESCE(MAX(quota), 0) as quota").
		Row().Scan(&count, &quota)
	return
}

// GetFlashSaleStats returns admin statistics for redemption codes
func GetFlashSaleStats() (totalCount int64, totalQuota int64, usedCount int64, usedQuota int64, err error) {
	type stats struct {
		TotalCount int64
		TotalQuota int64
		UsedCount  int64
		UsedQuota  int64
	}
	s := stats{}
	err = DB.Model(&Redemption{}).
		Select("COUNT(*) as total_count, COALESCE(SUM(quota), 0) as total_quota, COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) as used_count, COALESCE(SUM(CASE WHEN status = ? THEN quota ELSE 0 END), 0) as used_quota", common.RedemptionCodeStatusUsed, common.RedemptionCodeStatusUsed).
		Row().Scan(&s.TotalCount, &s.TotalQuota, &s.UsedCount, &s.UsedQuota)
	return s.TotalCount, s.TotalQuota, s.UsedCount, s.UsedQuota, err
}

// GrabFlashSaleCode assigns an available code to a user. One per user.
func GrabFlashSaleCode(userId int) (*Redemption, error) {
	if userId == 0 {
		return nil, errors.New("无效的用户ID")
	}
	redemption := &Redemption{}
	err := DB.Transaction(func(tx *gorm.DB) error {
		// Check if user already grabbed one today
		todayStart := common.GetDayStartTimestamp()
		var existingCount int64
		if err := tx.Model(&Redemption{}).Where("grabed_user_id = ? AND grabed_time >= ?", userId, todayStart).Count(&existingCount).Error; err != nil {
			return err
		}
		if existingCount > 0 {
			return ErrFlashSaleAlreadyGrabed
		}
		// Find and lock an available code
		err := tx.Where("status = ?", common.RedemptionCodeStatusEnabled).
			Order("id ASC").
			Limit(1).
			Set("gorm:query_option", "FOR UPDATE").
			First(redemption).Error
		if err != nil {
			return ErrFlashSaleSoldOut
		}
		// Mark as grabbed
		redemption.Status = common.RedemptionCodeStatusGrabbed
		redemption.GrabedUserId = userId
		redemption.GrabedTime = common.GetTimestamp()
		return tx.Save(redemption).Error
	})
	if err != nil {
		return nil, err
	}
	RecordLog(userId, LogTypeTopup, fmt.Sprintf("抢到兑换券 %s，额度 %s", redemption.Name, logger.LogQuota(redemption.Quota)))
	return redemption, nil
}

// GetUserGrabedRedemptions returns user's grabbed but not yet activated codes
func GetUserGrabedRedemptions(userId int) ([]*Redemption, error) {
	var redemptions []*Redemption
	err := DB.Where("grabed_user_id = ? AND status = ?", userId, common.RedemptionCodeStatusGrabbed).
		Order("id DESC").
		Find(&redemptions).Error
	return redemptions, err
}

// ActivateGrabedRedemption activates a grabbed code and adds quota to user
func ActivateGrabedRedemption(id int, userId int) (int, error) {
	if userId == 0 {
		return 0, errors.New("无效的用户ID")
	}
	quota := 0
	err := DB.Transaction(func(tx *gorm.DB) error {
		redemption := &Redemption{}
		if err := tx.Where("id = ?", id).First(redemption).Error; err != nil {
			return ErrFlashSaleSoldOut
		}
		if redemption.Status != common.RedemptionCodeStatusGrabbed {
			return ErrFlashSaleInvalidStatus
		}
		if redemption.GrabedUserId != userId {
			return ErrFlashSaleNotYours
		}
		if redemption.ExpiredTime != 0 && redemption.ExpiredTime < common.GetTimestamp() {
			return ErrFlashSaleExpired
		}
		// Add quota to user
		if err := tx.Model(&User{}).Where("id = ?", userId).Update("quota", gorm.Expr("quota + ?", redemption.Quota)).Error; err != nil {
			return err
		}
		quota = redemption.Quota
		redemption.Status = common.RedemptionCodeStatusUsed
		redemption.RedeemedTime = common.GetTimestamp()
		redemption.UsedUserId = userId
		return tx.Save(redemption).Error
	})
	if err != nil {
		common.SysError("activate grabbed redemption failed: " + err.Error())
		return 0, err
	}
	RecordLog(userId, LogTypeTopup, fmt.Sprintf("激活兑换券 %d，额度 %s", id, logger.LogQuota(quota)))
	return quota, nil
}
