package model

import (
	"time"
)

// 提现明细状态常量
const (
	WithdrawalDetailNotWithdrawn = 0 // 未提现
	WithdrawalDetailWithdrawn    = 1 // 已提现
)

// 提现记录状态常量
const (
	WithdrawalStatusNew       = 0 // 新建
	WithdrawalStatusPending   = 1 // 提现中
	WithdrawalStatusSuccess   = 2 // 成功
	WithdrawalStatusFailed    = 3 // 失败
)

// 提现渠道常量
const (
	WithdrawalChannelWechat  = "wechat"  // 微信
	WithdrawalChannelAlipay  = "alipay"  // 支付宝
)

// WithdrawalDetail 提现明细表 - 记录个人渠道产生的费用
type WithdrawalDetail struct {
	Id                 int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId             int    `json:"user_id" gorm:"index;not null"`                    // 模型提供者ID（个人渠道所属用户）
	ChannelId          int    `json:"channel_id" gorm:"index"`                         // 系统渠道ID
	UserChannelId      int    `json:"user_channel_id" gorm:"index"`                    // 个人渠道ID
	ModelName          string `json:"model_name" gorm:"type:varchar(64)"`              // 模型名称
	GroupName          string `json:"group_name" gorm:"type:varchar(64)"`              // 用户分组
	Quota              int64  `json:"quota" gorm:"bigint;default:0"`                   // 本次请求产生的费用
	CreatedAt          int64  `json:"created_at" gorm:"bigint"`                        // 创建时间
	IsValid            int    `json:"is_valid" gorm:"default:1"`                       // 是否有效（渠道下线时置0）
	IsWithdrawn        int    `json:"is_withdrawn" gorm:"default:0;index"`             // 是否已提现
	WithdrawalRecordId int    `json:"withdrawal_record_id" gorm:"default:0;index"`     // 关联的提现记录ID
	WithdrawnAt        int64  `json:"withdrawn_at" gorm:"bigint;default:0"`            // 提现时间
}

// WithdrawalRecord 提现记录表 - 记录用户的提现申请
type WithdrawalRecord struct {
	Id              int     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId          int     `json:"user_id" gorm:"index;not null"`                   // 用户ID
	Amount          int64   `json:"amount" gorm:"bigint;not null"`                   // 提现金额
	Tax             int64   `json:"tax" gorm:"bigint;default:0"`                     // 税费（默认0）
	TaxRate         float64 `json:"tax_rate" gorm:"type:decimal(5,2);default:0"`     // 税率（默认0）
	ActualAmount    int64   `json:"actual_amount" gorm:"bigint;not null"`            // 实际提现金额（amount-tax）
	Channel         string  `json:"channel" gorm:"type:varchar(20)"`                 // 提现渠道（wechat/alipay）
	Status          int     `json:"status" gorm:"default:0;index"`                   // 状态：新建/提现中/成功/失败
	PaymentOrderId  string  `json:"payment_order_id" gorm:"type:varchar(64);index"`  // 提现支付订单ID
	CreatedAt       int64   `json:"created_at" gorm:"bigint"`                        // 创建时间
	UpdatedAt       int64   `json:"updated_at" gorm:"bigint"`                        // 更新时间
	CompletedAt     int64   `json:"completed_at" gorm:"bigint;default:0"`            // 完成时间
	Remark          string  `json:"remark" gorm:"type:varchar(255)"`                 // 备注
	// Join fields
	Username        string  `json:"username" gorm:"-"`
}

// WithdrawalPaymentRecord 提现支付记录表 - 记录支付流程
type WithdrawalPaymentRecord struct {
	Id               int    `json:"id" gorm:"primaryKey;autoIncrement"`
	WithdrawalRecordId int  `json:"withdrawal_record_id" gorm:"index;not null"`      // 提现记录ID
	TradeId          string `json:"trade_id" gorm:"type:varchar(64);index"`          // 交易ID
	Status           int    `json:"status" gorm:"default:0"`                         // 状态
	OrderId          string `json:"order_id" gorm:"type:varchar(64)"`                // 订单ID
	CreatedAt        int64  `json:"created_at" gorm:"bigint"`                       // 创建时间
	UpdatedAt        int64  `json:"updated_at" gorm:"bigint"`                       // 更新时间
 Message          string `json:"message" gorm:"type:text"`                       // 支付消息
}

// TableName 方法
func (WithdrawalDetail) TableName() string {
	return "withdrawal_details"
}

func (WithdrawalRecord) TableName() string {
	return "withdrawal_records"
}

func (WithdrawalPaymentRecord) TableName() string {
	return "withdrawal_payment_records"
}

// CreateWithdrawalDetail 创建提现明细
func CreateWithdrawalDetail(detail *WithdrawalDetail) error {
	detail.CreatedAt = time.Now().Unix()
	return DB.Create(detail).Error
}

// GetWithdrawalDetailsByUserId 获取用户的提现明细列表
func GetWithdrawalDetailsByUserId(userId int, isWithdrawn int, limit int, offset int) ([]WithdrawalDetail, int64, error) {
	var details []WithdrawalDetail
	var total int64
 query := DB.Where("user_id = ?", userId)
	if isWithdrawn >= 0 {
	 query = query.Where("is_withdrawn = ?", isWithdrawn)
	}
	query = query.Where("is_valid = ?", 1)
	err := query.Order("created_at desc").Limit(limit).Offset(offset).Find(&details).Error
	if err != nil {
		return nil, 0, err
	}
	query.Count(&total)
	return details, total, nil
}

// GetWithdrawableDetailsByUserId 获取用户可提现的明细（未提现且有效）
func GetWithdrawableDetailsByUserId(userId int) ([]WithdrawalDetail, int64, error) {
	var details []WithdrawalDetail
	var totalQuota int64
	err := DB.Where("user_id = ? AND is_withdrawn = ? AND is_valid = ?", userId, WithdrawalDetailNotWithdrawn, 1).
		Order("created_at asc").Find(&details).Error
	if err != nil {
		return nil, 0, err
	}
	for _, d := range details {
		totalQuota += d.Quota
	}
	return details, totalQuota, nil
}

// MarkDetailsAsWithdrawn 将明细标记为已提现
func MarkDetailsAsWithdrawn(detailIds []int, recordId int64) error {
	now := time.Now().Unix()
	return DB.Model(&WithdrawalDetail{}).
		Where("id IN ?", detailIds).
		Updates(map[string]interface{}{
			"is_withdrawn":       WithdrawalDetailWithdrawn,
			"withdrawal_record_id": recordId,
			"withdrawn_at":       now,
		}).Error
}

// InvalidateDetailsByUserChannelId 将个人渠道下线时标记明细为无效
func InvalidateDetailsByUserChannelId(userChannelId int) error {
	return DB.Model(&WithdrawalDetail{}).
		Where("user_channel_id = ?", userChannelId).
		Update("is_valid", 0).Error
}

// CreateWithdrawalRecord 创建提现记录
func CreateWithdrawalRecord(record *WithdrawalRecord) error {
	record.CreatedAt = time.Now().Unix()
	record.UpdatedAt = time.Now().Unix()
	return DB.Create(record).Error
}

// GetWithdrawalRecordsByUserId 获取用户的提现记录列表
func GetWithdrawalRecordsByUserId(userId int, status int, limit int, offset int) ([]WithdrawalRecord, int64, error) {
	var records []WithdrawalRecord
	var total int64
	query := DB.Where("user_id = ?", userId)
	if status >= 0 {
		query = query.Where("status = ?", status)
	}
 err := query.Order("created_at desc").Limit(limit).Offset(offset).Find(&records).Error
	if err != nil {
		return nil, 0, err
	}
 query.Count(&total)
	return records, total, nil
}

// GetWithdrawalRecordById 获取提现记录
func GetWithdrawalRecordById(id int) (*WithdrawalRecord, error) {
	var record WithdrawalRecord
	err := DB.First(&record, id).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// UpdateWithdrawalRecordStatus 更新提现记录状态
func UpdateWithdrawalRecordStatus(id int, status int, remark string) error {
	now := time.Now().Unix()
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": now,
	}
	if remark != "" {
		updates["remark"] = remark
	}
	if status == WithdrawalStatusSuccess || status == WithdrawalStatusFailed {
		updates["completed_at"] = now
	}
	return DB.Model(&WithdrawalRecord{}).Where("id = ?", id).Updates(updates).Error
}

// CreateWithdrawalPaymentRecord 创建提现支付记录
func CreateWithdrawalPaymentRecord(paymentRecord *WithdrawalPaymentRecord) error {
	paymentRecord.CreatedAt = time.Now().Unix()
	paymentRecord.UpdatedAt = time.Now().Unix()
	return DB.Create(paymentRecord).Error
}

// GetWithdrawalPaymentRecordsByRecordId 获取提现支付记录
func GetWithdrawalPaymentRecordsByRecordId(recordId int) ([]WithdrawalPaymentRecord, error) {
	var records []WithdrawalPaymentRecord
	err := DB.Where("withdrawal_record_id = ?", recordId).Order("created_at desc").Find(&records).Error
	return records, err
}

// GetUserWithdrawalStats 获取用户提现统计
func GetUserWithdrawalStats(userId int) (withdrawable int64, withdrawn int64, pending int64, err error) {
	// 可提现额度 = 未提现且有效的明细总额
	var details []WithdrawalDetail
	err = DB.Where("user_id = ? AND is_withdrawn = ? AND is_valid = ?", userId, WithdrawalDetailNotWithdrawn, 1).Find(&details).Error
	if err != nil {
		return 0, 0, 0, err
	}
	for _, d := range details {
	 withdrawable += d.Quota
	}

	// 已提现额度 = 成功状态的记录总额
	var records []WithdrawalRecord
	err = DB.Where("user_id = ? AND status = ?", userId, WithdrawalStatusSuccess).Find(&records).Error
	if err != nil {
		return 0, 0, 0, err
	}
	for _, r := range records {
		withdrawn += r.ActualAmount
	}

	// 提现中额度 = 提现中状态的记录总额
	err = DB.Where("user_id = ? AND status = ?", userId, WithdrawalStatusPending).Find(&records).Error
	if err != nil {
		return 0, 0, 0, err
	}
	for _, r := range records {
		pending += r.Amount
	}

	return withdrawable, withdrawn, pending, nil
}