package controller

import (
	"bytes"
	"fmt"
	"io"
	"net/http"

	"github.com/QuantumNous/new-api/common"
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
