package router

import (
	"embed"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"

	"github.com/gin-gonic/gin"
)

func SetRouter(router *gin.Engine, buildFS embed.FS, indexPage []byte, inviteAssetFS embed.FS) {
	SetApiRouter(router)
	SetDashboardRouter(router)
	SetRelayRouter(router)
	SetVideoRouter(router)

	// Register invite page routes BEFORE WebRouter (which sets NoRoute handler)
	SetAffiliateInviteRouter(router, inviteAssetFS)

	frontendBaseUrl := os.Getenv("FRONTEND_BASE_URL")
	if common.IsMasterNode && frontendBaseUrl != "" {
		frontendBaseUrl = ""
		common.SysLog("FRONTEND_BASE_URL is ignored on master node")
	}
	if frontendBaseUrl == "" {
		SetWebRouter(router, buildFS, indexPage)
	} else {
		frontendBaseUrl = strings.TrimSuffix(frontendBaseUrl, "/")
		router.NoRoute(func(c *gin.Context) {
			c.Set(middleware.RouteTagKey, "web")
			c.Redirect(http.StatusMovedPermanently, fmt.Sprintf("%s%s", frontendBaseUrl, c.Request.RequestURI))
		})
	}
}

// SetAffiliateInviteRouter registers invite page routes. Must be called before SetWebRouter.
func SetAffiliateInviteRouter(router *gin.Engine, assetFS embed.FS) {
	// QR code JS asset — served via explicit route to avoid static middleware ordering issues
	router.GET("/invite/assets/*filepath", func(c *gin.Context) {
		filepath := c.Param("filepath")
		if len(filepath) > 0 && filepath[0] == '/' {
			filepath = filepath[1:]
		}
		data, err := assetFS.ReadFile("web/templates/assets/" + filepath)
		if err != nil {
			c.String(http.StatusNotFound, "not found")
			return
		}
		c.Header("Cache-Control", "public, max-age=86400")
		c.Data(http.StatusOK, "application/javascript; charset=utf-8", data)
	})

	// Versioned invite pages (v1, v2, v3)
	router.GET("/invite/:version", controller.GetVersionedInvitePage)

	// Default invite redirects to v1
	router.GET("/invite", controller.GetDefaultInvitePage)

	// 618 promotion activity page
	router.GET("/affiliate-618", controller.GetToken618Page)
}
