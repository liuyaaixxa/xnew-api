package middleware

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type turnstileCheckResponse struct {
	Success bool `json:"success"`
}

// TurnstileCheck is kept as an alias for backward compatibility.
var TurnstileCheck = CaptchaCheck

func CaptchaCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		provider := common.CaptchaProvider

		switch provider {
		case "disabled":
			c.Next()
			return
		case "builtin":
			checkBuiltinCaptcha(c)
			return
		case "slide":
			checkSlideCaptcha(c)
			return
		case "turnstile":
			checkTurnstile(c)
			return
		default:
			// Empty string: backward compatible — use old TurnstileCheckEnabled
			if common.TurnstileCheckEnabled {
				checkTurnstile(c)
				return
			}
			c.Next()
		}
	}
}

func checkBuiltinCaptcha(c *gin.Context) {
	session := sessions.Default(c)
	if session.Get("turnstile") != nil {
		c.Next()
		return
	}

	captchaID := c.Query("captcha_id")
	if captchaID == "" {
		captchaID = c.PostForm("captcha_id")
	}
	captchaValue := c.Query("captcha_value")
	if captchaValue == "" {
		captchaValue = c.PostForm("captcha_value")
	}

	if captchaID == "" || captchaValue == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "请完成人机校验",
		})
		c.Abort()
		return
	}

	valid, reason := common.VerifyCaptcha(captchaID, captchaValue)
	if !valid {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": reason,
		})
		c.Abort()
		return
	}

	session.Set("turnstile", true)
	if err := session.Save(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无法保存会话信息，请重试",
		})
		c.Abort()
		return
	}
	c.Next()
}

func checkTurnstile(c *gin.Context) {
	session := sessions.Default(c)
	if session.Get("turnstile") != nil {
		c.Next()
		return
	}

	response := c.Query("turnstile")
	if response == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Turnstile token 为空",
		})
		c.Abort()
		return
	}
	rawRes, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", url.Values{
		"secret":   {common.TurnstileSecretKey},
		"response": {response},
		"remoteip": {c.ClientIP()},
	})
	if err != nil {
		common.SysLog(err.Error())
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		c.Abort()
		return
	}
	defer rawRes.Body.Close()
	var res turnstileCheckResponse
	err = json.NewDecoder(rawRes.Body).Decode(&res)
	if err != nil {
		common.SysLog(err.Error())
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		c.Abort()
		return
	}
	if !res.Success {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Turnstile 校验失败，请刷新重试！",
		})
		c.Abort()
		return
	}
	session.Set("turnstile", true)
	if err := session.Save(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无法保存会话信息，请重试",
		})
		c.Abort()
		return
	}
	c.Next()
}

func checkSlideCaptcha(c *gin.Context) {
	session := sessions.Default(c)
	if session.Get("turnstile") != nil {
		c.Next()
		return
	}

	captchaID := c.Query("captcha_id")
	if captchaID == "" {
		captchaID = c.PostForm("captcha_id")
	}
	pointXStr := c.Query("point_x")
	if pointXStr == "" {
		pointXStr = c.PostForm("point_x")
	}
	pointYStr := c.Query("point_y")
	if pointYStr == "" {
		pointYStr = c.PostForm("point_y")
	}

	pointX, _ := strconv.Atoi(pointXStr)
	pointY, _ := strconv.Atoi(pointYStr)

	valid, reason := common.VerifySlideCaptcha(captchaID, pointX, pointY)
	if !valid {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": reason,
		})
		c.Abort()
		return
	}

	session.Set("turnstile", true)
	if err := session.Save(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无法保存会话信息，请重试",
		})
		c.Abort()
		return
	}
	c.Next()
}
