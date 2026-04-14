package controller

import (
	"bytes"
	"fmt"
	"io"
	"math"
	"net/http"
	"time"

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
	CreatedAt     int64   `json:"created_at"`
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

	query := model.DB.Model(&model.User{}).Select("id, username, solana_address, created_at")
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
			CreatedAt:     u.CreatedAt,
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

	// Get operator info
	operatorId := c.GetInt("id")
	operatorName := c.GetString("username")

	// Build log entry
	logEntry := &model.TreasuryLog{
		OperatorId:   operatorId,
		Operator:     operatorName,
		Action:       "transfer_to_user",
		TargetUser:   user.Username,
		TargetUserId: user.Id,
		FromAddress:  setting.OpenfortTreasuryAddress,
		ToAddress:    user.SolanaAddress,
		Amount:       req.Amount,
		Status:       "pending",
	}

	if err := service.TransferSOLFromTreasury(user.SolanaAddress, req.Amount); err != nil {
		logEntry.Status = "failed"
		logEntry.Remark = err.Error()
		_ = logEntry.Insert()
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("transfer failed: %v", err),
		})
		return
	}

	logEntry.Status = "success"
	_ = logEntry.Insert()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "transfer successful",
	})
}

// GetTreasuryLogs returns treasury operation logs (last 90 days).
// Admin endpoint: GET /api/treasury/logs
func GetTreasuryLogs(c *gin.Context) {
	userIdStr := c.Query("user_id")
	var logs []model.TreasuryLog
	var err error
	if userIdStr != "" {
		userId := 0
		fmt.Sscanf(userIdStr, "%d", &userId)
		logs, err = model.GetTreasuryLogsByUserId(userId, 90, 200)
	} else {
		logs, err = model.GetTreasuryLogs(90, 200)
	}
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("failed to get logs: %v", err),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    logs,
	})
}

// getSolanaRPCURL returns the Solana RPC endpoint for the configured cluster.
func getSolanaRPCURL() string {
	switch setting.OpenfortSolanaCluster {
	case "mainnet", "mainnet-beta":
		return "https://api.mainnet-beta.solana.com"
	case "testnet":
		return "https://api.testnet.solana.com"
	default:
		return "https://api.devnet.solana.com"
	}
}

type solanaAccountKey struct {
	Pubkey string `json:"pubkey"`
}

type solanaSignature struct {
	Signature string  `json:"signature"`
	Slot      uint64  `json:"slot"`
	BlockTime *int64  `json:"blockTime"`
	Err       any     `json:"err"`
	Memo      *string `json:"memo"`
}

type solanaTransactionItem struct {
	Signature string  `json:"signature"`
	BlockTime *int64  `json:"block_time"`
	From      string  `json:"from"`
	To        string  `json:"to"`
	Amount    float64 `json:"amount"`
	Status    string  `json:"status"`
}

// GetAddressTransactions queries Solana RPC for recent transactions of a given address.
// Admin endpoint: GET /api/treasury/transactions?address=xxx
func GetAddressTransactions(c *gin.Context) {
	address := c.Query("address")
	if address == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "address is required"})
		return
	}

	items, err := fetchSolanaTransactions(address)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": fmt.Sprintf("failed to fetch transactions: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

// GetMyTransactions queries Solana RPC for recent transactions of the current user's wallet.
// User endpoint: GET /api/user/wallet/transactions
func GetMyTransactions(c *gin.Context) {
	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, false)
	if err != nil || user.SolanaAddress == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "wallet not found"})
		return
	}

	items, err := fetchSolanaTransactions(user.SolanaAddress)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": fmt.Sprintf("failed to fetch transactions: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

// fetchSolanaTransactions fetches the last 3 months of SOL transfer transactions for an address.
func fetchSolanaTransactions(address string) ([]solanaTransactionItem, error) {
	rpcURL := getSolanaRPCURL()

	// Step 1: getSignaturesForAddress (last 3 months, max 50 results)
	threeMonthsAgo := time.Now().AddDate(0, -3, 0).Unix()
	sigReq := solanaRPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "getSignaturesForAddress",
		Params: []any{
			address,
			map[string]any{"limit": 50},
		},
	}
	sigBody, err := common.Marshal(sigReq)
	if err != nil {
		return nil, fmt.Errorf("marshal signatures request: %w", err)
	}

	resp, err := http.Post(rpcURL, "application/json", bytes.NewReader(sigBody))
	if err != nil {
		return nil, fmt.Errorf("signatures RPC call: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	var sigResp struct {
		Result []solanaSignature `json:"result"`
		Error  *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := common.Unmarshal(respBody, &sigResp); err != nil {
		return nil, fmt.Errorf("parse signatures response: %w", err)
	}
	if sigResp.Error != nil {
		return nil, fmt.Errorf("RPC error: %s", sigResp.Error.Message)
	}

	// Filter by time (last 3 months)
	var sigs []solanaSignature
	for _, sig := range sigResp.Result {
		if sig.BlockTime != nil && *sig.BlockTime >= threeMonthsAgo {
			sigs = append(sigs, sig)
		}
	}

	if len(sigs) == 0 {
		return []solanaTransactionItem{}, nil
	}

	// Step 2: getTransaction for each signature to extract transfer details
	items := make([]solanaTransactionItem, 0, len(sigs))
	for _, sig := range sigs {
		item := parseSolanaTransaction(rpcURL, sig, address)
		if item != nil {
			items = append(items, *item)
		}
	}

	return items, nil
}

// parseSolanaTransaction fetches and parses a single transaction to extract SOL transfer info.
func parseSolanaTransaction(rpcURL string, sig solanaSignature, ownerAddress string) *solanaTransactionItem {
	txReq := solanaRPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "getTransaction",
		Params: []any{
			sig.Signature,
			map[string]any{
				"encoding":                       "jsonParsed",
				"maxSupportedTransactionVersion": 0,
			},
		},
	}
	txBody, err := common.Marshal(txReq)
	if err != nil {
		return nil
	}

	resp, err := http.Post(rpcURL, "application/json", bytes.NewReader(txBody))
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	var txResp struct {
		Result *struct {
			Meta *struct {
				Err            any      `json:"err"`
				PreBalances    []uint64 `json:"preBalances"`
				PostBalances   []uint64 `json:"postBalances"`
			} `json:"meta"`
			Transaction struct {
				Message struct {
					AccountKeys []solanaAccountKey `json:"accountKeys"`
				} `json:"message"`
			} `json:"transaction"`
		} `json:"result"`
	}
	if err := common.Unmarshal(respBody, &txResp); err != nil || txResp.Result == nil || txResp.Result.Meta == nil {
		return nil
	}

	tx := txResp.Result
	meta := tx.Meta
	accountKeys := tx.Transaction.Message.AccountKeys

	status := "success"
	if sig.Err != nil || meta.Err != nil {
		status = "failed"
	}

	// Find the owner's index and determine direction + counterparty
	ownerIdx := -1
	for i, ak := range accountKeys {
		if ak.Pubkey == ownerAddress {
			ownerIdx = i
			break
		}
	}
	if ownerIdx < 0 || ownerIdx >= len(meta.PreBalances) || ownerIdx >= len(meta.PostBalances) {
		return nil
	}

	// Calculate balance change in lamports (post - pre)
	preBal := meta.PreBalances[ownerIdx]
	postBal := meta.PostBalances[ownerIdx]
	var diffLamports int64
	if postBal >= preBal {
		diffLamports = int64(postBal - preBal)
	} else {
		diffLamports = -int64(preBal - postBal)
	}

	if diffLamports == 0 {
		return nil
	}

	amountSOL := math.Abs(float64(diffLamports)) / 1e9
	from := ""
	to := ""

	if diffLamports > 0 {
		// Received SOL
		to = ownerAddress
		// Find sender: the account with the largest balance decrease
		from = findCounterparty(accountKeys, meta.PreBalances, meta.PostBalances, ownerIdx, true)
	} else {
		// Sent SOL
		from = ownerAddress
		// Find receiver: the account with the largest balance increase
		to = findCounterparty(accountKeys, meta.PreBalances, meta.PostBalances, ownerIdx, false)
	}

	return &solanaTransactionItem{
		Signature: sig.Signature,
		BlockTime: sig.BlockTime,
		From:      from,
		To:        to,
		Amount:    amountSOL,
		Status:    status,
	}
}

// findCounterparty finds the most likely counterparty in a transaction.
// If looking for sender (owner received), find the account with biggest decrease.
// If looking for receiver (owner sent), find the account with biggest increase.
func findCounterparty(accountKeys []solanaAccountKey, pre, post []uint64, skipIdx int, findDecreaser bool) string {
	bestIdx := -1
	var bestDiff int64

	for i := range accountKeys {
		if i == skipIdx || i >= len(pre) || i >= len(post) {
			continue
		}
		var diff int64
		if findDecreaser {
			// looking for who decreased the most
			if pre[i] > post[i] {
				diff = int64(pre[i] - post[i])
			}
		} else {
			// looking for who increased the most
			if post[i] > pre[i] {
				diff = int64(post[i] - pre[i])
			}
		}
		if diff > bestDiff {
			bestDiff = diff
			bestIdx = i
		}
	}

	if bestIdx >= 0 {
		return accountKeys[bestIdx].Pubkey
	}
	return ""
}
