package service

import (
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

// PromoteUserChannel creates a real Channel + Ability records from a UserChannel.
// Returns the promoted channel ID on success.
func PromoteUserChannel(uc *model.UserChannel) (int, error) {
	tag := "personal"
	channel := model.Channel{
		Type:          uc.Type,
		Key:           uc.Key,
		Name:          fmt.Sprintf("[个人] %s", uc.Name),
		BaseURL:       uc.BaseURL,
		Models:        uc.Models,
		TestModel:     uc.TestModel,
		Group:         uc.Group,
		Status:        common.ChannelStatusEnabled,
		Tag:           &tag,
		UserChannelId: uc.Id,
		CreatedTime:   common.GetTimestamp(),
	}

	tx := model.DB.Begin()
	if tx.Error != nil {
		return 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Create(&channel).Error; err != nil {
		tx.Rollback()
		return 0, fmt.Errorf("failed to create promoted channel: %w", err)
	}

	if err := channel.AddAbilities(tx); err != nil {
		tx.Rollback()
		return 0, fmt.Errorf("failed to add abilities for promoted channel: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		return 0, fmt.Errorf("failed to commit promotion transaction: %w", err)
	}

	// Update UserChannel with the promoted channel ID
	if err := model.UpdateUserChannelPromotedChannelId(uc.Id, channel.Id); err != nil {
		common.SysLog(fmt.Sprintf("failed to update promoted_channel_id for user_channel %d: %v", uc.Id, err))
	}

	// Refresh channel cache so the new channel is immediately routable
	model.InitChannelCache()

	common.SysLog(fmt.Sprintf("promoted user_channel %d to channel %d", uc.Id, channel.Id))
	return channel.Id, nil
}

// DemoteUserChannel removes the promoted Channel + Ability records.
func DemoteUserChannel(userChannelId, promotedChannelId int) error {
	tx := model.DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Delete abilities for the promoted channel
	if err := tx.Where("channel_id = ?", promotedChannelId).Delete(&model.Ability{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete abilities for promoted channel %d: %w", promotedChannelId, err)
	}

	// Delete the promoted channel
	if err := tx.Where("id = ?", promotedChannelId).Delete(&model.Channel{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete promoted channel %d: %w", promotedChannelId, err)
	}

	// Reset promoted_channel_id on the UserChannel
	if err := tx.Model(&model.UserChannel{}).Where("id = ?", userChannelId).Update("promoted_channel_id", 0).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to reset promoted_channel_id for user_channel %d: %w", userChannelId, err)
	}

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit demotion transaction: %w", err)
	}

	// Refresh channel cache
	model.InitChannelCache()

	common.SysLog(fmt.Sprintf("demoted user_channel %d, removed channel %d", userChannelId, promotedChannelId))
	return nil
}
