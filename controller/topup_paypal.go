package controller

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// PaymentMethodPayPal PayPal 支付方式常量
const PaymentMethodPayPal = "paypal"

// RequestPayPalPay 发起 PayPal 支付
func RequestPayPalPay(c *gin.Context) {
	userId := c.GetInt("id")
	if userId == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未登录",
		})
		return
	}

	if !setting.PayPalEnabled() {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "PayPal 支付未启用",
		})
		return
	}

	var req struct {
		Amount int `json:"amount" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "参数错误",
		})
		return
	}

	// 检查最小充值金额
	if req.Amount < setting.PayPalMinTopUp {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("充值金额不能小于 %d 美元", setting.PayPalMinTopUp),
		})
		return
	}

	// PayPal 本身就是美元结算，直接使用充值数量作为美元金额，不做汇率转换
	payMoney := float64(req.Amount)

	// 生成订单号
	tradeNo := fmt.Sprintf("PP%d%s%d", userId, uuid.New().String()[:8], time.Now().UnixMilli())

	// 计算 Amount（根据 QuotaDisplayType）
	amount := int64(req.Amount)
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount := decimal.NewFromInt(int64(amount))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		amount = dAmount.Div(dQuotaPerUnit).IntPart()
	}

	// 创建 TopUp 订单
	topUp := &model.TopUp{
		UserId:        userId,
		Amount:        amount,
		Money:         payMoney,
		TradeNo:       tradeNo,
		PaymentMethod:   "paypal",
		PaymentProvider: model.PaymentProviderPayPal,
		Status:          common.TopUpStatusPending,
		CreateTime:    time.Now().Unix(),
	}
	if err := topUp.Insert(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "创建订单失败",
		})
		return
	}

	// 构建带 return_url 的跳转链接
	returnUrl := system_setting.ServerAddress + "/api/paypal/return"
	cancelUrl := system_setting.ServerAddress + "/api/paypal/cancel"

	// 创建 PayPal Order（传入 return_url 和 cancel_url）
	orderResp, err := setting.CreatePayPalOrder(payMoney, tradeNo, fmt.Sprintf("充值 %d 美元", req.Amount), returnUrl, cancelUrl)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("创建 PayPal Order 失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "创建 PayPal 支付失败",
		})
		return
	}

	// 获取 approval URL
	var approvalUrl string
	for _, link := range orderResp.Links {
		if link.Rel == "approve" {
			approvalUrl = link.Href
			break
		}
	}

	if approvalUrl == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取支付链接失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"payment_url": approvalUrl,
			"order_id":    orderResp.Id,
			"trade_no":    tradeNo,
		},
	})
}

// PayPalWebhook PayPal 回调处理
func PayPalWebhook(c *gin.Context) {
	// 读取请求体
	body, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "读取请求体失败",
		})
		return
	}

	// 解析 webhook 事件
	var event PayPalWebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "解析事件失败",
		})
		return
	}

	// 处理不同事件类型
	switch event.EventType {
	case "CHECKOUT.ORDER.APPROVED":
		// 用户批准支付，需要捕获
		handlePayPalOrderApproved(c, event)
	case "CHECKOUT.ORDER.COMPLETED":
		// 支付完成，直接处理充值
		handlePayPalOrderCompleted(c, event)
	case "PAYMENT.CAPTURE.COMPLETED":
		// 捕获成功，处理充值
		handlePayPalCaptureCompleted(c, event)
	default:
		// 其他事件，记录日志
		logger.LogInfo(c, fmt.Sprintf("PayPal webhook event: %s", event.EventType))
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "事件已记录",
		})
	}
}

type PayPalWebhookEvent struct {
	EventType string                `json:"event_type"`
	Resource  PayPalWebhookResource `json:"resource"`
}

type PayPalWebhookResource struct {
	Id            string                       `json:"id"`
	Status        string                       `json:"status"`
	CustomId      string                       `json:"custom_id"`
	PurchaseUnits []PayPalPurchaseUnitResource `json:"purchase_units"`
}

type PayPalPurchaseUnitResource struct {
	CustomId string               `json:"custom_id"`
	Amount   PayPalAmountResource `json:"amount"`
}

type PayPalAmountResource struct {
	CurrencyCode string `json:"currency_code"`
	Value        string `json:"value"`
}

// 处理用户批准支付
func handlePayPalOrderApproved(c *gin.Context, event PayPalWebhookEvent) {
	orderId := event.Resource.Id

	// 捕获支付
	if err := setting.CapturePayPalOrder(orderId); err != nil {
		logger.LogError(c, fmt.Sprintf("PayPal 捕获支付失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "捕获支付失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "支付已捕获",
	})
}

// 处理支付完成
func handlePayPalOrderCompleted(c *gin.Context, event PayPalWebhookEvent) {
	// 获取 custom_id（即 trade_no）
	tradeNo := event.Resource.CustomId
	if tradeNo == "" && len(event.Resource.PurchaseUnits) > 0 {
		tradeNo = event.Resource.PurchaseUnits[0].CustomId
	}

	if tradeNo == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无法获取订单号",
		})
		return
	}

	// 加锁防止并发处理
	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	// 查询订单
	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "订单不存在",
		})
		return
	}

	// 检查订单状态
	if topUp.Status != common.TopUpStatusPending {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "订单已处理",
		})
		return
	}

	// 执行充值
	if err := RechargePayPal(tradeNo, event.Resource.Id); err != nil {
		logger.LogError(c, fmt.Sprintf("PayPal 充值失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "充值失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "充值成功",
	})
}

// 处理捕获成功
func handlePayPalCaptureCompleted(c *gin.Context, event PayPalWebhookEvent) {
	// 获取 custom_id
	tradeNo := event.Resource.CustomId
	if tradeNo == "" && len(event.Resource.PurchaseUnits) > 0 {
		tradeNo = event.Resource.PurchaseUnits[0].CustomId
	}

	if tradeNo == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无法获取订单号",
		})
		return
	}

	// 加锁
	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	// 查询订单
	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "订单不存在",
		})
		return
	}

	if topUp.Status != common.TopUpStatusPending {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "订单已处理",
		})
		return
	}

	// 执行充值
	if err := RechargePayPal(tradeNo, event.Resource.Id); err != nil {
		logger.LogError(c, fmt.Sprintf("PayPal 充值失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "充值失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "充值成功",
	})
}

// RechargePayPal PayPal 充值处理
func RechargePayPal(tradeNo string, orderId string) error {
	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil {
		return fmt.Errorf("订单不存在")
	}

	// 更新订单状态
	topUp.CompleteTime = time.Now().Unix()
	topUp.Status = common.TopUpStatusSuccess

	if err := topUp.Update(); err != nil {
		return err
	}

	// 增加用户余额（Amount × QuotaPerUnit = quota）
	dAmount := decimal.NewFromInt(topUp.Amount)
	dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
	quotaToAdd := int(dAmount.Mul(dQuotaPerUnit).IntPart())
	if err := model.IncreaseUserQuota(topUp.UserId, quotaToAdd, false); err != nil {
		return err
	}

	// 记录日志
	model.RecordLog(topUp.UserId, model.LogTypeTopup,
		fmt.Sprintf("PayPal 充值成功，订单号: %s，金额: %d", tradeNo, topUp.Amount))

	return nil
}

// PayPalReturn PayPal 支付成功返回页面处理
func PayPalReturn(c *gin.Context) {
	orderId := c.Query("token")
	if orderId == "" {
		orderId = c.Query("order_id")
	}

	if orderId == "" {
		c.Redirect(http.StatusFound, "/console/topup")
		return
	}

	// 先获取订单详情以获取 trade_no
	order, err := setting.GetPayPalOrder(orderId)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("PayPal 获取订单失败: %v", err))
		c.Redirect(http.StatusFound, "/console/topup?error=get_order_failed")
		return
	}

	// 捕获支付
	if err := setting.CapturePayPalOrder(orderId); err != nil {
		logger.LogError(c, fmt.Sprintf("PayPal 捕获支付失败: %v", err))
		c.Redirect(http.StatusFound, "/console/topup?error=capture_failed")
		return
	}

	// 从 custom_id 获取 trade_no 并执行充值/订阅处理
	tradeNo := ""
	if len(order.PurchaseUnits) > 0 {
		tradeNo = order.PurchaseUnits[0].CustomId
	}
	if tradeNo != "" {
		// 加锁防止并发处理
		LockOrder(tradeNo)
		defer UnlockOrder(tradeNo)

		// 根据 trade_no 前缀判断订单类型
		if strings.HasPrefix(tradeNo, "SUBPP") {
			// 订阅订单处理
			subOrder := model.GetSubscriptionOrderByTradeNo(tradeNo)
			if subOrder != nil && subOrder.Status == common.TopUpStatusPending {
				if err := model.CompleteSubscriptionOrder(tradeNo, orderId, model.PaymentProviderPayPal, ""); err != nil {
					logger.LogError(c, fmt.Sprintf("PayPal 订阅激活失败: %v", err))
				}
			}
		} else {
			// 充值订单处理
			topUp := model.GetTopUpByTradeNo(tradeNo)
			if topUp != nil && topUp.Status == common.TopUpStatusPending {
				if err := RechargePayPal(tradeNo, orderId); err != nil {
					logger.LogError(c, fmt.Sprintf("PayPal 充值处理失败: %v", err))
				}
			}
		}
	}

	// 重定向到充值历史页面（订阅成功也显示在这里）
	c.Redirect(http.StatusFound, "/console/topup?show_history=true&subscription_success=true")
}

// PayPalCancel PayPal 支付取消处理
func PayPalCancel(c *gin.Context) {
	orderId := c.Query("token")
	if orderId == "" {
		orderId = c.Query("order_id")
	}

	if orderId != "" {
		// 获取订单详情以获取 trade_no
		order, err := setting.GetPayPalOrder(orderId)
		if err == nil && order != nil && len(order.PurchaseUnits) > 0 {
			tradeNo := order.PurchaseUnits[0].CustomId
			if tradeNo != "" {
				// 根据 trade_no 前缀判断订单类型
				if strings.HasPrefix(tradeNo, "SUBPP") {
					// 订阅订单取消
					subOrder := model.GetSubscriptionOrderByTradeNo(tradeNo)
					if subOrder != nil && subOrder.Status == common.TopUpStatusPending {
						subOrder.Status = common.TopUpStatusExpired
						subOrder.Update()
					}
				} else {
					// 充值订单取消
					topUp := model.GetTopUpByTradeNo(tradeNo)
					if topUp != nil && topUp.Status == common.TopUpStatusPending {
						topUp.Status = common.TopUpStatusExpired
						topUp.Update()
					}
				}
			}
		}
	}

	c.Redirect(http.StatusFound, "/console/topup")
}