package controller

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/Calcium-Ion/go-epay/epay"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"go.uber.org/zap"
)

type SubscriptionEpayPayRequest struct {
	PlanId        int    `json:"plan_id"`
	PaymentMethod string `json:"payment_method"`
}

func SubscriptionRequestEpay(c *gin.Context) {
	var req SubscriptionEpayPayRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	plan, err := model.GetSubscriptionPlanById(req.PlanId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !plan.Enabled {
		common.ApiErrorMsg(c, "套餐未启用")
		return
	}
	if plan.PriceAmount < 0.01 {
		common.ApiErrorMsg(c, "套餐金额过低")
		return
	}
	if !operation_setting.ContainsPayMethod(req.PaymentMethod) {
		common.ApiErrorMsg(c, "支付方式不存在")
		return
	}

	userId := c.GetInt("id")
	if plan.MaxPurchasePerUser > 0 {
		count, err := model.CountUserSubscriptionsByPlan(userId, plan.Id)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		if count >= int64(plan.MaxPurchasePerUser) {
			common.ApiErrorMsg(c, "已达到该套餐购买上限")
			return
		}
	}

	callBackAddress := service.GetCallbackAddress()
	returnUrl, err := url.Parse(callBackAddress + "/api/subscription/epay/return")
	if err != nil {
		common.ApiErrorMsg(c, "回调地址配置错误")
		return
	}
	notifyUrl, err := url.Parse(callBackAddress + "/api/subscription/epay/notify")
	if err != nil {
		common.ApiErrorMsg(c, "回调地址配置错误")
		return
	}

	tradeNo := fmt.Sprintf("%s%d", common.GetRandomString(6), time.Now().Unix())
	tradeNo = fmt.Sprintf("SUBUSR%dNO%s", userId, tradeNo)

	client := GetEpayClient()
	if client == nil {
		common.ApiErrorMsg(c, "当前管理员未配置支付信息")
		return
	}

	// 订阅价格以美元存储，支付宝/微信需要转换为人民币
	cnyMoney := plan.PriceAmount * operation_setting.Price

	order := &model.SubscriptionOrder{
		UserId:          userId,
		PlanId:          plan.Id,
		Money:           cnyMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   req.PaymentMethod,
		PaymentProvider: model.PaymentProviderEpay,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := order.Insert(); err != nil {
		common.ApiErrorMsg(c, "创建订单失败")
		return
	}
	uri, params, err := client.Purchase(&epay.PurchaseArgs{
		Type:           req.PaymentMethod,
		ServiceTradeNo: tradeNo,
		Name:           fmt.Sprintf("SUB:%s", plan.Title),
		Money:          strconv.FormatFloat(cnyMoney, 'f', 2, 64),
		Device:         epay.PC,
		NotifyUrl:      notifyUrl,
		ReturnUrl:      returnUrl,
	})
	if err != nil {
		_ = model.ExpireSubscriptionOrder(tradeNo, model.PaymentProviderEpay)
		common.ApiErrorMsg(c, "拉起支付失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": params, "url": uri})
}

func SubscriptionEpayNotify(c *gin.Context) {
	clientIP := c.ClientIP()
	zl := logger.L().With(
		zap.String("handler", "SubscriptionEpayNotify"),
		zap.String("client_ip", clientIP),
		zap.String("method", c.Request.Method),
	)

	// Guard 1: source IP whitelist (shared setting with topup callback).
	if allowed, reason := CheckCallbackIPAllowed(clientIP, operation_setting.EpayCallbackAllowedIPs); !allowed {
		zl.Warn("subscription epay callback IP not allowed", zap.String("reason", reason))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	var params map[string]string
	if c.Request.Method == "POST" {
		if err := c.Request.ParseForm(); err != nil {
			zl.Error("subscription epay callback POST parse failed", zap.Error(err))
			_, _ = c.Writer.Write([]byte("fail"))
			return
		}
		params = lo.Reduce(lo.Keys(c.Request.PostForm), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.PostForm.Get(t)
			return r
		}, map[string]string{})
	} else {
		params = lo.Reduce(lo.Keys(c.Request.URL.Query()), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.URL.Query().Get(t)
			return r
		}, map[string]string{})
	}

	if len(params) == 0 {
		zl.Warn("subscription epay callback rejected: empty params")
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	zl = zl.With(zap.String("trade_no", params["out_trade_no"]))

	client := GetEpayClient()
	if client == nil {
		zl.Warn("subscription epay callback rejected: payment not configured")
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	// Guard 2: MD5 signature.
	verifyInfo, err := client.Verify(params)
	if err != nil || !verifyInfo.VerifyStatus {
		zl.Error("subscription epay callback signature invalid",
			zap.Error(err),
			zap.Bool("sig_valid", verifyInfo.VerifyStatus),
		)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	if verifyInfo.TradeStatus != epay.StatusTradeSuccess {
		zl.Warn("subscription epay callback non-success trade status",
			zap.String("trade_status", verifyInfo.TradeStatus))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	// Ack early to stop gateway retries; the critical section below is
	// protected by LockOrder + status transition inside CompleteSubscriptionOrder.
	_, _ = c.Writer.Write([]byte("success"))

	LockOrder(verifyInfo.ServiceTradeNo)
	defer UnlockOrder(verifyInfo.ServiceTradeNo)

	order := model.GetSubscriptionOrderByTradeNo(verifyInfo.ServiceTradeNo)
	if order == nil {
		zl.Warn("subscription epay callback order not found")
		return
	}
	zl = zl.With(zap.Int("user_id", order.UserId), zap.Float64("money", order.Money))

	// Guard 3: idempotency observation.
	if order.Status != common.TopUpStatusPending {
		zl.Warn("subscription epay callback hit non-pending order",
			zap.String("current_status", order.Status))
		return
	}

	// Guard 4: trade_no user ownership (SUBUSR prefix variant).
	if ok, parsed := CheckSubscriptionTradeNoOwnership(verifyInfo.ServiceTradeNo, order.UserId); !ok {
		zl.Error("subscription epay callback trade_no user mismatch",
			zap.Int("parsed_user_id", parsed))
		return
	}

	// Guard 5: order staleness.
	if valid, age := CheckOrderAge(order.CreateTime, time.Now().Unix(), operation_setting.EpayCallbackMaxOrderAgeSeconds); !valid {
		zl.Error("subscription epay callback order expired",
			zap.Int64("order_age_seconds", age),
			zap.Int("max_age_seconds", operation_setting.EpayCallbackMaxOrderAgeSeconds))
		return
	}

	// Subscription orders have fixed pricing per plan, so large-amount review
	// doesn't apply — plan amounts are admin-curated. Proceed to completion.
	if err := model.CompleteSubscriptionOrder(verifyInfo.ServiceTradeNo, common.GetJsonString(verifyInfo), model.PaymentProviderEpay, verifyInfo.Type); err != nil {
		zl.Error("subscription epay callback complete failed", zap.Error(err))
		return
	}
	zl.Info("subscription epay callback completed")
}

// SubscriptionEpayReturn handles browser return after payment.
// It verifies the payload and completes the order, then redirects to console.
func SubscriptionEpayReturn(c *gin.Context) {
	var params map[string]string

	if c.Request.Method == "POST" {
		// POST 请求：从 POST body 解析参数
		if err := c.Request.ParseForm(); err != nil {
			c.Redirect(http.StatusFound, system_setting.ServerAddress+"/console/topup?pay=fail")
			return
		}
		params = lo.Reduce(lo.Keys(c.Request.PostForm), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.PostForm.Get(t)
			return r
		}, map[string]string{})
	} else {
		// GET 请求：从 URL Query 解析参数
		params = lo.Reduce(lo.Keys(c.Request.URL.Query()), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.URL.Query().Get(t)
			return r
		}, map[string]string{})
	}

	if len(params) == 0 {
		c.Redirect(http.StatusFound, system_setting.ServerAddress+"/console/topup?pay=fail")
		return
	}

	client := GetEpayClient()
	if client == nil {
		c.Redirect(http.StatusFound, system_setting.ServerAddress+"/console/topup?pay=fail")
		return
	}
	verifyInfo, err := client.Verify(params)
	if err != nil || !verifyInfo.VerifyStatus {
		c.Redirect(http.StatusFound, system_setting.ServerAddress+"/console/topup?pay=fail")
		return
	}
	if verifyInfo.TradeStatus == epay.StatusTradeSuccess {
		LockOrder(verifyInfo.ServiceTradeNo)
		defer UnlockOrder(verifyInfo.ServiceTradeNo)
		if err := model.CompleteSubscriptionOrder(verifyInfo.ServiceTradeNo, common.GetJsonString(verifyInfo), model.PaymentProviderEpay, verifyInfo.Type); err != nil {
			c.Redirect(http.StatusFound, system_setting.ServerAddress+"/console/topup?pay=fail")
			return
		}
		c.Redirect(http.StatusFound, system_setting.ServerAddress+"/console/topup?pay=success")
		return
	}
	c.Redirect(http.StatusFound, system_setting.ServerAddress+"/console/topup?pay=pending")
}
