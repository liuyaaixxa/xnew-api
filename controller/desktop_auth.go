package controller

import (
	"net/http"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// desktopAuthCode represents a one-time authorization code for desktop app login.
type desktopAuthCode struct {
	UserID    int
	State     string
	ExpiresAt time.Time
}

var (
	desktopAuthCodes sync.Map // map[string]*desktopAuthCode (code → authCode)
)

func init() {
	// Cleanup expired codes every 60 seconds
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			now := time.Now()
			desktopAuthCodes.Range(func(key, value any) bool {
				if ac, ok := value.(*desktopAuthCode); ok && now.After(ac.ExpiresAt) {
					desktopAuthCodes.Delete(key)
				}
				return true
			})
		}
	}()
}

type DesktopAuthAuthorizeRequest struct {
	State string `json:"state" binding:"required"`
}

// DesktopAuthAuthorize generates a one-time authorization code for the desktop app.
// Requires UserAuth session (user must be logged in via browser).
func DesktopAuthAuthorize(c *gin.Context) {
	var req DesktopAuthAuthorizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "state is required")
		return
	}

	userID := c.GetInt("id")
	if userID == 0 {
		common.ApiErrorMsg(c, "user not found")
		return
	}

	code := common.GetRandomString(32)

	desktopAuthCodes.Store(code, &desktopAuthCode{
		UserID:    userID,
		State:     req.State,
		ExpiresAt: time.Now().Add(120 * time.Second),
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"code":  code,
			"state": req.State,
		},
	})
}

type DesktopAuthExchangeRequest struct {
	Code string `json:"code" binding:"required"`
}

// DesktopAuthExchange exchanges a one-time authorization code for an access token.
// No authentication required — the code itself proves the user authorized the request.
func DesktopAuthExchange(c *gin.Context) {
	var req DesktopAuthExchangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "code is required")
		return
	}

	value, ok := desktopAuthCodes.LoadAndDelete(req.Code)
	if !ok {
		common.ApiErrorMsg(c, "invalid or expired authorization code")
		return
	}

	ac := value.(*desktopAuthCode)
	if time.Now().After(ac.ExpiresAt) {
		common.ApiErrorMsg(c, "authorization code has expired")
		return
	}

	user, err := model.GetUserById(ac.UserID, true)
	if err != nil {
		common.ApiErrorMsg(c, "user not found")
		return
	}

	if user.Status != common.UserStatusEnabled {
		common.ApiErrorMsg(c, "user is disabled")
		return
	}

	// Generate access token if user doesn't have one
	if user.AccessToken == nil || *user.AccessToken == "" {
		randI := common.GetRandomInt(4)
		key, err := common.GenerateRandomKey(29 + randI)
		if err != nil {
			common.ApiErrorMsg(c, "failed to generate access token")
			return
		}
		user.SetAccessToken(key)
		if err := user.Update(false); err != nil {
			common.ApiErrorMsg(c, "failed to save access token")
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"access_token": *user.AccessToken,
			"user": gin.H{
				"id":           user.Id,
				"username":     user.Username,
				"display_name": user.DisplayName,
				"role":         user.Role,
			},
		},
	})
}
