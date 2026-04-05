package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

// ==================== User Endpoints ====================

// GetUserChannels returns the current user's personal channels (paginated + search)
func GetUserChannels(c *gin.Context) {
	userId := c.GetInt("id")
	keyword := c.Query("keyword")

	if keyword != "" {
		channels, err := model.SearchUserChannels(userId, keyword)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
			"data":    channels,
		})
		return
	}

	pageInfo := common.GetPageQuery(c)
	channels, total, err := model.GetUserChannelsByUserId(userId, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    channels,
		"total":   total,
	})
}

// GetUserChannel returns a single personal channel by ID (ownership checked)
func GetUserChannel(c *gin.Context) {
	userId := c.GetInt("id")
	channelId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, fmt.Errorf("invalid channel ID"))
		return
	}

	channel, err := model.GetUserChannelById(channelId)
	if err != nil {
		common.ApiError(c, fmt.Errorf("channel not found"))
		return
	}
	if channel.UserId != userId {
		common.ApiErrorMsg(c, "无权访问此渠道")
		return
	}

	common.ApiSuccess(c, channel)
}

// AddUserChannel creates a new personal channel for the current user
func AddUserChannel(c *gin.Context) {
	userId := c.GetInt("id")
	channel := model.UserChannel{}
	if err := c.ShouldBindJSON(&channel); err != nil {
		common.ApiError(c, err)
		return
	}

	// Validation
	if channel.Name == "" {
		common.ApiErrorMsg(c, "渠道名称不能为空")
		return
	}
	if channel.Key == "" {
		common.ApiErrorMsg(c, "渠道密钥不能为空")
		return
	}
	if channel.Models == "" {
		common.ApiErrorMsg(c, "模型列表不能为空")
		return
	}

	channel.UserId = userId
	channel.Status = common.ChannelStatusEnabled
	channel.ReviewStatus = model.UserChannelReviewPending

	if err := model.InsertUserChannel(&channel); err != nil {
		common.ApiError(c, err)
		return
	}

	// Clear key from response
	channel.Key = ""
	common.ApiSuccess(c, channel)
}

// UpdateUserChannel updates a personal channel (ownership checked, resets approval if approved)
func UpdateUserChannel(c *gin.Context) {
	userId := c.GetInt("id")
	channel := model.UserChannel{}
	if err := c.ShouldBindJSON(&channel); err != nil {
		common.ApiError(c, err)
		return
	}

	if channel.Id == 0 {
		common.ApiErrorMsg(c, "渠道ID不能为空")
		return
	}

	// Validation
	if channel.Name == "" {
		common.ApiErrorMsg(c, "渠道名称不能为空")
		return
	}
	if channel.Models == "" {
		common.ApiErrorMsg(c, "模型列表不能为空")
		return
	}

	// Ownership check
	existing, err := model.GetUserChannelById(channel.Id)
	if err != nil {
		common.ApiError(c, fmt.Errorf("channel not found"))
		return
	}
	if existing.UserId != userId {
		common.ApiErrorMsg(c, "无权修改此渠道")
		return
	}

	// Keep existing key if not provided (key is omitted from list responses for security)
	if channel.Key == "" {
		channel.Key = existing.Key
	}

	// Reset approval if previously approved, and demote the promoted channel
	if existing.ReviewStatus == model.UserChannelReviewApproved {
		channel.ReviewStatus = model.UserChannelReviewPending
		if existing.PromotedChannelId > 0 {
			channel.PromotedChannelId = 0
			go func() {
				if err := service.DemoteUserChannel(existing.Id, existing.PromotedChannelId); err != nil {
					common.SysLog(fmt.Sprintf("failed to demote user_channel %d on update: %v", existing.Id, err))
				}
			}()
		}
	}

	channel.UserId = userId
	if err := model.UpdateUserChannel(&channel); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, channel)
}

// DeleteUserChannel deletes a personal channel (ownership checked)
func DeleteUserChannel(c *gin.Context) {
	userId := c.GetInt("id")
	channelId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, fmt.Errorf("invalid channel ID"))
		return
	}

	// Check if the channel has a promoted channel and demote it
	existing, _ := model.GetUserChannelById(channelId)
	if existing != nil && existing.UserId == userId && existing.PromotedChannelId > 0 {
		go func() {
			if err := service.DemoteUserChannel(existing.Id, existing.PromotedChannelId); err != nil {
				common.SysLog(fmt.Sprintf("failed to demote user_channel %d on delete: %v", existing.Id, err))
			}
		}()
	}

	if err := model.DeleteUserChannel(channelId, userId); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// UpdateUserChannelStatus enables/disables a personal channel (ownership checked)
func UpdateUserChannelStatus(c *gin.Context) {
	userId := c.GetInt("id")

	var req struct {
		Id     int `json:"id"`
		Status int `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	if err := model.UpdateUserChannelStatus(req.Id, userId, req.Status); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// TestUserChannel tests a personal channel by sending a test request
func TestUserChannel(c *gin.Context) {
	userId := c.GetInt("id")
	channelId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, fmt.Errorf("invalid channel ID"))
		return
	}

	userChannel, err := model.GetUserChannelById(channelId)
	if err != nil {
		common.ApiError(c, fmt.Errorf("channel not found"))
		return
	}
	if userChannel.UserId != userId {
		common.ApiErrorMsg(c, "无权测试此渠道")
		return
	}

	// Convert UserChannel to Channel for testing
	ch := userChannelToChannel(userChannel)

	testModel := c.Query("model")
	tik := time.Now()
	// Accept unset ratio models for personal channels since users may have custom models
	result := testChannel(ch, testModel, "", false, testChannelOption{AcceptUnsetRatioModel: true})
	tok := time.Now()
	milliseconds := tok.Sub(tik).Milliseconds()
	consumedTime := float64(milliseconds) / 1000.0

	// Update test result
	go func() {
		_ = model.UpdateUserChannelTestResult(channelId, time.Now().Unix(), int(milliseconds))
	}()

	if result.localErr != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": result.localErr.Error(),
			"time":    0.0,
		})
		return
	}

	if result.newAPIError != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": result.newAPIError.Error(),
			"time":    consumedTime,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"time":    consumedTime,
	})
}

// userChannelToChannel converts a UserChannel to a Channel for testing purposes
func userChannelToChannel(uc *model.UserChannel) *model.Channel {
	return &model.Channel{
		Id:        uc.Id,
		Type:      uc.Type,
		Key:       uc.Key,
		Name:      uc.Name,
		BaseURL:   uc.BaseURL,
		Models:    uc.Models,
		TestModel: uc.TestModel,
		Group:     uc.Group,
		Status:    uc.Status,
	}
}

// ==================== Admin Endpoints ====================

// AdminGetUserChannels returns all user channels for admin review (paginated + filters)
func AdminGetUserChannels(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")

	var reviewStatus *int
	if rs := c.Query("review_status"); rs != "" {
		if v, err := strconv.Atoi(rs); err == nil {
			reviewStatus = &v
		}
	}

	channels, total, err := model.GetAllUserChannels(pageInfo.GetStartIdx(), pageInfo.GetPageSize(), reviewStatus, keyword)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    channels,
		"total":   total,
	})
}

// AdminApproveUserChannel approves a user channel
func AdminApproveUserChannel(c *gin.Context) {
	adminId := c.GetInt("id")
	var req struct {
		Id            int    `json:"id"`
		ReviewMessage string `json:"review_message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	// Verify the channel exists and is pending
	channel, err := model.GetUserChannelById(req.Id)
	if err != nil {
		common.ApiError(c, fmt.Errorf("channel not found"))
		return
	}
	if channel.ReviewStatus != model.UserChannelReviewPending {
		common.ApiErrorMsg(c, "只能审核待审核状态的渠道")
		return
	}

	if err := model.UpdateUserChannelReviewStatus(req.Id, model.UserChannelReviewApproved, req.ReviewMessage, adminId); err != nil {
		common.ApiError(c, err)
		return
	}

	// Promote to a real Channel so models appear in the marketplace
	fullChannel, err := model.GetUserChannelById(req.Id)
	if err != nil {
		common.SysLog(fmt.Sprintf("failed to reload user_channel %d for promotion: %v", req.Id, err))
	} else {
		promotedId, promoteErr := service.PromoteUserChannel(fullChannel)
		if promoteErr != nil {
			common.SysLog(fmt.Sprintf("failed to promote user_channel %d: %v", req.Id, promoteErr))
		} else {
			common.SysLog(fmt.Sprintf("user_channel %d promoted to channel %d", req.Id, promotedId))
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminRejectUserChannel rejects a user channel (requires review message)
func AdminRejectUserChannel(c *gin.Context) {
	adminId := c.GetInt("id")
	var req struct {
		Id            int    `json:"id"`
		ReviewMessage string `json:"review_message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	if req.ReviewMessage == "" {
		common.ApiErrorMsg(c, "拒绝时必须填写审核意见")
		return
	}

	// Verify the channel exists and is pending
	channel, err := model.GetUserChannelById(req.Id)
	if err != nil {
		common.ApiError(c, fmt.Errorf("channel not found"))
		return
	}
	if channel.ReviewStatus != model.UserChannelReviewPending {
		common.ApiErrorMsg(c, "只能审核待审核状态的渠道")
		return
	}

	if err := model.UpdateUserChannelReviewStatus(req.Id, model.UserChannelReviewRejected, req.ReviewMessage, adminId); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminOfflineUserChannel forces an approved channel offline
func AdminOfflineUserChannel(c *gin.Context) {
	adminId := c.GetInt("id")
	var req struct {
		Id            int    `json:"id"`
		ReviewMessage string `json:"review_message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	// Verify the channel exists and is approved
	channel, err := model.GetUserChannelById(req.Id)
	if err != nil {
		common.ApiError(c, fmt.Errorf("channel not found"))
		return
	}
	if channel.ReviewStatus != model.UserChannelReviewApproved {
		common.ApiErrorMsg(c, "只能下线已审核通过的渠道")
		return
	}

	if err := model.UpdateUserChannelReviewStatus(req.Id, model.UserChannelReviewOffline, req.ReviewMessage, adminId); err != nil {
		common.ApiError(c, err)
		return
	}

	// Demote: remove the promoted Channel + Abilities
	if channel.PromotedChannelId > 0 {
		go func() {
			if err := service.DemoteUserChannel(channel.Id, channel.PromotedChannelId); err != nil {
				common.SysLog(fmt.Sprintf("failed to demote user_channel %d: %v", channel.Id, err))
			}
		}()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

// AdminTestUserChannel tests a user channel (admin, no ownership check)
func AdminTestUserChannel(c *gin.Context) {
	channelId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, fmt.Errorf("invalid channel ID"))
		return
	}

	userChannel, err := model.GetUserChannelById(channelId)
	if err != nil {
		common.ApiError(c, fmt.Errorf("channel not found"))
		return
	}

	ch := userChannelToChannel(userChannel)

	testModel := c.Query("model")
	tik := time.Now()
	result := testChannel(ch, testModel, "", false, testChannelOption{AcceptUnsetRatioModel: true})
	tok := time.Now()
	milliseconds := tok.Sub(tik).Milliseconds()
	consumedTime := float64(milliseconds) / 1000.0

	go func() {
		_ = model.UpdateUserChannelTestResult(channelId, time.Now().Unix(), int(milliseconds))
	}()

	if result.localErr != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": result.localErr.Error(),
			"time":    0.0,
		})
		return
	}

	if result.newAPIError != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": result.newAPIError.Error(),
			"time":    consumedTime,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"time":    consumedTime,
	})
}
