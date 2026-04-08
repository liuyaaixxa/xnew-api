package controller

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

// DeviceTokenRequest represents the request body for creating a device token
type DeviceTokenRequest struct {
	Name   string `json:"name" binding:"required"`
	Domain string `json:"domain"`
	Port   int    `json:"port"`
}

// DeviceTokenBatchRequest represents the request body for batch deleting device tokens
type DeviceTokenBatchRequest struct {
	Ids []uint `json:"ids" binding:"required"`
}

// GetAllDeviceTokens gets all device tokens for the current user
func GetAllDeviceTokens(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)

	deviceTokens, err := model.GetAllUserDeviceTokens(userId, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	total, _ := model.CountUserDeviceTokens(userId)
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(model.BuildMaskedDeviceTokenResponses(deviceTokens))
	common.ApiSuccess(c, pageInfo)
}

// GetDeviceToken gets a specific device token by ID
func GetDeviceToken(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	userId := c.GetInt("id")
	deviceToken, err := model.GetDeviceTokenByIdAndUserId(uint(id), userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, model.BuildMaskedDeviceTokenResponses([]*model.DeviceToken{deviceToken})[0])
}

// AddDeviceToken creates a new device token
func AddDeviceToken(c *gin.Context) {
	userId := c.GetInt("id")

	var req DeviceTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	// Validate name
	if err := model.ValidateDeviceTokenName(req.Name); err != nil {
		common.ApiError(c, err)
		return
	}

	// Check if device token with same name exists
	exists, err := model.IsDeviceTokenExists(userId, req.Name)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if exists {
		common.ApiErrorMsg(c, "Device token with this name already exists")
		return
	}

	// Check subscription resource limits for device tokens
	limits := service.GetUserResourceLimits(userId)
	maxTokens := limits.MaxDeviceTokens
	if maxTokens == 0 {
		// 0 = unlimited in subscription, fall back to env var cap
		maxTokens = model.GetMaxUserDeviceTokens()
	}
	count, err := model.CountUserDeviceTokens(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if int(count) >= maxTokens {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("您的套餐最多允许创建 %d 个设备令牌，请升级套餐以创建更多", maxTokens),
		})
		return
	}

	// Get octelium service
	octeliumSvc := service.GetOcteliumService()
	if !octeliumSvc.IsEnabled() {
		common.ApiErrorI18n(c, i18n.MsgDeviceTokenServiceNotEnabled)
		return
	}

	// Set default domain if not provided
	if req.Domain == "" {
		req.Domain = octeliumSvc.GetDefaultDomain()
	}

	// Generate auth token from octelium
	username := c.GetString("username")
	tokenResp, err := octeliumSvc.GenerateAuthToken(context.Background(), &service.GenerateTokenRequest{
		Name:     req.Name,
		Domain:   req.Domain,
		Username: username,
		Port:     req.Port,
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// Create device token record
	deviceToken := &model.DeviceToken{
		UserId:    userId,
		Name:      req.Name,
		Token:     tokenResp.Token,
		TokenMask: tokenResp.TokenMask,
		Domain:    tokenResp.Domain,
		Status:    model.DeviceTokenStatusActive,
	}

	if err := deviceToken.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}

	// Return masked token for display
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    model.BuildMaskedDeviceTokenResponses([]*model.DeviceToken{deviceToken})[0],
	})
}

// DeleteDeviceToken deletes a device token
func DeleteDeviceToken(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	userId := c.GetInt("id")

	// Get the device token first to retrieve the actual token for revocation
	deviceToken, err := model.GetDeviceTokenByIdAndUserId(uint(id), userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// Try to revoke the token from octelium (best effort)
	octeliumSvc := service.GetOcteliumService()
	if octeliumSvc.IsEnabled() && deviceToken.Token != "" {
		// Revoke from octelium - ignore errors as we still want to delete local record
		_ = octeliumSvc.RevokeAuthToken(context.Background(), deviceToken.Token)
	}

	// Delete associated Octelium Service (best-effort)
	username := c.GetString("username")
	octeliumSvc.DeleteOcteliumService(context.Background(), username, deviceToken.Name)

	// Delete from database
	if err := model.DeleteDeviceTokenById(uint(id), userId); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// DeleteDeviceTokenBatch deletes multiple device tokens
func DeleteDeviceTokenBatch(c *gin.Context) {
	var req DeviceTokenBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Ids) == 0 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	userId := c.GetInt("id")
	username := c.GetString("username")

	// Get octelium service for revocation
	octeliumSvc := service.GetOcteliumService()

	// Revoke tokens and delete services from octelium (best effort)
	for _, id := range req.Ids {
		if deviceToken, err := model.GetDeviceTokenByIdAndUserId(id, userId); err == nil {
			if octeliumSvc.IsEnabled() && deviceToken.Token != "" {
				_ = octeliumSvc.RevokeAuthToken(context.Background(), deviceToken.Token)
			}
			// Delete associated Octelium Service (best-effort)
			octeliumSvc.DeleteOcteliumService(context.Background(), username, deviceToken.Name)
		}
	}

	// Batch delete from database
	count, err := model.BatchDeleteDeviceTokens(req.Ids, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    count,
	})
}

// UpdateDeviceTokenStatus updates the status of a device token
func UpdateDeviceTokenStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	userId := c.GetInt("id")

	var req struct {
		Status int `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	// Validate status
	if req.Status != model.DeviceTokenStatusActive && req.Status != model.DeviceTokenStatusDisabled {
		common.ApiErrorMsg(c, "Invalid status value")
		return
	}

	if err := model.UpdateDeviceTokenStatus(uint(id), userId, req.Status); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// GetDeviceTokenKey returns the full token key (only once, for copy)
func GetDeviceTokenKey(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	userId := c.GetInt("id")
	deviceToken, err := model.GetDeviceTokenByIdAndUserId(uint(id), userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"token": deviceToken.Token,
		},
	})
}

// AdminGetAllDeviceTokens gets all device tokens (admin only)
func AdminGetAllDeviceTokens(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)

	deviceTokens, err := model.GetAllDeviceTokens(pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	total, _ := model.CountAllDeviceTokens()
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(model.BuildMaskedDeviceTokenResponses(deviceTokens))
	common.ApiSuccess(c, pageInfo)
}