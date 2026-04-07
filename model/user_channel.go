package model

import (
	"fmt"
	"time"

	"github.com/QuantumNous/new-api/common"
)

// Review status constants for UserChannel
const (
	UserChannelReviewPending  = 0
	UserChannelReviewApproved = 1
	UserChannelReviewRejected = 2
	UserChannelReviewOffline  = 3
)

// UserChannel represents a personal channel created by a user
type UserChannel struct {
	Id            int     `json:"id"`
	UserId        int     `json:"user_id" gorm:"index;not null"`
	Type          int     `json:"type" gorm:"default:0"`
	Name          string  `json:"name" gorm:"index"`
	Key           string  `json:"key" gorm:"not null"`
	BaseURL       *string `json:"base_url" gorm:"column:base_url;default:''"`
	Models        string  `json:"models"`
	TestModel     *string `json:"test_model"`
	Group         string  `json:"group" gorm:"type:varchar(64);default:'default'"`
	Status        int     `json:"status" gorm:"default:1"`
	ReviewStatus  int     `json:"review_status" gorm:"default:0;index"`
	ReviewMessage *string `json:"review_message" gorm:"type:text"`
	ReviewTime    int64   `json:"review_time" gorm:"bigint"`
	ReviewerId    int     `json:"reviewer_id"`
	Remark        *string `json:"remark" gorm:"type:varchar(255)" validate:"max=255"`
	CreatedTime   int64   `json:"created_time" gorm:"bigint"`
	UpdatedTime   int64   `json:"updated_time" gorm:"bigint"`
	TestTime           int64   `json:"test_time" gorm:"bigint"`
	ResponseTime       int     `json:"response_time"`
	PromotedChannelId  int     `json:"promoted_channel_id" gorm:"default:0"`
	DeviceTokenId      int     `json:"device_token_id" gorm:"default:0"`
	DeviceName         string  `json:"device_name" gorm:"type:varchar(64);default:''"`
	DeviceDomain       string  `json:"device_domain" gorm:"type:varchar(128);default:''"`

	// Join fields (not stored in DB)
	Username    string `json:"username" gorm:"-"`
	DisplayName string `json:"display_name" gorm:"-"`
}

// InsertUserChannel creates a new user channel record
func InsertUserChannel(channel *UserChannel) error {
	channel.CreatedTime = time.Now().Unix()
	channel.UpdatedTime = channel.CreatedTime
	channel.ReviewStatus = UserChannelReviewPending
	return DB.Create(channel).Error
}

// GetUserChannelById returns a user channel by ID
func GetUserChannelById(id int) (*UserChannel, error) {
	var channel UserChannel
	err := DB.Where("id = ?", id).First(&channel).Error
	if err != nil {
		return nil, err
	}
	return &channel, nil
}

// GetUserChannelsByUserId returns paginated user channels for a specific user
func GetUserChannelsByUserId(userId int, startIdx int, num int) ([]*UserChannel, int64, error) {
	var channels []*UserChannel
	var total int64

	query := DB.Model(&UserChannel{}).Where("user_id = ?", userId)
	query.Count(&total)

	err := query.Order("id desc").Limit(num).Offset(startIdx).Omit("key").Find(&channels).Error
	return channels, total, err
}

// SearchUserChannels searches user's own channels by keyword
func SearchUserChannels(userId int, keyword string) ([]*UserChannel, error) {
	var channels []*UserChannel

	modelsCol := "`models`"
	if common.UsingPostgreSQL {
		modelsCol = `"models"`
	}

	query := DB.Model(&UserChannel{}).Where("user_id = ?", userId).Omit("key")
	if keyword != "" {
		query = query.Where(
			fmt.Sprintf("name LIKE ? OR %s LIKE ?", modelsCol),
			"%"+keyword+"%", "%"+keyword+"%",
		)
	}

	err := query.Order("id desc").Find(&channels).Error
	return channels, err
}

// GetAllUserChannels returns paginated user channels for admin review
func GetAllUserChannels(startIdx int, num int, reviewStatus *int, keyword string) ([]*UserChannel, int64, error) {
	var channels []*UserChannel
	var total int64

	modelsCol := "`models`"
	if common.UsingPostgreSQL {
		modelsCol = `"models"`
	}

	query := DB.Model(&UserChannel{})
	if reviewStatus != nil {
		query = query.Where("review_status = ?", *reviewStatus)
	}
	if keyword != "" {
		query = query.Where(
			fmt.Sprintf("name LIKE ? OR %s LIKE ?", modelsCol),
			"%"+keyword+"%", "%"+keyword+"%",
		)
	}

	query.Count(&total)
	err := query.Order("id desc").Limit(num).Offset(startIdx).Omit("key").Find(&channels).Error
	if err != nil {
		return nil, 0, err
	}

	// Fill in user info
	if len(channels) > 0 {
		userIds := make([]int, 0, len(channels))
		for _, ch := range channels {
			userIds = append(userIds, ch.UserId)
		}
		userMap := GetUserMapByIds(userIds)
		for _, ch := range channels {
			if u, ok := userMap[ch.UserId]; ok {
				ch.Username = u.Username
				ch.DisplayName = u.DisplayName
			}
		}
	}

	return channels, total, nil
}

// UpdateUserChannel updates user channel fields
func UpdateUserChannel(channel *UserChannel) error {
	channel.UpdatedTime = time.Now().Unix()
	// Use map to avoid zero-value issues with Select("*")
	updates := map[string]interface{}{
		"name":          channel.Name,
		"type":          channel.Type,
		"key":           channel.Key,
		"base_url":      channel.BaseURL,
		"models":        channel.Models,
		"test_model":    channel.TestModel,
		"group":         channel.Group,
		"remark":        channel.Remark,
		"review_status":       channel.ReviewStatus,
		"promoted_channel_id": channel.PromotedChannelId,
		"device_token_id":     channel.DeviceTokenId,
		"device_name":         channel.DeviceName,
		"device_domain":       channel.DeviceDomain,
		"updated_time":        channel.UpdatedTime,
	}
	return DB.Model(&UserChannel{}).Where("id = ? AND user_id = ?", channel.Id, channel.UserId).Updates(updates).Error
}

// DeleteUserChannel deletes a user channel by ID and user ID
func DeleteUserChannel(id int, userId int) error {
	result := DB.Where("id = ? AND user_id = ?", id, userId).Delete(&UserChannel{})
	if result.RowsAffected == 0 {
		return fmt.Errorf("channel not found or not owned by user")
	}
	return result.Error
}

// DeleteUserChannelByAdmin deletes a user channel by ID (admin)
func DeleteUserChannelByAdmin(id int) error {
	return DB.Where("id = ?", id).Delete(&UserChannel{}).Error
}

// UpdateUserChannelStatus updates user channel status (enable/disable)
func UpdateUserChannelStatus(id int, userId int, status int) error {
	result := DB.Model(&UserChannel{}).Where("id = ? AND user_id = ?", id, userId).
		Update("status", status)
	if result.RowsAffected == 0 {
		return fmt.Errorf("channel not found or not owned by user")
	}
	return result.Error
}

// UpdateUserChannelReviewStatus updates review status (admin)
func UpdateUserChannelReviewStatus(id int, reviewStatus int, reviewMessage string, reviewerId int) error {
	updates := map[string]interface{}{
		"review_status":  reviewStatus,
		"review_message": reviewMessage,
		"review_time":    time.Now().Unix(),
		"reviewer_id":    reviewerId,
		"updated_time":   time.Now().Unix(),
	}
	result := DB.Model(&UserChannel{}).Where("id = ?", id).Updates(updates)
	if result.RowsAffected == 0 {
		return fmt.Errorf("channel not found")
	}
	return result.Error
}

// UpdateUserChannelPromotedChannelId updates the promoted channel ID
func UpdateUserChannelPromotedChannelId(id int, promotedChannelId int) error {
	return DB.Model(&UserChannel{}).Where("id = ?", id).Update("promoted_channel_id", promotedChannelId).Error
}

// UpdateUserChannelTestResult updates test time and response time
func UpdateUserChannelTestResult(id int, testTime int64, responseTime int) error {
	return DB.Model(&UserChannel{}).Where("id = ?", id).Updates(map[string]interface{}{
		"test_time":     testTime,
		"response_time": responseTime,
	}).Error
}

// GetUserMapByIds returns a map of userId -> User for the given IDs
func GetUserMapByIds(userIds []int) map[int]*User {
	var users []*User
	DB.Where("id IN ?", userIds).Select("id, username, display_name").Find(&users)
	userMap := make(map[int]*User, len(users))
	for _, u := range users {
		userMap[u.Id] = u
	}
	return userMap
}
