package controller

import (
	"fmt"
	"net/url"
	"strconv"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/Calcium-Ion/go-epay/epay"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"
)

func GetTopUpInfo(c *gin.Context) {
	// 获取支付方式
	payMethods := operation_setting.PayMethods

	// 如果启用了 Stripe 支付，添加到支付方法列表
	if setting.StripeApiSecret != "" && setting.StripeWebhookSecret != "" && setting.StripePriceId != "" {
		// 检查是否已经包含 Stripe
		hasStripe := false
		for _, method := range payMethods {
			if method["type"] == "stripe" {
				hasStripe = true
				break
			}
		}

		if !hasStripe {
			stripeMethod := map[string]string{
				"name":      "Stripe",
				"type":      "stripe",
				"color":     "rgba(var(--semi-purple-5), 1)",
				"min_topup": strconv.Itoa(setting.StripeMinTopUp),
			}
			payMethods = append(payMethods, stripeMethod)
		}
	}

	// 如果启用了 Waffo 支付，添加到支付方法列表
	enableWaffo := setting.WaffoEnabled &&
		((!setting.WaffoSandbox &&
			setting.WaffoApiKey != "" &&
			setting.WaffoPrivateKey != "" &&
			setting.WaffoPublicCert != "") ||
			(setting.WaffoSandbox &&
				setting.WaffoSandboxApiKey != "" &&
				setting.WaffoSandboxPrivateKey != "" &&
				setting.WaffoSandboxPublicCert != ""))
	if enableWaffo {
		hasWaffo := false
		for _, method := range payMethods {
			if method["type"] == "waffo" {
				hasWaffo = true
				break
			}
		}

		if !hasWaffo {
			waffoMethod := map[string]string{
				"name":      "Waffo (Global Payment)",
				"type":      "waffo",
				"color":     "rgba(var(--semi-blue-5), 1)",
				"min_topup": strconv.Itoa(setting.WaffoMinTopUp),
			}
			payMethods = append(payMethods, waffoMethod)
		}
	}

	// 如果启用了 PayPal 支付，添加到支付方法列表
	enablePayPal := setting.PayPalEnabled()
	if enablePayPal {
		hasPayPal := false
		for _, method := range payMethods {
			if method["type"] == "paypal" {
				hasPayPal = true
				break
			}
		}

		if !hasPayPal {
			paypalMethod := map[string]string{
				"name":      "PayPal",
				"type":      "paypal",
				"color":     "rgba(var(--semi-blue-5), 1)",
				"min_topup": strconv.Itoa(setting.PayPalMinTopUp),
			}
			payMethods = append(payMethods, paypalMethod)
		}
	}

	data := gin.H{
		"enable_online_topup": operation_setting.PayAddress != "" && operation_setting.EpayId != "" && operation_setting.EpayKey != "",
		"enable_stripe_topup": setting.StripeApiSecret != "" && setting.StripeWebhookSecret != "" && setting.StripePriceId != "",
		"enable_creem_topup":  setting.CreemApiKey != "" && setting.CreemProducts != "[]",
		"enable_waffo_topup": enableWaffo,
		"enable_paypal_topup": enablePayPal,
		"waffo_pay_methods": func() interface{} {
			if enableWaffo {
				return setting.GetWaffoPayMethods()
			}
			return nil
		}(),
		"creem_products": setting.CreemProducts,
		"pay_methods":         payMethods,
		"min_topup":           operation_setting.MinTopUp,
		"stripe_min_topup":    setting.StripeMinTopUp,
		"waffo_min_topup":     setting.WaffoMinTopUp,
		"paypal_min_topup":    setting.PayPalMinTopUp,
		"amount_options":      operation_setting.GetPaymentSetting().AmountOptions,
		"discount":            operation_setting.GetPaymentSetting().AmountDiscount,
	}
	common.ApiSuccess(c, data)
}

type EpayRequest struct {
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
}

type AmountRequest struct {
	Amount int64 `json:"amount"`
}

func GetEpayClient() *epay.Client {
	if operation_setting.PayAddress == "" || operation_setting.EpayId == "" || operation_setting.EpayKey == "" {
		return nil
	}
	withUrl, err := epay.NewClient(&epay.Config{
		PartnerID: operation_setting.EpayId,
		Key:       operation_setting.EpayKey,
	}, operation_setting.PayAddress)
	if err != nil {
		return nil
	}
	return withUrl
}

func getPayMoney(amount int64, group string) float64 {
	dAmount := decimal.NewFromInt(amount)
	// 充值金额以“展示类型”为准：
	// - USD/CNY: 前端传 amount 为金额单位；TOKENS: 前端传 tokens，需要换成 USD 金额
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		dAmount = dAmount.Div(dQuotaPerUnit)
	}

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}

	dTopupGroupRatio := decimal.NewFromFloat(topupGroupRatio)
	dPrice := decimal.NewFromFloat(operation_setting.Price)
	// apply optional preset discount by the original request amount (if configured), default 1.0
	discount := 1.0
	if ds, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(amount)]; ok {
		if ds > 0 {
			discount = ds
		}
	}
	dDiscount := decimal.NewFromFloat(discount)

	payMoney := dAmount.Mul(dPrice).Mul(dTopupGroupRatio).Mul(dDiscount)

	return payMoney.InexactFloat64()
}

func getMinTopup() int64 {
	minTopup := operation_setting.MinTopUp
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dMinTopup := decimal.NewFromInt(int64(minTopup))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		minTopup = int(dMinTopup.Mul(dQuotaPerUnit).IntPart())
	}
	return int64(minTopup)
}

func RequestEpay(c *gin.Context) {
	var req EpayRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	if req.Amount < getMinTopup() {
		c.JSON(200, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getMinTopup())})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}
	payMoney := getPayMoney(req.Amount, group)
	if payMoney < 0.01 {
		c.JSON(200, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	if !operation_setting.ContainsPayMethod(req.PaymentMethod) {
		c.JSON(200, gin.H{"message": "error", "data": "支付方式不存在"})
		return
	}

	callBackAddress := service.GetCallbackAddress()
	returnUrl, _ := url.Parse(system_setting.ServerAddress + "/console/log")
	notifyUrl, _ := url.Parse(callBackAddress + "/api/user/epay/notify")
	tradeNo := fmt.Sprintf("%s%d", common.GetRandomString(6), time.Now().Unix())
	tradeNo = fmt.Sprintf("USR%dNO%s", id, tradeNo)
	client := GetEpayClient()
	if client == nil {
		c.JSON(200, gin.H{"message": "error", "data": "当前管理员未配置支付信息"})
		return
	}
	uri, params, err := client.Purchase(&epay.PurchaseArgs{
		Type:           req.PaymentMethod,
		ServiceTradeNo: tradeNo,
		Name:           fmt.Sprintf("TUC%d", req.Amount),
		Money:          strconv.FormatFloat(payMoney, 'f', 2, 64),
		Device:         epay.PC,
		NotifyUrl:      notifyUrl,
		ReturnUrl:      returnUrl,
	})
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}
	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount := decimal.NewFromInt(int64(amount))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		amount = dAmount.Div(dQuotaPerUnit).IntPart()
	}
	topUp := &model.TopUp{
		UserId:          id,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   req.PaymentMethod,
		PaymentProvider: model.PaymentProviderEpay,
		CreateTime:      time.Now().Unix(),
		Status:          "pending",
	}
	err = topUp.Insert()
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}
	c.JSON(200, gin.H{"message": "success", "data": params, "url": uri})
}

// tradeNo lock
var orderLocks sync.Map
var createLock sync.Mutex

// refCountedMutex 带引用计数的互斥锁，确保最后一个使用者才从 map 中删除
type refCountedMutex struct {
	mu       sync.Mutex
	refCount int
}

// LockOrder 尝试对给定订单号加锁
func LockOrder(tradeNo string) {
	createLock.Lock()
	var rcm *refCountedMutex
	if v, ok := orderLocks.Load(tradeNo); ok {
		rcm = v.(*refCountedMutex)
	} else {
		rcm = &refCountedMutex{}
		orderLocks.Store(tradeNo, rcm)
	}
	rcm.refCount++
	createLock.Unlock()
	rcm.mu.Lock()
}

// UnlockOrder 释放给定订单号的锁
func UnlockOrder(tradeNo string) {
	v, ok := orderLocks.Load(tradeNo)
	if !ok {
		return
	}
	rcm := v.(*refCountedMutex)
	rcm.mu.Unlock()

	createLock.Lock()
	rcm.refCount--
	if rcm.refCount == 0 {
		orderLocks.Delete(tradeNo)
	}
	createLock.Unlock()
}

func EpayNotify(c *gin.Context) {
	clientIP := c.ClientIP()
	zl := logger.L().With(
		zap.String("handler", "EpayNotify"),
		zap.String("client_ip", clientIP),
		zap.String("method", c.Request.Method),
	)

	// Guard 1: source IP whitelist — first line of defense. When the whitelist
	// is empty this is a no-op, preserving pre-hardening behavior.
	if allowed, reason := CheckCallbackIPAllowed(clientIP, operation_setting.EpayCallbackAllowedIPs); !allowed {
		zl.Warn("epay callback IP not allowed",
			zap.String("reason", reason),
			zap.String("configured_whitelist", operation_setting.EpayCallbackAllowedIPs),
		)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	// Parse params from POST form or GET query.
	var params map[string]string
	if c.Request.Method == "POST" {
		if err := c.Request.ParseForm(); err != nil {
			zl.Error("epay callback POST parse failed", zap.Error(err))
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
		zl.Warn("epay callback rejected: empty params")
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	// Include trade_no in all subsequent logs so Loki queries like
	// `| json | trade_no="USR12NO..."` can follow the full lifecycle.
	incomingTradeNo := params["out_trade_no"]
	zl = zl.With(zap.String("trade_no", incomingTradeNo))

	client := GetEpayClient()
	if client == nil {
		zl.Warn("epay callback rejected: payment not configured")
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	// Guard 2: MD5 signature verification (existing behavior).
	verifyInfo, err := client.Verify(params)
	if err != nil || !verifyInfo.VerifyStatus {
		zl.Error("epay callback signature invalid",
			zap.Error(err),
			zap.Bool("sig_valid", verifyInfo.VerifyStatus),
		)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	// Only TRADE_SUCCESS callbacks are actionable. Other statuses (e.g. TRADE_REFUND)
	// are recorded but not crediting quota.
	if verifyInfo.TradeStatus != epay.StatusTradeSuccess {
		zl.Warn("epay callback non-success trade status",
			zap.String("trade_status", verifyInfo.TradeStatus),
		)
		// Still reply success so the gateway doesn't retry forever.
		_, _ = c.Writer.Write([]byte("success"))
		return
	}

	// Everything past this point is an order we intend to credit, so respond
	// success EARLY so the gateway stops retrying even if our DB work is slow.
	// The ack is idempotent-safe because LockOrder + status transition protects
	// the critical section below.
	_, _ = c.Writer.Write([]byte("success"))

	LockOrder(verifyInfo.ServiceTradeNo)
	defer UnlockOrder(verifyInfo.ServiceTradeNo)

	topUp := model.GetTopUpByTradeNo(verifyInfo.ServiceTradeNo)
	if topUp == nil {
		zl.Warn("epay callback order not found")
		return
	}

	zl = zl.With(zap.Int("user_id", topUp.UserId), zap.Float64("money", topUp.Money))

	// Guard 3: cross-gateway protection — only EPay-created orders can be completed via EPay.
	if topUp.PaymentProvider != model.PaymentProviderEpay {
		zl.Warn("epay callback payment provider mismatch",
			zap.String("order_provider", topUp.PaymentProvider),
			zap.String("callback_type", verifyInfo.Type),
		)
		return
	}

	// Guard 4: idempotency + visibility. Any non-pending status gets logged
	// rather than silently dropped, so replays and post-refund callbacks leave
	// a paper trail.
	if topUp.Status != common.TopUpStatusPending {
		zl.Warn("epay callback hit non-pending order",
			zap.String("current_status", topUp.Status),
		)
		return
	}

	// Guard 5: trade_no must encode the same user_id as the order row.
	if ok, parsed := CheckTradeNoOwnership(verifyInfo.ServiceTradeNo, topUp.UserId); !ok {
		zl.Error("epay callback trade_no user mismatch",
			zap.Int("parsed_user_id", parsed),
		)
		return
	}

	// Guard 6: staleness — if the order was created too long ago, treat the
	// callback as a replay attempt and refuse to credit.
	if valid, age := CheckOrderAge(topUp.CreateTime, time.Now().Unix(), operation_setting.EpayCallbackMaxOrderAgeSeconds); !valid {
		zl.Error("epay callback order expired",
			zap.Int64("order_age_seconds", age),
			zap.Int("max_age_seconds", operation_setting.EpayCallbackMaxOrderAgeSeconds),
		)
		return
	}

	// Guard 7: large orders require human review. Below threshold, auto-credit
	// as before.
	if ShouldPendingReview(topUp.Money, operation_setting.EpayAutoTopUpThreshold) {
		topUp.Status = common.TopUpStatusPendingReview
		if err := topUp.Update(); err != nil {
			zl.Error("failed to mark order pending_review", zap.Error(err))
			return
		}
		zl.Warn("large topup pending review",
			zap.Float64("threshold", operation_setting.EpayAutoTopUpThreshold),
		)
		model.RecordLog(topUp.UserId, model.LogTypeTopup,
			fmt.Sprintf("大额充值已提交人工审核，金额：$%.2f，订单号：%s", topUp.Money, topUp.TradeNo))
		return
	}

	// Happy path — credit the user.
	if topUp.PaymentMethod != verifyInfo.Type {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("易支付 实际支付方式与订单不同 trade_no=%s order_payment_method=%s actual_type=%s client_ip=%s", verifyInfo.ServiceTradeNo, topUp.PaymentMethod, verifyInfo.Type, clientIP))
		topUp.PaymentMethod = verifyInfo.Type
	}
	topUp.Status = common.TopUpStatusSuccess
	topUp.CompleteTime = common.GetTimestamp()
	if err := topUp.Update(); err != nil {
		zl.Error("failed to mark order success", zap.Error(err))
		return
	}
	dAmount := decimal.NewFromInt(int64(topUp.Amount))
	dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
	quotaToAdd := int(dAmount.Mul(dQuotaPerUnit).IntPart())
	if err := model.IncreaseUserQuota(topUp.UserId, quotaToAdd, true); err != nil {
		zl.Error("failed to increase user quota", zap.Error(err), zap.Int("quota_to_add", quotaToAdd))
		return
	}
	zl.Info("epay callback credit success", zap.Int("quota_added", quotaToAdd))
	model.RecordLog(topUp.UserId, model.LogTypeTopup,
		fmt.Sprintf("使用在线充值成功，充值金额: %v，支付金额：%f", logger.LogQuota(quotaToAdd), topUp.Money))
}

func RequestAmount(c *gin.Context) {
	var req AmountRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	if req.Amount < getMinTopup() {
		c.JSON(200, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getMinTopup())})
		return
	}
	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}
	payMoney := getPayMoney(req.Amount, group)
	if payMoney <= 0.01 {
		c.JSON(200, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}
	c.JSON(200, gin.H{"message": "success", "data": strconv.FormatFloat(payMoney, 'f', 2, 64)})
}

func GetUserTopUps(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")

	var (
		topups []*model.TopUp
		total  int64
		err    error
	)
	if keyword != "" {
		topups, total, err = model.SearchUserTopUps(userId, keyword, pageInfo)
	} else {
		topups, total, err = model.GetUserTopUps(userId, pageInfo)
	}
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(topups)
	common.ApiSuccess(c, pageInfo)
}

// GetAllTopUps 管理员获取全平台充值记录
func GetAllTopUps(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")

	var (
		topups []*model.TopUp
		total  int64
		err    error
	)
	if keyword != "" {
		topups, total, err = model.SearchAllTopUps(keyword, pageInfo)
	} else {
		topups, total, err = model.GetAllTopUps(pageInfo)
	}
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(topups)
	common.ApiSuccess(c, pageInfo)
}

type AdminCompleteTopupRequest struct {
	TradeNo string `json:"trade_no"`
}

// AdminCompleteTopUp 管理员补单接口
func AdminCompleteTopUp(c *gin.Context) {
	var req AdminCompleteTopupRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.TradeNo == "" {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	// 订单级互斥，防止并发补单
	LockOrder(req.TradeNo)
	defer UnlockOrder(req.TradeNo)

	if err := model.ManualCompleteTopUp(req.TradeNo); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

// GetPendingReviewTopUps 管理员查询 pending_review 订单列表（分页）。
func GetPendingReviewTopUps(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	topups, total, err := model.GetPendingReviewTopUps(pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(topups)
	common.ApiSuccess(c, pageInfo)
}

type AdminReviewTopUpRequest struct {
	TradeNo string `json:"trade_no"`
	Reason  string `json:"reason"`
}

// ApprovePendingReviewTopUp 审核通过：置 success + 增加 quota。
// 通过 LockOrder 防止并发审核与并发回调互相覆盖。
func ApprovePendingReviewTopUp(c *gin.Context) {
	var req AdminReviewTopUpRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.TradeNo == "" {
		common.ApiErrorMsg(c, "参数错误")
		return
	}
	adminID := c.GetInt("id")

	LockOrder(req.TradeNo)
	defer UnlockOrder(req.TradeNo)

	zl := logger.L().With(
		zap.String("handler", "ApprovePendingReviewTopUp"),
		zap.Int("admin_id", adminID),
		zap.String("trade_no", req.TradeNo),
	)

	if err := model.ApprovePendingReviewTopUp(req.TradeNo); err != nil {
		zl.Error("approve pending review topup failed", zap.Error(err))
		common.ApiError(c, err)
		return
	}
	zl.Info("topup approved by admin")
	common.ApiSuccess(c, nil)
}

// RejectPendingReviewTopUp 审核拒绝：置 rejected，不加 quota，不退款。
// reason 是管理员填写的原因，会写入用户可见的日志。
func RejectPendingReviewTopUp(c *gin.Context) {
	var req AdminReviewTopUpRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.TradeNo == "" {
		common.ApiErrorMsg(c, "参数错误")
		return
	}
	adminID := c.GetInt("id")

	LockOrder(req.TradeNo)
	defer UnlockOrder(req.TradeNo)

	zl := logger.L().With(
		zap.String("handler", "RejectPendingReviewTopUp"),
		zap.Int("admin_id", adminID),
		zap.String("trade_no", req.TradeNo),
		zap.String("reason", req.Reason),
	)

	if err := model.RejectPendingReviewTopUp(req.TradeNo, req.Reason); err != nil {
		zl.Error("reject pending review topup failed", zap.Error(err))
		common.ApiError(c, err)
		return
	}
	zl.Info("topup rejected by admin")
	common.ApiSuccess(c, nil)
}

