package controller

import (
	"bytes"
	"fmt"
	"io"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
)

type solanaRPCRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  []any  `json:"params"`
}

type solanaRPCResponse struct {
	Result struct {
		Value uint64 `json:"value"`
	} `json:"result"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func GetTreasuryInfo(c *gin.Context) {
	address := setting.OpenfortTreasuryAddress
	cluster := setting.OpenfortSolanaCluster

	if address == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "treasury address not configured",
		})
		return
	}

	// Build Solana RPC URL
	var rpcURL string
	switch cluster {
	case "mainnet", "mainnet-beta":
		rpcURL = "https://api.mainnet-beta.solana.com"
	case "testnet":
		rpcURL = "https://api.testnet.solana.com"
	default:
		rpcURL = "https://api.devnet.solana.com"
	}

	// Call Solana RPC getBalance
	reqBody := solanaRPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "getBalance",
		Params:  []any{address},
	}
	bodyBytes, err := common.Marshal(reqBody)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to build RPC request",
		})
		return
	}

	resp, err := http.Post(rpcURL, "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("failed to call Solana RPC: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to read Solana RPC response",
		})
		return
	}

	var rpcResp solanaRPCResponse
	if err := common.Unmarshal(respBody, &rpcResp); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "failed to parse Solana RPC response",
		})
		return
	}

	if rpcResp.Error != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("Solana RPC error: %s", rpcResp.Error.Message),
		})
		return
	}

	// Convert lamports to SOL (1 SOL = 1e9 lamports)
	balanceSOL := float64(rpcResp.Result.Value) / 1e9

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"address": address,
			"balance": balanceSOL,
			"cluster": cluster,
		},
	})
}

type treasuryUserItem struct {
	ID            int     `json:"id"`
	Username      string  `json:"username"`
	SolanaAddress string  `json:"solana_address"`
	Balance       float64 `json:"balance"`
}

// getSolanaBalance queries the Solana RPC for the balance of the given address.
// Returns the balance in SOL (lamports / 1e9). Returns 0 on any error.
func getSolanaBalance(rpcURL, address string) float64 {
	reqBody := solanaRPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "getBalance",
		Params:  []any{address},
	}
	bodyBytes, err := common.Marshal(reqBody)
	if err != nil {
		return 0
	}

	resp, err := http.Post(rpcURL, "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		return 0
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0
	}

	var rpcResp solanaRPCResponse
	if err := common.Unmarshal(respBody, &rpcResp); err != nil {
		return 0
	}

	if rpcResp.Error != nil {
		return 0
	}

	return float64(rpcResp.Result.Value) / 1e9
}

func GetTreasuryUsers(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)

	walletStatus := c.Query("wallet_status")

	var users []model.User
	var total int64

	query := model.DB.Model(&model.User{}).Select("id, username, solana_address")
	if walletStatus == "has_wallet" {
		query = query.Where("solana_address != ''")
	}

	// Count total
	query.Count(&total)

	// Fetch page
	query.Order("id desc").
		Limit(pageInfo.GetPageSize()).
		Offset(pageInfo.GetStartIdx()).
		Find(&users)

	// Build Solana RPC URL
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

	// Build result items with balances
	items := make([]treasuryUserItem, 0, len(users))
	for _, u := range users {
		item := treasuryUserItem{
			ID:            u.Id,
			Username:      u.Username,
			SolanaAddress: u.SolanaAddress,
		}
		if u.SolanaAddress != "" {
			item.Balance = getSolanaBalance(rpcURL, u.SolanaAddress)
		}
		items = append(items, item)
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

type transferRequest struct {
	UserID int     `json:"user_id"`
	Amount float64 `json:"amount"`
}

func TransferToUser(c *gin.Context) {
	var req transferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("invalid request: %v", err),
		})
		return
	}

	if req.Amount <= 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "amount must be greater than 0",
		})
		return
	}

	user, err := model.GetUserById(req.UserID, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("user not found: %v", err),
		})
		return
	}

	if user.SolanaAddress == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "user does not have a wallet",
		})
		return
	}

	if err := service.TransferSOLFromTreasury(user.SolanaAddress, req.Amount); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("transfer failed: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "transfer successful",
	})
}
