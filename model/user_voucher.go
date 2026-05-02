package model

import (
	"fmt"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"gorm.io/gorm"
)

type UserVoucher struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId      int    `json:"user_id" gorm:"index"`
	Name        string `json:"name"`
	Quota       int    `json:"quota"`
	Source      string `json:"source"` // "welcome" | "invitee" | "inviter"
	Claimed     bool   `json:"claimed" gorm:"default:false"`
	ClaimedTime int64  `json:"claimed_time,omitempty"`
	CreatedTime int64  `json:"created_time"`
	ExpireTime  int64  `json:"expire_time,omitempty"`
}

func CreateVoucher(userId int, name string, quota int, source string) error {
	now := time.Now().Unix()
	v := &UserVoucher{
		UserId:      userId,
		Name:        name,
		Quota:       quota,
		Source:      source,
		Claimed:     false,
		CreatedTime: now,
	}
	return DB.Create(v).Error
}

func GetUserVouchers(userId int) ([]UserVoucher, error) {
	var vouchers []UserVoucher
	err := DB.Where("user_id = ?", userId).Order("id desc").Find(&vouchers).Error
	return vouchers, err
}

func GetUnclaimedVouchers(userId int) ([]UserVoucher, error) {
	var vouchers []UserVoucher
	err := DB.Where("user_id = ? AND claimed = ?", userId, false).Order("id desc").Find(&vouchers).Error
	return vouchers, err
}

func GetVoucherById(id int) (*UserVoucher, error) {
	var v UserVoucher
	err := DB.Where("id = ?", id).First(&v).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}

// ClaimVoucher adds quota to user balance and marks the voucher as claimed.
// Uses a DB transaction to ensure atomicity.
func ClaimVoucher(id int, userId int) (*UserVoucher, error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	defer tx.Rollback()

	var v UserVoucher
	err := tx.Where("id = ? AND user_id = ? AND claimed = ?", id, userId, false).First(&v).Error
	if err != nil {
		return nil, err
	}

	now := time.Now().Unix()

	// 1. Add quota to user balance
	err = tx.Model(&User{}).Where("id = ?", userId).Update("quota", gorm.Expr("quota + ?", v.Quota)).Error
	if err != nil {
		return nil, fmt.Errorf("增加额度失败: %w", err)
	}

	// 2. Mark voucher as claimed
	err = tx.Model(&v).Updates(map[string]interface{}{
		"claimed":      true,
		"claimed_time": now,
	}).Error
	if err != nil {
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// 3. Update Redis cache async
	go func() {
		if err := cacheIncrUserQuota(userId, int64(v.Quota)); err != nil {
			common.SysLog("failed to increase user quota cache: " + err.Error())
		}
	}()

	v.Claimed = true
	v.ClaimedTime = now

	// 4. Record in billing log (LogTypeTopup so it shows in payment history)
	RecordLog(userId, LogTypeTopup, fmt.Sprintf("签收额度券「%s」+%s", v.Name, logger.LogQuota(v.Quota)))

	return &v, nil
}
