package controller

import (
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

func GetCaptcha(c *gin.Context) {
	switch common.CaptchaProvider {
	case "slide":
		data, err := common.GenerateSlideCaptcha()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "failed to generate slide captcha",
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    data,
		})
	default:
		id, image, err := common.GenerateCaptcha()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "failed to generate captcha",
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"captcha_id":    id,
				"captcha_image": image,
			},
		})
	}
}

// VerifyCaptchaPreview validates a slide captcha attempt without consuming it.
// This lets the frontend show "verified" only when coordinates actually match,
// while still requiring the authoritative one-shot validation at login/register.
func VerifyCaptchaPreview(c *gin.Context) {
	if common.CaptchaProvider != "slide" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "当前验证码类型不支持预校验",
		})
		return
	}

	captchaID := c.Query("captcha_id")
	pointX, _ := strconv.Atoi(c.Query("point_x"))
	pointY, _ := strconv.Atoi(c.Query("point_y"))

	valid, reason := common.VerifySlideCaptchaPreview(captchaID, pointX, pointY)
	if !valid {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": reason,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
	})
}
