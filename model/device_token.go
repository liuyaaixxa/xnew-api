package model

import (
	"errors"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// DeviceToken represents a device token for octelium authentication
type DeviceToken struct {
	Id          uint   `gorm:"primaryKey" json:"id"`
	UserId      int    `gorm:"index" json:"user_id"`
	Name        string `gorm:"size:64" json:"name"`           // Device name
	Token       string `gorm:"size:512" json:"-"`             // octelium auth-token (sensitive)
	TokenMask   string `gorm:"size:32" json:"token_mask"`     // Masked token for display
	Domain      string `gorm:"size:128" json:"domain"`        // octelium domain
	Status      int    `gorm:"default:1" json:"status"`       // 1:active, 2:disabled
	CreatedTime int64  `gorm:"autoCreateTime" json:"created_time"`
	UpdatedTime int64  `gorm:"autoUpdateTime" json:"updated_time"`
}

// Device token status constants
const (
	DeviceTokenStatusActive   = 1
	DeviceTokenStatusDisabled = 2
)

// MaskDeviceToken masks the token for safe display
func MaskDeviceToken(token string) string {
	if token == "" {
		return ""
	}
	if len(token) <= 8 {
		return strings.Repeat("*", len(token))
	}
	return token[:4] + "****" + token[len(token)-4:]
}

// GetMaskedToken returns the masked version of the token
func (dt *DeviceToken) GetMaskedToken() string {
	return MaskDeviceToken(dt.Token)
}

// Insert creates a new device token record
func (dt *DeviceToken) Insert() error {
	return DB.Create(dt).Error
}

// Update updates the device token
func (dt *DeviceToken) Update() error {
	return DB.Model(dt).Select("name", "status", "domain").Updates(dt).Error
}

// Delete deletes the device token
func (dt *DeviceToken) Delete() error {
	return DB.Delete(dt).Error
}

// GetDeviceTokenById gets a device token by ID
func GetDeviceTokenById(id uint) (*DeviceToken, error) {
	if id == 0 {
		return nil, errors.New("id is empty")
	}
	var deviceToken DeviceToken
	err := DB.First(&deviceToken, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &deviceToken, nil
}

// GetDeviceTokenByIdAndUserId gets a device token by ID and user ID
func GetDeviceTokenByIdAndUserId(id uint, userId int) (*DeviceToken, error) {
	if id == 0 || userId == 0 {
		return nil, errors.New("id or userId is empty")
	}
	var deviceToken DeviceToken
	err := DB.First(&deviceToken, "id = ? AND user_id = ?", id, userId).Error
	if err != nil {
		return nil, err
	}
	return &deviceToken, nil
}

// GetAllUserDeviceTokens gets all device tokens for a user with pagination
func GetAllUserDeviceTokens(userId int, startIdx int, num int) ([]*DeviceToken, error) {
	var deviceTokens []*DeviceToken
	err := DB.Where("user_id = ?", userId).Order("id desc").Limit(num).Offset(startIdx).Find(&deviceTokens).Error
	return deviceTokens, err
}

// CountUserDeviceTokens counts total device tokens for a user
func CountUserDeviceTokens(userId int) (int64, error) {
	var total int64
	err := DB.Model(&DeviceToken{}).Where("user_id = ?", userId).Count(&total).Error
	return total, err
}

// DeleteDeviceTokenById deletes a device token by ID and user ID
func DeleteDeviceTokenById(id uint, userId int) error {
	if id == 0 || userId == 0 {
		return errors.New("id or userId is empty")
	}
	deviceToken := DeviceToken{Id: id}
	err := DB.Where(&DeviceToken{UserId: userId}).First(&deviceToken).Error
	if err != nil {
		return err
	}
	return deviceToken.Delete()
}

// buildMaskedDeviceTokenResponse creates a masked copy for API response
func buildMaskedDeviceTokenResponse(dt *DeviceToken) *DeviceToken {
	if dt == nil {
		return nil
	}
	return &DeviceToken{
		Id:          dt.Id,
		UserId:      dt.UserId,
		Name:        dt.Name,
		TokenMask:   dt.GetMaskedToken(),
		Domain:      dt.Domain,
		Status:      dt.Status,
		CreatedTime: dt.CreatedTime,
		UpdatedTime: dt.UpdatedTime,
	}
}

// BuildMaskedDeviceTokenResponses creates masked copies for API response
func BuildMaskedDeviceTokenResponses(deviceTokens []*DeviceToken) []*DeviceToken {
	result := make([]*DeviceToken, 0, len(deviceTokens))
	for _, dt := range deviceTokens {
		result = append(result, buildMaskedDeviceTokenResponse(dt))
	}
	return result
}

// ValidateDeviceTokenName validates the device token name
func ValidateDeviceTokenName(name string) error {
	if strings.TrimSpace(name) == "" {
		return errors.New("device name cannot be empty")
	}
	if len(name) > 64 {
		return errors.New("device name is too long")
	}
	return nil
}

// IsDeviceTokenExists checks if a device token with the same name exists for the user
func IsDeviceTokenExists(userId int, name string) (bool, error) {
	var count int64
	err := DB.Model(&DeviceToken{}).Where("user_id = ? AND name = ?", userId, name).Count(&count).Error
	return count > 0, err
}

// GetMaxUserDeviceTokens returns the maximum number of device tokens per user
func GetMaxUserDeviceTokens() int {
	return common.GetEnvOrDefault("MAX_USER_DEVICE_TOKENS", 100)
}

// CountAllDeviceTokens counts all device tokens (for admin)
func CountAllDeviceTokens() (int64, error) {
	var total int64
	err := DB.Model(&DeviceToken{}).Count(&total).Error
	return total, err
}

// GetAllDeviceTokens gets all device tokens (for admin) with pagination
func GetAllDeviceTokens(startIdx int, num int) ([]*DeviceToken, error) {
	var deviceTokens []*DeviceToken
	err := DB.Order("id desc").Limit(num).Offset(startIdx).Find(&deviceTokens).Error
	return deviceTokens, err
}

// BatchDeleteDeviceTokens deletes multiple device tokens for a user
func BatchDeleteDeviceTokens(ids []uint, userId int) (int, error) {
	if len(ids) == 0 {
		return 0, errors.New("ids cannot be empty")
	}

	result := DB.Where("user_id = ? AND id IN (?)", userId, ids).Delete(&DeviceToken{})
	if result.Error != nil {
		return 0, result.Error
	}

	return int(result.RowsAffected), nil
}

// UpdateDeviceTokenStatus updates only the status of a device token
func UpdateDeviceTokenStatus(id uint, userId int, status int) error {
	return DB.Model(&DeviceToken{}).
		Where("id = ? AND user_id = ?", id, userId).
		Update("status", status).Error
}

// GetDeviceTokensByDomain gets all device tokens for a specific domain
func GetDeviceTokensByDomain(domain string) ([]*DeviceToken, error) {
	var deviceTokens []*DeviceToken
	err := DB.Where("domain = ?", domain).Find(&deviceTokens).Error
	return deviceTokens, err
}

// GetDeviceTokenByToken gets a device token by the actual token value
func GetDeviceTokenByToken(token string) (*DeviceToken, error) {
	if token == "" {
		return nil, errors.New("token is empty")
	}
	var deviceToken DeviceToken
	err := DB.Where("token = ?", token).First(&deviceToken).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid device token")
		}
		return nil, err
	}
	return &deviceToken, nil
}
