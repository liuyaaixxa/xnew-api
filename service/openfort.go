package service

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
)

const openfortBaseURL = "https://api.openfort.xyz"

// CreateOpenfortWallet creates an Openfort player with a pre-generated
// Solana embedded wallet for the given user. It is safe to call from a
// goroutine — errors are logged but never returned to the caller.
func CreateOpenfortWallet(userId int) {
	if setting.OpenfortApiKey == "" {
		return // Openfort not configured, skip silently
	}

	user, err := model.GetUserById(userId, false)
	if err != nil {
		common.SysError(fmt.Sprintf("openfort: failed to get user %d: %v", userId, err))
		return
	}

	// Skip if wallet already exists
	if user.OpenfortPlayerId != "" {
		return
	}

	// Create player with pre-generated embedded account
	playerId, solanaAddress, err := createPlayerWithWallet(fmt.Sprintf("%d", userId))
	if err != nil {
		common.SysError(fmt.Sprintf("openfort: failed to create wallet for user %d: %v", userId, err))
		return
	}

	// Update user record
	err = model.DB.Model(&model.User{}).Where("id = ?", userId).Updates(map[string]interface{}{
		"openfort_player_id": playerId,
		"solana_address":     solanaAddress,
	}).Error
	if err != nil {
		common.SysError(fmt.Sprintf("openfort: failed to save wallet for user %d: %v", userId, err))
		return
	}

	common.SysLog(fmt.Sprintf("openfort: created wallet for user %d, player=%s, address=%s", userId, playerId, solanaAddress))
}

func createPlayerWithWallet(thirdPartyUserId string) (playerId string, address string, err error) {
	form := url.Values{}
	form.Set("thirdPartyUserId", thirdPartyUserId)
	form.Set("preGenerateEmbeddedAccount", "true")

	req, err := http.NewRequest("POST", openfortBaseURL+"/iam/v1/players", strings.NewReader(form.Encode()))
	if err != nil {
		return "", "", fmt.Errorf("build request: %w", err)
	}
	req.SetBasicAuth(setting.OpenfortApiKey, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", "", fmt.Errorf("openfort API returned %d: %s", resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	if err := common.Unmarshal(body, &result); err != nil {
		return "", "", fmt.Errorf("parse response: %w", err)
	}

	id, _ := result["id"].(string)
	if id == "" {
		return "", "", fmt.Errorf("no player id in response: %s", string(body))
	}

	addr := extractSolanaAddress(result)

	return id, addr, nil
}

func extractSolanaAddress(result map[string]interface{}) string {
	// Try accounts array first
	if accounts, ok := result["accounts"].([]interface{}); ok {
		for _, acc := range accounts {
			if accMap, ok := acc.(map[string]interface{}); ok {
				if addr, ok := accMap["address"].(string); ok && addr != "" {
					return addr
				}
			}
		}
	}
	// Try linkedAccounts
	if linked, ok := result["linkedAccounts"].([]interface{}); ok {
		for _, la := range linked {
			if laMap, ok := la.(map[string]interface{}); ok {
				if addr, ok := laMap["address"].(string); ok && addr != "" {
					return addr
				}
			}
		}
	}
	return ""
}
