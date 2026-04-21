package model

import (
	"time"
)

type TreasuryLog struct {
	Id          int     `json:"id" gorm:"primaryKey;autoIncrement"`
	OperatorId  int     `json:"operator_id" gorm:"index"`
	Operator    string  `json:"operator" gorm:"type:varchar(100)"`
	Action      string  `json:"action" gorm:"type:varchar(50);index"`
	TargetUser  string  `json:"target_user" gorm:"type:varchar(100)"`
	TargetUserId int    `json:"target_user_id" gorm:"index"`
	FromAddress string  `json:"from_address" gorm:"type:varchar(100)"`
	ToAddress   string  `json:"to_address" gorm:"type:varchar(100)"`
	Amount      float64 `json:"amount"`
	Status      string  `json:"status" gorm:"type:varchar(20);index"`
	Remark      string  `json:"remark" gorm:"type:varchar(500)"`
	CreatedAt   int64   `json:"created_at" gorm:"autoCreateTime;index"`
}

func (TreasuryLog) TableName() string {
	return "treasury_logs"
}

func (log *TreasuryLog) Insert() error {
	if log.CreatedAt == 0 {
		log.CreatedAt = time.Now().Unix()
	}
	return DB.Create(log).Error
}

// GetTreasuryLogs returns logs within the given time range, ordered by newest first.
func GetTreasuryLogs(days int, limit int) ([]TreasuryLog, error) {
	var logs []TreasuryLog
	since := time.Now().AddDate(0, 0, -days).Unix()
	err := DB.Where("created_at >= ?", since).
		Order("id desc").
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

// GetTreasuryLogsByAddress returns logs for a specific address within the given time range.
func GetTreasuryLogsByAddress(address string, days int, limit int) ([]TreasuryLog, error) {
	var logs []TreasuryLog
	since := time.Now().AddDate(0, 0, -days).Unix()
	err := DB.Where("(from_address = ? OR to_address = ?) AND created_at >= ?", address, address, since).
		Order("id desc").
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

// GetTreasuryLogsByUserId returns logs for a specific target user within the given time range.
func GetTreasuryLogsByUserId(userId int, days int, limit int) ([]TreasuryLog, error) {
	var logs []TreasuryLog
	since := time.Now().AddDate(0, 0, -days).Unix()
	err := DB.Where("target_user_id = ? AND created_at >= ?", userId, since).
		Order("id desc").
		Limit(limit).
		Find(&logs).Error
	return logs, err
}
