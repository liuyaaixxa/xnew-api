/**
此文件为旧版支付设置文件，如需增加新的参数、变量等，请在 payment_setting.go 中添加
This file is the old version of the payment settings file. If you need to add new parameters, variables, etc., please add them in payment_setting.go
*/

package operation_setting

import (
	"github.com/QuantumNous/new-api/common"
)

var PayAddress = ""
var CustomCallbackAddress = ""
var EpayId = ""
var EpayKey = ""
var Price = 7.3
var MinTopUp = 1
var USDExchangeRate = 7.3

// EpayCallbackAllowedIPs — 易支付回调来源 IP 白名单（逗号分隔，支持 CIDR）。
// 空字符串 = 不做 IP 校验（向后兼容）。例：
//   "150.158.151.80,203.0.113.5" 或 "150.158.0.0/16"
var EpayCallbackAllowedIPs = ""

// EpayCallbackMaxOrderAgeSeconds — 回调到达时订单的最大年龄（秒）。
// 超过则视为重放攻击拒绝。0 = 不做时效校验（向后兼容）。
var EpayCallbackMaxOrderAgeSeconds = 0

// EpayAutoTopUpThreshold — 自动到账金额上限（单位：同 top_ups.money，即充值美元数）。
// 超过此值的订单进入 pending_review 状态，需管理员人工审核。
// 0 = 不做阈值校验（向后兼容）。
var EpayAutoTopUpThreshold float64 = 0

var PayMethods = []map[string]string{
	{
		"name":  "支付宝",
		"color": "rgba(var(--semi-blue-5), 1)",
		"type":  "alipay",
	},
	{
		"name":  "微信",
		"color": "rgba(var(--semi-green-5), 1)",
		"type":  "wxpay",
	},
	{
		"name":      "自定义1",
		"color":     "black",
		"type":      "custom1",
		"min_topup": "50",
	},
}

func UpdatePayMethodsByJsonString(jsonString string) error {
	PayMethods = make([]map[string]string, 0)
	return common.Unmarshal([]byte(jsonString), &PayMethods)
}

func PayMethods2JsonString() string {
	jsonBytes, err := common.Marshal(PayMethods)
	if err != nil {
		return "[]"
	}
	return string(jsonBytes)
}

func ContainsPayMethod(method string) bool {
	for _, payMethod := range PayMethods {
		if payMethod["type"] == method {
			return true
		}
	}
	return false
}
