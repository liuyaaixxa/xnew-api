package controller

import (
	"fmt"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// GetUserVouchers returns all vouchers for the current user.
func GetUserVouchers(c *gin.Context) {
	userId := c.GetInt("id")
	vouchers, err := model.GetUserVouchers(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if vouchers == nil {
		vouchers = []model.UserVoucher{}
	}
	common.ApiSuccess(c, vouchers)
}

// GetUnclaimedVouchers returns unclaimed vouchers for the current user.
func GetUnclaimedVouchers(c *gin.Context) {
	userId := c.GetInt("id")
	vouchers, err := model.GetUnclaimedVouchers(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if vouchers == nil {
		vouchers = []model.UserVoucher{}
	}
	common.ApiSuccess(c, vouchers)
}

// ClaimVoucher claims a specific voucher for the current user.
func ClaimVoucher(c *gin.Context) {
	userId := c.GetInt("id")
	voucherId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的额度券ID")
		return
	}

	voucher, err := model.ClaimVoucher(voucherId, userId)
	if err != nil {
		common.ApiError(c, fmt.Errorf("签收额度券失败: %w", err))
		return
	}

	// Return updated balance
	user, _ := model.GetUserById(userId, false)
	quota := 0
	if user != nil {
		quota = user.Quota
	}

	common.ApiSuccess(c, gin.H{
		"voucher": voucher,
		"quota":   quota,
	})
}
