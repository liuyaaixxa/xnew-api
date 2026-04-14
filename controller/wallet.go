package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
)

func GetWallet(c *gin.Context) {
	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to get user",
		})
		return
	}

	status := "not_created"
	if user.OpenfortPlayerId != "" && user.SolanaAddress != "" {
		status = "created"
	} else if user.OpenfortPlayerId != "" {
		status = "creating"
	}

	// Query on-chain balance if wallet exists
	var balanceSOL float64
	if user.SolanaAddress != "" {
		cluster := setting.OpenfortSolanaCluster
		var rpcURL string
		switch cluster {
		case "mainnet", "mainnet-beta":
			rpcURL = "https://api.mainnet-beta.solana.com"
		case "testnet":
			rpcURL = "https://api.testnet.solana.com"
		default:
			rpcURL = "https://api.devnet.solana.com"
		}
		balanceSOL = getSolanaBalance(rpcURL, user.SolanaAddress)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"openfort_player_id": user.OpenfortPlayerId,
			"solana_address":     user.SolanaAddress,
			"status":             status,
			"enabled":            setting.OpenfortApiKey != "",
			"balance":            balanceSOL,
			"cluster":            setting.OpenfortSolanaCluster,
		},
	})
}

func CreateWallet(c *gin.Context) {
	if setting.OpenfortApiKey == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Openfort is not configured",
		})
		return
	}

	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to get user",
		})
		return
	}

	if user.OpenfortPlayerId != "" && user.SolanaAddress != "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "wallet already exists",
		})
		return
	}

	// Synchronous creation for manual trigger
	service.CreateOpenfortWallet(userId)

	// Re-fetch to get updated data
	user, _ = model.GetUserById(userId, false)
	status := "not_created"
	if user.OpenfortPlayerId != "" && user.SolanaAddress != "" {
		status = "created"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": status == "created",
		"message": map[bool]string{true: "wallet created", false: "wallet creation failed"}[status == "created"],
		"data": gin.H{
			"openfort_player_id": user.OpenfortPlayerId,
			"solana_address":     user.SolanaAddress,
			"status":             status,
		},
	})
}
