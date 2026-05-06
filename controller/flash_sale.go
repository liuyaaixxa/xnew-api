package controller

import (
	"errors"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

// GetFlashSaleInfo returns available flash sale info (public)
func GetFlashSaleInfo(c *gin.Context) {
	count, quota, err := model.GetFlashSaleInfo()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"count": count,
			"quota": quota,
		},
	})
}

// GrabFlashSale grabs a flash sale code for the current user
func GrabFlashSale(c *gin.Context) {
	userId := c.GetInt("id")
	redemption, err := model.GrabFlashSaleCode(userId)
	if err != nil {
		flashSaleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": i18n.T(c, i18n.MsgFlashSaleGrabSuccess),
		"data":    redemption,
	})
}

// GetMyGrabedCoupons returns the current user's grabbed but not activated coupons
func GetMyGrabedCoupons(c *gin.Context) {
	userId := c.GetInt("id")
	redemptions, err := model.GetUserGrabedRedemptions(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    redemptions,
	})
}

// ActivateGrabedCoupon activates a grabbed coupon and adds quota to user
func ActivateGrabedCoupon(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		Id int `json:"id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	quota, err := model.ActivateGrabedRedemption(req.Id, userId)
	if err != nil {
		flashSaleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": i18n.T(c, i18n.MsgFlashSaleActivateSuccess),
		"data":    quota,
	})
}

// GetRedemptionStats returns admin statistics for redemption codes
func GetRedemptionStats(c *gin.Context) {
	totalCount, totalQuota, usedCount, usedQuota, err := model.GetFlashSaleStats()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_count": totalCount,
			"total_quota": totalQuota,
			"used_count":  usedCount,
			"used_quota":  usedQuota,
		},
	})
}

func flashSaleError(c *gin.Context, err error) {
	msg := i18n.MsgRedemptionFailed
	switch {
	case errors.Is(err, model.ErrFlashSaleAlreadyGrabed):
		msg = i18n.MsgFlashSaleAlreadyGrabbed
	case errors.Is(err, model.ErrFlashSaleSoldOut):
		msg = i18n.MsgFlashSaleSoldOut
	case errors.Is(err, model.ErrFlashSaleInvalidStatus):
		msg = i18n.MsgFlashSaleInvalidStatus
	case errors.Is(err, model.ErrFlashSaleNotYours):
		msg = i18n.MsgFlashSaleNotYours
	case errors.Is(err, model.ErrFlashSaleExpired):
		msg = i18n.MsgFlashSaleExpired
	}
	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"message": i18n.T(c, msg),
	})
}
