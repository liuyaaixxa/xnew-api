package controller

import (
	"fmt"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SubscriptionPayPalPayRequest struct {
	PlanId int `json:"plan_id"`
}

func SubscriptionRequestPayPalPay(c *gin.Context) {
	var req SubscriptionPayPalPayRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	// 检查 PayPal 是否启用
	if !setting.PayPalEnabled() {
		common.ApiErrorMsg(c, "PayPal 未配置或未启用")
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

	// 生成订单号
	tradeNo := fmt.Sprintf("SUBPP%d%s%d", userId, uuid.New().String()[:8], time.Now().UnixMilli())

	// 创建订阅订单
	order := &model.SubscriptionOrder{
		UserId:        userId,
		PlanId:        plan.Id,
		Money:         plan.PriceAmount,
		TradeNo:       tradeNo,
		PaymentMethod: PaymentMethodPayPal,
		CreateTime:    time.Now().Unix(),
		Status:        common.TopUpStatusPending,
	}
	if err := order.Insert(); err != nil {
		common.ApiErrorMsg(c, "创建订单失败")
		return
	}

	// 构建回调地址（统一使用 PayPal 充值的回调路径，在回调函数中根据订单类型分发）
	returnUrl := system_setting.ServerAddress + "/api/paypal/return"
	cancelUrl := system_setting.ServerAddress + "/api/paypal/cancel"

	// 创建 PayPal Order
	orderResp, err := setting.CreatePayPalOrder(plan.PriceAmount, tradeNo, fmt.Sprintf("订阅套餐: %s", plan.Title), returnUrl, cancelUrl)
	if err != nil {
		common.ApiErrorMsg(c, "创建 PayPal 支付失败")
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
		common.ApiErrorMsg(c, "获取支付链接失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"payment_url": approvalUrl,
			"order_id":    orderResp.Id,
			"trade_no":    tradeNo,
		},
	})
}

// SubscriptionPayPalReturn PayPal 订阅支付成功返回
func SubscriptionPayPalReturn(c *gin.Context) {
	orderId := c.Query("token")
	if orderId == "" {
		orderId = c.Query("order_id")
	}

	if orderId == "" {
		c.Redirect(http.StatusFound, "/console/topup?error=no_order_id")
		return
	}

	// 获取订单详情
	order, err := setting.GetPayPalOrder(orderId)
	if err != nil {
		c.Redirect(http.StatusFound, "/console/topup?error=get_order_failed")
		return
	}

	// 捕获支付
	if err := setting.CapturePayPalOrder(orderId); err != nil {
		c.Redirect(http.StatusFound, "/console/topup?error=capture_failed")
		return
	}

	// 从 custom_id 获取 trade_no
	tradeNo := ""
	if len(order.PurchaseUnits) > 0 {
		tradeNo = order.PurchaseUnits[0].CustomId
	}
	if tradeNo != "" {
		// 加锁防止并发处理
		LockOrder(tradeNo)
		defer UnlockOrder(tradeNo)

		// 检查订单状态并激活订阅
		subOrder := model.GetSubscriptionOrderByTradeNo(tradeNo)
		if subOrder != nil && subOrder.Status == common.TopUpStatusPending {
			// 调用已有的 CompleteSubscriptionOrder 函数
			if err := model.CompleteSubscriptionOrder(tradeNo, orderId); err != nil {
				// 记录错误日志但不阻塞用户
				fmt.Printf("PayPal 订阅激活失败: %v\n", err)
			}
		}
	}

	c.Redirect(http.StatusFound, "/console/topup?subscription_success=true")
}

// SubscriptionPayPalCancel PayPal 订阅支付取消
func SubscriptionPayPalCancel(c *gin.Context) {
	orderId := c.Query("token")
	if orderId == "" {
		orderId = c.Query("order_id")
	}

	if orderId != "" {
		order, err := setting.GetPayPalOrder(orderId)
		if err == nil && order != nil {
			tradeNo := ""
			if len(order.PurchaseUnits) > 0 {
				tradeNo = order.PurchaseUnits[0].CustomId
			}
			if tradeNo != "" {
				subOrder := model.GetSubscriptionOrderByTradeNo(tradeNo)
				if subOrder != nil && subOrder.Status == common.TopUpStatusPending {
					subOrder.Status = common.TopUpStatusExpired
					subOrder.Update()
				}
			}
		}
	}

	c.Redirect(http.StatusFound, "/console/topup")
}