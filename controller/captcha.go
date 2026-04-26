package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"net/http"
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
