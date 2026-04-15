package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
)

// AdminGetSettlements returns settlement orders for admin, optionally filtered by status
func AdminGetSettlements(c *gin.Context) {
	p, _ := strconv.Atoi(c.DefaultQuery("p", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	if p < 1 {
		p = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	var statusPtr *int
	if statusStr := c.Query("status"); statusStr != "" {
		s, err := strconv.Atoi(statusStr)
		if err == nil {
			statusPtr = &s
		}
	}

	orders, total, err := model.GetAllSettlementOrders((p-1)*pageSize, pageSize, statusPtr)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to get settlement orders: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": orders,
			"total": total,
		},
	})
}

// AdminApproveSettlement approves a settlement order (reviewing → settling)
func AdminApproveSettlement(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid order id"})
		return
	}

	order, err := model.GetSettlementOrderById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "order not found"})
		return
	}

	if order.Status != model.SettlementStatusReviewing {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "只能审核处于审核中状态的结算单"})
		return
	}

	reviewerId := c.GetInt("id")
	reviewerName := c.GetString("username")

	err = model.UpdateSettlementOrderStatus(id, map[string]interface{}{
		"status":        model.SettlementStatusSettling,
		"reviewer_id":   reviewerId,
		"reviewer_name": reviewerName,
		"review_time":   time.Now().Unix(),
	})
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to approve: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "审核通过"})
}

// AdminRejectSettlement rejects a settlement order
func AdminRejectSettlement(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid order id"})
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid request"})
		return
	}

	order, err := model.GetSettlementOrderById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "order not found"})
		return
	}

	if order.Status != model.SettlementStatusReviewing {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "只能驳回处于审核中状态的结算单"})
		return
	}

	reviewerId := c.GetInt("id")
	reviewerName := c.GetString("username")

	err = model.UpdateSettlementOrderStatus(id, map[string]interface{}{
		"status":         model.SettlementStatusRejected,
		"reviewer_id":    reviewerId,
		"reviewer_name":  reviewerName,
		"review_message": req.Reason,
		"review_time":    time.Now().Unix(),
	})
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "failed to reject: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "已驳回"})
}

// AdminSettleSettlement transfers points to user and marks order as completed
func AdminSettleSettlement(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid order id"})
		return
	}

	order, err := model.GetSettlementOrderById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "order not found"})
		return
	}

	if order.Status != model.SettlementStatusSettling {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "只能对处于结算中状态的结算单执行转入积分"})
		return
	}

	// Get user's wallet address
	user, err := model.GetUserById(order.UserId, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "user not found"})
		return
	}

	if user.SolanaAddress == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "用户尚未创建钱包"})
		return
	}

	// Transfer SOL from treasury
	if err := service.TransferSOLFromTreasury(user.SolanaAddress, order.TotalPoints); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("转入积分失败: %v", err),
		})
		return
	}

	// Log the treasury operation
	operatorId := c.GetInt("id")
	operatorName := c.GetString("username")
	logEntry := &model.TreasuryLog{
		OperatorId:   operatorId,
		Operator:     operatorName,
		Action:       "settlement",
		TargetUser:   order.Username,
		TargetUserId: order.UserId,
		FromAddress:  setting.OpenfortTreasuryAddress,
		ToAddress:    user.SolanaAddress,
		Amount:       order.TotalPoints,
		Status:       "success",
		Remark:       fmt.Sprintf("结算单: %s", order.OrderNo),
	}
	_ = logEntry.Insert()

	// Update order status to completed
	err = model.UpdateSettlementOrderStatus(id, map[string]interface{}{
		"status":       model.SettlementStatusCompleted,
		"settled_time": time.Now().Unix(),
	})
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "transfer succeeded but failed to update order status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "积分已转入"})
}
