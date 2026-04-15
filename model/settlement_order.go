package model

import (
	"fmt"
	"time"

	"github.com/QuantumNous/new-api/setting"
)

// Settlement order status constants
const (
	SettlementStatusNew        = 0 // 新建
	SettlementStatusReviewing  = 1 // 审核中
	SettlementStatusSettling   = 2 // 结算中
	SettlementStatusCompleted  = 3 // 结算完成
	SettlementStatusRejected   = 4 // 驳回
)

// SettlementOrder represents a node-contribution settlement order
type SettlementOrder struct {
	Id              int     `json:"id" gorm:"primaryKey;autoIncrement"`
	OrderNo         string  `json:"order_no" gorm:"type:varchar(64);uniqueIndex;not null"`
	UserId          int     `json:"user_id" gorm:"index;not null"`
	Username        string  `json:"username" gorm:"type:varchar(64);not null"`
	TotalTokens     int64   `json:"total_tokens" gorm:"default:0"`
	TotalPoints     float64 `json:"total_points" gorm:"default:0"` // SOL
	Status          int     `json:"status" gorm:"default:0;index"`
	Detail          string  `json:"detail" gorm:"type:text"` // JSON: [{model_name, prompt_tokens, completion_tokens, total_tokens, points}]
	SettledLogMaxId int     `json:"settled_log_max_id" gorm:"default:0"`
	ReviewerId      int     `json:"reviewer_id" gorm:"default:0"`
	ReviewerName    string  `json:"reviewer_name" gorm:"type:varchar(64);default:''"`
	ReviewMessage   string  `json:"review_message" gorm:"type:text"`
	ReviewTime      int64   `json:"review_time" gorm:"bigint;default:0"`
	SettledTime     int64   `json:"settled_time" gorm:"bigint;default:0"`
	CreatedTime     int64   `json:"created_time" gorm:"bigint"`
	UpdatedTime     int64   `json:"updated_time" gorm:"bigint"`
}

func (SettlementOrder) TableName() string {
	return "settlement_orders"
}

// TokenStat holds per-model token aggregation
type TokenStat struct {
	ModelName        string `json:"model_name"`
	PromptTokens     int64  `json:"prompt_tokens"`
	CompletionTokens int64  `json:"completion_tokens"`
	TotalTokens      int64  `json:"total_tokens"`
	Points           float64 `json:"points"` // calculated: total_tokens / rate
}

// GenerateOrderNo creates a unique order number
func GenerateOrderNo() string {
	return fmt.Sprintf("ST%s%04d", time.Now().Format("20060102150405"), time.Now().Nanosecond()/100000)
}

// GetMaxSettledLogId returns the max settled_log_max_id for a user to prevent duplicate settlement
func GetMaxSettledLogId(userId int) (int, error) {
	var maxId *int
	err := DB.Model(&SettlementOrder{}).
		Where("user_id = ? AND status IN ?", userId, []int{
			SettlementStatusReviewing,
			SettlementStatusSettling,
			SettlementStatusCompleted,
		}).
		Select("MAX(settled_log_max_id)").
		Scan(&maxId).Error
	if err != nil {
		return 0, err
	}
	if maxId == nil {
		return 0, nil
	}
	return *maxId, nil
}

// GetUnsettledTokenStats aggregates unsettled tokens for a user's contributed channels.
// Data chain: UserChannel(user_id) → Channel(user_channel_id) → Log(channel_id)
// Logs are queried from LOG_DB; channels/user_channels from DB.
func GetUnsettledTokenStats(userId int, afterLogId int) ([]TokenStat, int, error) {
	// Step 1: Find all promoted channel IDs for this user (from DB)
	var channelIds []int
	err := DB.Model(&Channel{}).
		Joins("JOIN user_channels ON user_channels.promoted_channel_id = channels.id").
		Where("user_channels.user_id = ? AND user_channels.review_status = ? AND channels.user_channel_id > 0",
			userId, UserChannelReviewApproved).
		Pluck("channels.id", &channelIds).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to find promoted channels: %w", err)
	}

	if len(channelIds) == 0 {
		return []TokenStat{}, 0, nil
	}

	// Step 2: Get max log id from LOG_DB for the boundary
	var maxLogId int
	err = LOG_DB.Model(&Log{}).
		Where("channel_id IN ? AND id > ?", channelIds, afterLogId).
		Select("COALESCE(MAX(id), 0)").
		Scan(&maxLogId).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get max log id: %w", err)
	}

	if maxLogId == 0 {
		return []TokenStat{}, 0, nil
	}

	// Step 3: Aggregate tokens by model_name from LOG_DB
	type dbResult struct {
		ModelName        string `gorm:"column:model_name"`
		PromptTokens     int64  `gorm:"column:prompt_tokens"`
		CompletionTokens int64  `gorm:"column:completion_tokens"`
		TotalTokens      int64  `gorm:"column:total_tokens"`
	}
	var results []dbResult
	err = LOG_DB.Model(&Log{}).
		Where("channel_id IN ? AND id > ? AND id <= ? AND type = ?",
			channelIds, afterLogId, maxLogId, LogTypeConsume).
		Select("model_name, SUM(prompt_tokens) as prompt_tokens, SUM(completion_tokens) as completion_tokens, SUM(prompt_tokens + completion_tokens) as total_tokens").
		Group("model_name").
		Having("SUM(prompt_tokens + completion_tokens) > 0").
		Find(&results).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to aggregate tokens: %w", err)
	}

	rate := setting.SettlementTokenRate
	if rate <= 0 {
		rate = 100000
	}

	stats := make([]TokenStat, 0, len(results))
	for _, r := range results {
		stats = append(stats, TokenStat{
			ModelName:        r.ModelName,
			PromptTokens:     r.PromptTokens,
			CompletionTokens: r.CompletionTokens,
			TotalTokens:      r.TotalTokens,
			Points:           float64(r.TotalTokens) / rate,
		})
	}

	return stats, maxLogId, nil
}

// CreateSettlementOrder inserts a new settlement order
func CreateSettlementOrder(order *SettlementOrder) error {
	order.CreatedTime = time.Now().Unix()
	order.UpdatedTime = order.CreatedTime
	return DB.Create(order).Error
}

// GetSettlementOrderById fetches a settlement order by ID
func GetSettlementOrderById(id int) (*SettlementOrder, error) {
	var order SettlementOrder
	err := DB.Where("id = ?", id).First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// GetSettlementOrdersByUserId returns paginated orders for a user
func GetSettlementOrdersByUserId(userId int, startIdx int, num int) ([]*SettlementOrder, int64, error) {
	var orders []*SettlementOrder
	var total int64

	query := DB.Model(&SettlementOrder{}).Where("user_id = ?", userId)
	query.Count(&total)
	err := query.Order("id desc").Limit(num).Offset(startIdx).Find(&orders).Error
	return orders, total, err
}

// GetAllSettlementOrders returns paginated orders for admin, optionally filtered by status
func GetAllSettlementOrders(startIdx int, num int, status *int) ([]*SettlementOrder, int64, error) {
	var orders []*SettlementOrder
	var total int64

	query := DB.Model(&SettlementOrder{})
	if status != nil {
		query = query.Where("status = ?", *status)
	}
	query.Count(&total)
	err := query.Order("id desc").Limit(num).Offset(startIdx).Find(&orders).Error
	return orders, total, err
}

// UpdateSettlementOrderStatus updates the status (and related fields) of a settlement order
func UpdateSettlementOrderStatus(id int, updates map[string]interface{}) error {
	updates["updated_time"] = time.Now().Unix()
	return DB.Model(&SettlementOrder{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteSettlementOrder deletes a settlement order (only if status = new)
func DeleteSettlementOrder(id int, userId int) error {
	result := DB.Where("id = ? AND user_id = ? AND status = ?", id, userId, SettlementStatusNew).
		Delete(&SettlementOrder{})
	if result.RowsAffected == 0 {
		return fmt.Errorf("order not found or cannot be deleted")
	}
	return result.Error
}

// GetUserSettlementSummary returns total settled points for a user
func GetUserSettlementSummary(userId int) (float64, error) {
	var totalPoints *float64
	err := DB.Model(&SettlementOrder{}).
		Where("user_id = ? AND status = ?", userId, SettlementStatusCompleted).
		Select("COALESCE(SUM(total_points), 0)").
		Scan(&totalPoints).Error
	if err != nil {
		return 0, err
	}
	if totalPoints == nil {
		return 0, nil
	}
	return *totalPoints, nil
}

// HasPendingSettlement checks if user has any pending/reviewing/settling orders
func HasPendingSettlement(userId int) (bool, error) {
	var count int64
	err := DB.Model(&SettlementOrder{}).
		Where("user_id = ? AND status IN ?", userId, []int{
			SettlementStatusNew,
			SettlementStatusReviewing,
			SettlementStatusSettling,
		}).
		Count(&count).Error
	return count > 0, err
}
