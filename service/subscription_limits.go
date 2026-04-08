package service

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

// Free-tier defaults for users without an active subscription
const (
	FreeMaxDeviceTokens = 1
	FreeMaxUserChannels = 1
	FreeMaxSharedModels = 5
)

// ResourceLimits holds the effective resource limits for a user
type ResourceLimits struct {
	MaxDeviceTokens int `json:"max_device_tokens"`
	MaxUserChannels int `json:"max_user_channels"`
	MaxSharedModels int `json:"max_shared_models"`
}

// GetUserResourceLimits returns the effective resource limits for a user.
// If the user has multiple active subscriptions, the maximum value across
// all subscriptions is used for each dimension. 0 means unlimited.
func GetUserResourceLimits(userId int) ResourceLimits {
	freeLimits := ResourceLimits{
		MaxDeviceTokens: FreeMaxDeviceTokens,
		MaxUserChannels: FreeMaxUserChannels,
		MaxSharedModels: FreeMaxSharedModels,
	}

	if userId <= 0 {
		return freeLimits
	}

	now := common.GetTimestamp()
	var subs []model.UserSubscription
	err := model.DB.Where("user_id = ? AND status = ? AND end_time > ?", userId, "active", now).
		Find(&subs).Error
	if err != nil || len(subs) == 0 {
		return freeLimits
	}

	// Collect plan limits from all active subscriptions.
	// Use -1 as sentinel to distinguish "not yet set" from "unlimited (0)".
	maxDT, maxUC, maxSM := -1, -1, -1
	hasPlan := false

	for _, sub := range subs {
		plan, err := model.GetSubscriptionPlanById(sub.PlanId)
		if err != nil || plan == nil {
			continue
		}
		hasPlan = true

		maxDT = maxLimit(maxDT, plan.MaxDeviceTokens)
		maxUC = maxLimit(maxUC, plan.MaxUserChannels)
		maxSM = maxLimit(maxSM, plan.MaxSharedModels)
	}

	if !hasPlan {
		return freeLimits
	}
	return ResourceLimits{
		MaxDeviceTokens: maxDT,
		MaxUserChannels: maxUC,
		MaxSharedModels: maxSM,
	}
}

// maxLimit returns the more permissive of two limits.
// 0 means unlimited, so if either is 0 the result is 0.
// -1 means "not yet set" (sentinel for first iteration).
func maxLimit(a, b int) int {
	if a < 0 {
		return b
	}
	if a == 0 || b == 0 {
		return 0
	}
	if a > b {
		return a
	}
	return b
}

// CountUserSharedModels counts the total number of shared model entries
// across all of a user's channels (sum of comma-separated model names).
func CountUserSharedModels(userId int) (int, error) {
	if userId <= 0 {
		return 0, nil
	}
	var channels []struct {
		Models string
	}
	err := model.DB.Model(&model.UserChannel{}).
		Where("user_id = ?", userId).
		Select("models").
		Find(&channels).Error
	if err != nil {
		return 0, err
	}

	total := 0
	for _, ch := range channels {
		if strings.TrimSpace(ch.Models) != "" {
			total += len(strings.Split(ch.Models, ","))
		}
	}
	return total, nil
}
