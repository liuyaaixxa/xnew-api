package controller

import (
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
)

// GetSettlementDashboard returns a lightweight summary for the dashboard card
func GetSettlementDashboard(c *gin.Context) {
	userId := c.GetInt("id")
	totalPoints, totalTokens, err := model.GetUserSettlementDashboard(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to get settlement summary: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_points": totalPoints,
			"total_tokens": totalTokens,
		},
	})
}

// GetSettlementPending returns unsettled token stats for the current user
func GetSettlementPending(c *gin.Context) {
	userId := c.GetInt("id")

	afterLogId, err := model.GetMaxSettledLogId(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to get settlement boundary: " + err.Error(),
		})
		return
	}

	stats, maxLogId, err := model.GetUnsettledTokenStats(userId, afterLogId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to get unsettled stats: " + err.Error(),
		})
		return
	}

	var totalTokens int64
	var totalPoints float64
	for _, s := range stats {
		totalTokens += s.TotalTokens
		totalPoints += s.Points
	}

	// Also fetch historical summary
	historicalPoints, _ := model.GetUserSettlementSummary(userId)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"stats":             stats,
			"total_tokens":      totalTokens,
			"total_points":      totalPoints,
			"max_log_id":        maxLogId,
			"rate":              setting.SettlementTokenRate,
			"historical_points": historicalPoints,
		},
	})
}

// ApplySettlement creates a settlement order from pending stats
func ApplySettlement(c *gin.Context) {
	userId := c.GetInt("id")
	username := c.GetString("username")

	// Check if there is already a pending settlement
	hasPending, err := model.HasPendingSettlement(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to check pending settlement: " + err.Error(),
		})
		return
	}
	if hasPending {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "您已有未处理的结算申请，请等待处理完成后再申请",
		})
		return
	}

	afterLogId, err := model.GetMaxSettledLogId(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to get settlement boundary: " + err.Error(),
		})
		return
	}

	stats, maxLogId, err := model.GetUnsettledTokenStats(userId, afterLogId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to get unsettled stats: " + err.Error(),
		})
		return
	}

	if len(stats) == 0 || maxLogId == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "没有可结算的 Token 消耗记录",
		})
		return
	}

	var totalTokens int64
	var totalPoints float64
	for _, s := range stats {
		totalTokens += s.TotalTokens
		totalPoints += s.Points
	}

	detailBytes, err := common.Marshal(stats)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to serialize detail",
		})
		return
	}

	order := &model.SettlementOrder{
		OrderNo:         model.GenerateOrderNo(),
		UserId:          userId,
		Username:        username,
		TotalTokens:     totalTokens,
		TotalPoints:     totalPoints,
		Status:          model.SettlementStatusReviewing,
		Detail:          string(detailBytes),
		SettledLogMaxId: maxLogId,
	}

	err = model.CreateSettlementOrder(order)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to create settlement order: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "结算申请已提交",
		"data":    order,
	})
}

// GetSettlementOrders returns the current user's settlement order list
func GetSettlementOrders(c *gin.Context) {
	userId := c.GetInt("id")
	p, _ := strconv.Atoi(c.DefaultQuery("p", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	if p < 1 {
		p = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	orders, total, err := model.GetSettlementOrdersByUserId(userId, (p-1)*pageSize, pageSize)
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

// DeleteSettlementOrder deletes a settlement order in "new" status
func DeleteSettlementOrder(c *gin.Context) {
	userId := c.GetInt("id")
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "invalid order id",
		})
		return
	}

	err = model.DeleteSettlementOrder(id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "结算单已删除",
	})
}
