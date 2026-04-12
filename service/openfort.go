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

const openfortBaseURL = "https://api.openfort.io"

// CreateOpenfortWallet creates an Openfort player with a pre-generated
// embedded wallet for the given user. It is safe to call from a
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

	// Step 1: Create player with pre-generated embedded account
	playerId, err := createPlayer(fmt.Sprintf("%d", userId))
	if err != nil {
		common.SysError(fmt.Sprintf("openfort: failed to create player for user %d: %v", userId, err))
		return
	}

	// Step 2: Fetch account address from accounts list
	address, err := fetchPlayerAccountAddress(playerId)
	if err != nil {
		common.SysError(fmt.Sprintf("openfort: player %s created but failed to get account for user %d: %v", playerId, userId, err))
	}

	// Update user record (save player ID even if address fetch failed)
	err = model.DB.Model(&model.User{}).Where("id = ?", userId).Updates(map[string]interface{}{
		"openfort_player_id": playerId,
		"solana_address":     address,
	}).Error
	if err != nil {
		common.SysError(fmt.Sprintf("openfort: failed to save wallet for user %d: %v", userId, err))
		return
	}

	common.SysLog(fmt.Sprintf("openfort: created wallet for user %d, player=%s, address=%s", userId, playerId, address))
}

// createPlayer creates an Openfort player with preGenerateEmbeddedAccount.
func createPlayer(thirdPartyUserId string) (playerId string, err error) {
	form := url.Values{}
	form.Set("thirdPartyUserId", thirdPartyUserId)
	form.Set("thirdPartyProvider", "custom")
	form.Set("preGenerateEmbeddedAccount", "true")

	req, err := http.NewRequest("POST", openfortBaseURL+"/iam/v1/players", strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}
	req.SetBasicAuth(setting.OpenfortApiKey, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("openfort API returned %d: %s", resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	if err := common.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	id, _ := result["id"].(string)
	if id == "" {
		return "", fmt.Errorf("no player id in response: %s", string(body))
	}

	return id, nil
}

// fetchPlayerAccountAddress retrieves the first account address for a player.
func fetchPlayerAccountAddress(playerId string) (string, error) {
	req, err := http.NewRequest("GET", openfortBaseURL+"/v1/accounts?player="+playerId, nil)
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}
	req.SetBasicAuth(setting.OpenfortApiKey, "")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("accounts API returned %d: %s", resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	if err := common.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	// Extract first account address from data array
	if data, ok := result["data"].([]interface{}); ok {
		for _, item := range data {
			if acc, ok := item.(map[string]interface{}); ok {
				if addr, ok := acc["address"].(string); ok && addr != "" {
					return addr, nil
				}
			}
		}
	}

	return "", nil
}
