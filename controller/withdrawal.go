package controller

import (
	"fmt"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// 最低提现额度配置（单位：quota，对应50美元）
var MinWithdrawalAmount int64 = 500000

// GetWithdrawalStats 获取用户提现统计
func GetWithdrawalStats(c *gin.Context) {
	userId := c.GetInt("id")
	if userId == 0 {
		c.JSON(401, gin.H{"success": false, "message": "未登录"})
		return
	}

	withdrawable, withdrawn, pending, err := model.GetUserWithdrawalStats(userId)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "获取提现统计失败"})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"withdrawable": withdrawable,
			"withdrawn":    withdrawn,
			"pending":      pending,
			"min_amount":   MinWithdrawalAmount,
		},
	})
}

// CreateWithdrawalRequest 创建提现申请
func CreateWithdrawalRequest(c *gin.Context) {
	userId := c.GetInt("id")
	if userId == 0 {
		c.JSON(401, gin.H{"success": false, "message": "未登录"})
		return
	}

	var req struct {
		Channel string `json:"channel" binding:"required"` // wechat/alipay
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"success": false, "message": "参数错误"})
		return
	}

	if req.Channel != model.WithdrawalChannelWechat && req.Channel != model.WithdrawalChannelAlipay {
		c.JSON(400, gin.H{"success": false, "message": "不支持的提现渠道"})
		return
	}

	// 获取可提现明细
	details, totalQuota, err := model.GetWithdrawableDetailsByUserId(userId)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "获取可提现明细失败"})
		return
	}

	// 检查最低提现额度
	if totalQuota < MinWithdrawalAmount {
		c.JSON(400, gin.H{
			"success": false,
			"message": fmt.Sprintf("可提现额度不足，最低提现额度为 %.0f", float64(MinWithdrawalAmount)/common.QuotaPerUnit),
		})
		return
	}

	// 创建提现记录
	record := &model.WithdrawalRecord{
		UserId:       userId,
		Amount:       totalQuota,
		Tax:          0,
		TaxRate:      0,
		ActualAmount: totalQuota,
		Channel:      req.Channel,
		Status:       model.WithdrawalStatusNew,
	}

	if err := model.CreateWithdrawalRecord(record); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "创建提现记录失败"})
		return
	}

	// 将明细标记为已提现
	detailIds := make([]int, len(details))
	for i, d := range details {
		detailIds[i] = d.Id
	}
	if err := model.MarkDetailsAsWithdrawn(detailIds, int64(record.Id)); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "更新明细状态失败"})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"record_id":     record.Id,
			"amount":        record.Amount,
			"actual_amount": record.ActualAmount,
			"channel":       record.Channel,
			"status":        record.Status,
		},
	})
}

// ConfirmWithdrawal 确认提现（用户点击确认后进入提现中状态）
func ConfirmWithdrawal(c *gin.Context) {
	userId := c.GetInt("id")
	if userId == 0 {
		c.JSON(401, gin.H{"success": false, "message": "未登录"})
		return
	}

	recordIdStr := c.Param("id")
	recordId, err := strconv.Atoi(recordIdStr)
	if err != nil {
		c.JSON(400, gin.H{"success": false, "message": "参数错误"})
		return
	}

	record, err := model.GetWithdrawalRecordById(recordId)
	if err != nil || record.UserId != userId {
		c.JSON(404, gin.H{"success": false, "message": "提现记录不存在"})
		return
	}

	if record.Status != model.WithdrawalStatusNew {
		c.JSON(400, gin.H{"success": false, "message": "提现记录状态不正确"})
		return
	}

	// 更新状态为提现中
	if err := model.UpdateWithdrawalRecordStatus(recordId, model.WithdrawalStatusPending, "用户确认提现"); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "更新提现状态失败"})
		return
	}

	// 创建支付记录（模拟，实际需要调用支付系统）
	paymentRecord := &model.WithdrawalPaymentRecord{
		WithdrawalRecordId: recordId,
		TradeId:            fmt.Sprintf("WD%d%d", recordId, time.Now().Unix()),
		Status:             0,
		OrderId:            "",
	}
	model.CreateWithdrawalPaymentRecord(paymentRecord)

	c.JSON(200, gin.H{
		"success": true,
		"message": "提现已提交，等待处理",
	})
}

// GetWithdrawalRecords 获取提现记录列表
func GetWithdrawalRecords(c *gin.Context) {
	userId := c.GetInt("id")
	if userId == 0 {
		c.JSON(401, gin.H{"success": false, "message": "未登录"})
		return
	}

	statusStr := c.Query("status")
	status := -1
	if statusStr != "" {
		status, _ = strconv.Atoi(statusStr)
	}

	page, _ := strconv.Atoi(c.Query("page"))
	if page == 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("page_size"))
	if pageSize == 0 {
		pageSize = 10
	}

	limit := pageSize
	offset := (page - 1) * pageSize

	records, total, err := model.GetWithdrawalRecordsByUserId(userId, status, limit, offset)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "获取提现记录失败"})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"records":   records,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// GetWithdrawalDetails 获取提现明细列表
func GetWithdrawalDetails(c *gin.Context) {
	userId := c.GetInt("id")
	if userId == 0 {
		c.JSON(401, gin.H{"success": false, "message": "未登录"})
		return
	}

	isWithdrawnStr := c.Query("is_withdrawn")
	isWithdrawn := -1
	if isWithdrawnStr != "" {
		isWithdrawn, _ = strconv.Atoi(isWithdrawnStr)
	}

	page, _ := strconv.Atoi(c.Query("page"))
	if page == 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("page_size"))
	if pageSize == 0 {
		pageSize = 10
	}

	limit := pageSize
	offset := (page - 1) * pageSize

	details, total, err := model.GetWithdrawalDetailsByUserId(userId, isWithdrawn, limit, offset)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "获取提现明细失败"})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"details":   details,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// WithdrawalCallback 提现回调处理（模拟）
func WithdrawalCallback(c *gin.Context) {
	// 实际实现需要根据支付系统对接
	// 这里是模拟回调处理
	tradeId := c.Query("trade_id")
	statusStr := c.Query("status")
	orderId := c.Query("order_id")

	if tradeId == "" {
		c.JSON(400, gin.H{"success": false, "message": "缺少trade_id"})
		return
	}

	// 查找支付记录
	var paymentRecord model.WithdrawalPaymentRecord
	if err := model.DB.Where("trade_id = ?", tradeId).First(&paymentRecord).Error; err != nil {
		c.JSON(404, gin.H{"success": false, "message": "支付记录不存在"})
		return
	}

	// 更新支付记录
	status := 0
	if statusStr == "success" {
		status = 1
	}
	now := time.Now().Unix()
	model.DB.Model(&paymentRecord).Updates(map[string]interface{}{
		"status":     status,
		"order_id":   orderId,
		"updated_at": now,
	})

	// 更新提现记录状态
	recordId := paymentRecord.WithdrawalRecordId
	if statusStr == "success" {
		model.UpdateWithdrawalRecordStatus(recordId, model.WithdrawalStatusSuccess, "提现成功")
	} else if statusStr == "failed" {
		// 失败时需要回滚明细
		model.UpdateWithdrawalRecordStatus(recordId, model.WithdrawalStatusFailed, "提现失败")
		// 将明细恢复为未提现
		var details []model.WithdrawalDetail
		model.DB.Where("withdrawal_record_id = ?", recordId).Find(&details)
		for _, d := range details {
			model.DB.Model(&d).Updates(map[string]interface{}{
				"is_withdrawn":         model.WithdrawalDetailNotWithdrawn,
				"withdrawal_record_id": 0,
				"withdrawn_at":         0,
			})
		}
	}

	c.JSON(200, gin.H{"success": true, "message": "回调处理成功"})
}