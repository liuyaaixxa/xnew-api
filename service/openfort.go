package service

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
)

var playerIdRegex = regexp.MustCompile(`pla_[0-9a-f-]+`)

const openfortBaseURL = "https://api.openfort.io"

// CreateOpenfortWallet creates an Openfort player and a Solana backend wallet
// for the given user. It is safe to call from a goroutine — errors are logged
// but never returned to the caller.
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
	if user.SolanaAddress != "" {
		return
	}

	// Step 1: Create player (for Openfort identity)
	playerId := user.OpenfortPlayerId
	if playerId == "" {
		playerId, err = createPlayer(fmt.Sprintf("%d", userId))
		if err != nil {
			common.SysError(fmt.Sprintf("openfort: failed to create player for user %d: %v", userId, err))
			return
		}
		// Save player ID immediately
		_ = model.DB.Model(&model.User{}).Where("id = ?", userId).
			Update("openfort_player_id", playerId).Error
	}

	// Step 2: Create Solana backend wallet
	address, err := createSolanaBackendWallet()
	if err != nil {
		common.SysError(fmt.Sprintf("openfort: failed to create solana wallet for user %d: %v", userId, err))
		return
	}

	// Update user record
	err = model.DB.Model(&model.User{}).Where("id = ?", userId).Updates(map[string]interface{}{
		"openfort_player_id": playerId,
		"solana_address":     address,
	}).Error
	if err != nil {
		common.SysError(fmt.Sprintf("openfort: failed to save wallet for user %d: %v", userId, err))
		return
	}

	common.SysLog(fmt.Sprintf("openfort: created solana wallet for user %d, player=%s, address=%s", userId, playerId, address))
}

// createPlayer creates an Openfort player.
func createPlayer(thirdPartyUserId string) (playerId string, err error) {
	form := url.Values{}
	form.Set("thirdPartyUserId", thirdPartyUserId)
	form.Set("thirdPartyProvider", "custom")
	form.Set("preGenerateEmbeddedAccount", "false")

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
	if resp.StatusCode == http.StatusConflict {
		// Player already exists — extract player ID from error message
		if match := playerIdRegex.Find(body); match != nil {
			common.SysLog(fmt.Sprintf("openfort: player already exists: %s, reusing", string(match)))
			return string(match), nil
		}
		return "", fmt.Errorf("openfort API returned 409 but could not extract player id: %s", string(body))
	}
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

// createSolanaBackendWallet creates a Solana backend wallet via POST /v2/accounts/backend.
// Requires OpenfortApiKey and OpenfortWalletSecret to be configured.
func createSolanaBackendWallet() (address string, err error) {
	if setting.OpenfortWalletSecret == "" {
		return "", fmt.Errorf("OpenfortWalletSecret not configured")
	}

	reqBody := `{"chainType":"SVM"}`
	apiURL := openfortBaseURL + "/v2/accounts/backend"

	// Generate Wallet Auth JWT
	walletAuthJWT, err := BuildWalletAuthJWT("POST", apiURL, []byte(reqBody))
	if err != nil {
		return "", fmt.Errorf("build wallet auth: %w", err)
	}

	req, err := http.NewRequest("POST", apiURL, strings.NewReader(reqBody))
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+setting.OpenfortApiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Wallet-Auth", walletAuthJWT)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("backend accounts API returned %d: %s", resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	if err := common.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	addr, _ := result["address"].(string)
	if addr == "" {
		return "", fmt.Errorf("no address in response: %s", string(body))
	}

	return addr, nil
}

// BuildWalletAuthJWT creates an ES256 JWT for the X-Wallet-Auth header.
// The JWT contains the request URI, a hash of the request body, and standard claims.
func BuildWalletAuthJWT(method, requestURL string, reqBody []byte) (string, error) {
	// Parse the wallet secret (base64-encoded DER EC private key)
	derBytes, err := base64.StdEncoding.DecodeString(setting.OpenfortWalletSecret)
	if err != nil {
		return "", fmt.Errorf("decode wallet secret: %w", err)
	}

	privKey, err := x509.ParsePKCS8PrivateKey(derBytes)
	if err != nil {
		return "", fmt.Errorf("parse private key: %w", err)
	}

	ecKey, ok := privKey.(*ecdsa.PrivateKey)
	if !ok {
		return "", fmt.Errorf("wallet secret is not an EC key")
	}

	// Parse URL to build URI claim: "METHOD HOST/PATH"
	u, err := url.Parse(requestURL)
	if err != nil {
		return "", fmt.Errorf("parse URL: %w", err)
	}
	uri := method + " " + u.Host + u.Path

	// Build JWT header
	header := base64url([]byte(`{"alg":"ES256","typ":"JWT"}`))

	// Build JWT claims
	now := time.Now().Unix()
	jti, _ := randomHex(16)

	claims := fmt.Sprintf(`{"uris":["%s"]`, uri)
	if len(reqBody) > 0 {
		hash := sha256.Sum256(reqBody)
		claims += fmt.Sprintf(`,"reqHash":"%x"`, hash)
	}
	claims += fmt.Sprintf(`,"iat":%d,"nbf":%d,"jti":"%s"}`, now, now, jti)

	payload := base64url([]byte(claims))

	// Sign with ES256 (ECDSA P-256 SHA-256)
	signingInput := header + "." + payload
	hash := sha256.Sum256([]byte(signingInput))

	r, s, err := ecdsa.Sign(rand.Reader, ecKey, hash[:])
	if err != nil {
		return "", fmt.Errorf("sign JWT: %w", err)
	}

	// Encode signature as fixed-size R || S (32 bytes each for P-256)
	curveBits := ecKey.Curve.Params().BitSize
	keyBytes := (curveBits + 7) / 8
	rBytes := r.Bytes()
	sBytes := s.Bytes()
	sig := make([]byte, 2*keyBytes)
	copy(sig[keyBytes-len(rBytes):keyBytes], rBytes)
	copy(sig[2*keyBytes-len(sBytes):], sBytes)

	signature := base64url(sig)

	return signingInput + "." + signature, nil
}

// base64url encodes data using base64url encoding without padding (RFC 7515).
func base64url(data []byte) string {
	s := base64.URLEncoding.EncodeToString(data)
	return strings.TrimRight(s, "=")
}

// randomHex generates n random bytes and returns them as a hex string.
func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// TransferSOLFromTreasury transfers SOL from the treasury wallet to the given address.
func TransferSOLFromTreasury(toAddress string, amountSOL float64) error {
	if setting.OpenfortApiKey == "" {
		return fmt.Errorf("OpenfortApiKey not configured")
	}
	if setting.OpenfortWalletSecret == "" {
		return fmt.Errorf("OpenfortWalletSecret not configured")
	}
	if setting.OpenfortTreasuryAccountId == "" {
		return fmt.Errorf("OpenfortTreasuryAccountId not configured")
	}

	// Convert SOL to lamports (1 SOL = 1e9 lamports)
	lamports := uint64(amountSOL * 1e9)

	// Normalize cluster name
	cluster := setting.OpenfortSolanaCluster
	if cluster == "mainnet" {
		cluster = "mainnet-beta"
	} else if cluster != "mainnet-beta" {
		cluster = "devnet"
	}

	// Build request body
	reqPayload := map[string]string{
		"to":      toAddress,
		"amount":  fmt.Sprintf("%d", lamports),
		"token":   "sol",
		"cluster": cluster,
	}
	reqBody, err := common.Marshal(reqPayload)
	if err != nil {
		return fmt.Errorf("marshal request body: %w", err)
	}

	apiURL := fmt.Sprintf("%s/v2/accounts/solana/%s/transfer", openfortBaseURL, setting.OpenfortTreasuryAccountId)

	// Generate Wallet Auth JWT
	walletAuthJWT, err := BuildWalletAuthJWT("POST", apiURL, reqBody)
	if err != nil {
		return fmt.Errorf("build wallet auth: %w", err)
	}

	req, err := http.NewRequest("POST", apiURL, bytes.NewReader(reqBody))
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+setting.OpenfortApiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Wallet-Auth", walletAuthJWT)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("transfer API returned %d: %s", resp.StatusCode, string(body))
	}

	common.SysLog(fmt.Sprintf("openfort: transferred %d lamports (%.9f SOL) to %s", lamports, amountSOL, toAddress))
	return nil
}
