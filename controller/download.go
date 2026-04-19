package controller

import (
	"fmt"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

var platformMap = map[string]string{
	"mac-arm64":             "Teniulink-Node-%s-arm64.dmg",
	"mac-x64":               "Teniulink-Node-%s-x64.dmg",
	"mac-arm64-zip":         "Teniulink-Node-%s-arm64.zip",
	"mac-x64-zip":           "Teniulink-Node-%s-x64.zip",
	"win-x64":               "Teniulink-Node-%s-x64-setup.exe",
	"win-x64-portable":      "Teniulink-Node-%s-x64-portable.exe",
	"win-arm64":             "Teniulink-Node-%s-arm64-setup.exe",
	"win-arm64-portable":    "Teniulink-Node-%s-arm64-portable.exe",
	"linux-amd64-deb":       "Teniulink-Node-%s-amd64.deb",
	"linux-arm64-deb":       "Teniulink-Node-%s-arm64.deb",
	"linux-aarch64-deb":     "Teniulink-Node-%s-aarch64.deb",
	"linux-x86_64-rpm":      "Teniulink-Node-%s-x86_64.rpm",
	"linux-aarch64-rpm":     "Teniulink-Node-%s-aarch64.rpm",
	"linux-x86_64-appimage": "Teniulink-Node-%s-x86_64.AppImage",
	"linux-arm64-appimage":  "Teniulink-Node-%s-arm64.AppImage",
}

const githubReleaseBase = "https://github.com/liuyaaixxa/teniulink-node-client/releases"

func DownloadRedirect(c *gin.Context) {
	platform := c.Param("platform")
	pattern, ok := platformMap[platform]
	if !ok {
		c.Redirect(http.StatusFound, githubReleaseBase+"/latest")
		return
	}
	version := common.TeniulinkNodeVersion
	filename := fmt.Sprintf(pattern, version)
	url := fmt.Sprintf("%s/download/v%s/%s", githubReleaseBase, version, filename)
	c.Redirect(http.StatusFound, url)
}
