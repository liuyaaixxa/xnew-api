package setting

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
)

// PayPal 配置参数
var (
	PayPalClientId     string // PayPal Client ID
	PayPalClientSecret string // PayPal Client Secret
	PayPalSandbox      bool   = false // 是否沙箱模式
	PayPalMinTopUp     int    = 1     // 最小充值金额（美元）
)

// PayPal API 端点
func GetPayPalApiBaseUrl() string {
	if PayPalSandbox {
		return "https://api-m.sandbox.paypal.com"
	}
	return "https://api-m.paypal.com"
}

// PayPal 是否启用
func PayPalEnabled() bool {
	return PayPalClientId != "" && PayPalClientSecret != ""
}

// PayPal OAuth2 Token 响应
type PayPalTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// PayPal Order 创建请求
type PayPalOrderRequest struct {
	Intent            string             `json:"intent"`
	PurchaseUnits     []PayPalPurchaseUnit `json:"purchase_units"`
	ApplicationContext *PayPalApplicationContext `json:"application_context,omitempty"`
}

type PayPalApplicationContext struct {
	ReturnUrl string `json:"return_url,omitempty"`
	CancelUrl string `json:"cancel_url,omitempty"`
}

type PayPalPurchaseUnit struct {
	Amount      PayPalAmount `json:"amount"`
	Description string       `json:"description"`
	CustomId    string       `json:"custom_id"`
}

type PayPalAmount struct {
	CurrencyCode string `json:"currency_code"`
	Value        string `json:"value"`
}

// PayPal Order 响应
type PayPalOrderResponse struct {
	Id            string        `json:"id"`
	Status        string        `json:"status"`
	Links         []PayPalLink  `json:"links"`
	PurchaseUnits []PayPalPurchaseUnitResponse `json:"purchase_units,omitempty"`
}

type PayPalPurchaseUnitResponse struct {
	CustomId string `json:"custom_id"`
	Amount   PayPalAmount `json:"amount"`
}

type PayPalLink struct {
	Href   string `json:"href"`
	Rel    string `json:"rel"`
	Method string `json:"method"`
}

// 缓存的 Access Token
var cachedPayPalToken string
var cachedPayPalTokenExpiry time.Time

// 获取 PayPal OAuth2 Access Token
func GetPayPalAccessToken() (string, error) {
	// 检查缓存的 token 是否有效
	if cachedPayPalToken != "" && time.Now().Before(cachedPayPalTokenExpiry) {
		return cachedPayPalToken, nil
	}

	apiUrl := GetPayPalApiBaseUrl() + "/v1/oauth2/token"

	// 构建请求
	data := url.Values{}
	data.Set("grant_type", "client_credentials")

	req, err := http.NewRequest("POST", apiUrl, strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}

	req.SetBasicAuth(PayPalClientId, PayPalClientSecret)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("PayPal OAuth failed: %s", string(body))
	}

	var tokenResp PayPalTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", err
	}

	// 缓存 token（提前 5 分钟过期）
	cachedPayPalToken = tokenResp.AccessToken
	cachedPayPalTokenExpiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn - 300) * time.Second)

	return tokenResp.AccessToken, nil
}

// CreatePayPalOrder 创建 PayPal Order
func CreatePayPalOrder(amount float64, customId string, description string, returnUrl string, cancelUrl string) (*PayPalOrderResponse, error) {
	token, err := GetPayPalAccessToken()
	if err != nil {
		return nil, err
	}

	apiUrl := GetPayPalApiBaseUrl() + "/v2/checkout/orders"

	// 构建订单请求
	orderReq := PayPalOrderRequest{
		Intent: "CAPTURE",
		PurchaseUnits: []PayPalPurchaseUnit{
			{
				Amount: PayPalAmount{
					CurrencyCode: "USD",
					Value:        fmt.Sprintf("%.2f", amount),
				},
				Description: description,
				CustomId:    customId,
			},
		},
	}

	// 设置 application_context（return_url 和 cancel_url）
	if returnUrl != "" || cancelUrl != "" {
		orderReq.ApplicationContext = &PayPalApplicationContext{
			ReturnUrl: returnUrl,
			CancelUrl: cancelUrl,
		}
	}

	body, err := json.Marshal(orderReq)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", apiUrl, strings.NewReader(string(body)))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 201 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("PayPal create order failed: %s", string(respBody))
	}

	var orderResp PayPalOrderResponse
	if err := json.NewDecoder(resp.Body).Decode(&orderResp); err != nil {
		return nil, err
	}

	return &orderResp, nil
}

// 捕获 PayPal Order
func CapturePayPalOrder(orderId string) error {
	token, err := GetPayPalAccessToken()
	if err != nil {
		return err
	}

	apiUrl := GetPayPalApiBaseUrl() + "/v2/checkout/orders/" + orderId + "/capture"

	req, err := http.NewRequest("POST", apiUrl, nil)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("PayPal capture failed: %s", string(respBody))
	}

	return nil
}

// 获取 PayPal Order 详情
func GetPayPalOrder(orderId string) (*PayPalOrderResponse, error) {
	token, err := GetPayPalAccessToken()
	if err != nil {
		return nil, err
	}

	apiUrl := GetPayPalApiBaseUrl() + "/v2/checkout/orders/" + orderId

	req, err := http.NewRequest("GET", apiUrl, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("PayPal get order failed: %s", string(respBody))
	}

	var orderResp PayPalOrderResponse
	if err := json.NewDecoder(resp.Body).Decode(&orderResp); err != nil {
		return nil, err
	}

	return &orderResp, nil
}

// PayPal 配置初始化（从 common.OptionMap 读取）
func InitPayPalConfig() {
	PayPalClientId = common.OptionMap["PayPalClientId"]
	PayPalClientSecret = common.OptionMap["PayPalClientSecret"]
	PayPalSandbox = common.OptionMap["PayPalSandbox"] == "true"
	minTopUpStr := common.OptionMap["PayPalMinTopUp"]
	if minTopUpStr != "" {
		val, err := strconv.Atoi(minTopUpStr)
		if err == nil && val > 0 {
			PayPalMinTopUp = val
		}
	}
}