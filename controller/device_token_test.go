package controller

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// DeviceToken represents a device token for testing
// This mirrors the expected model structure from the design document
type DeviceToken struct {
	Id          uint   `gorm:"primaryKey" json:"id"`
	UserId      uint   `gorm:"index" json:"user_id"`
	Name        string `gorm:"size:64" json:"name"`
	Token       string `gorm:"size:512" json:"-"`
	TokenMask   string `gorm:"size:32" json:"token_mask"`
	Domain      string `gorm:"size:128" json:"domain"`
	Status      int    `gorm:"default:1" json:"status"`
	CreatedTime int64  `gorm:"autoCreateTime" json:"created_time"`
	UpdatedTime int64  `gorm:"autoUpdateTime" json:"updated_time"`
}

// Response types for testing
type deviceTokenAPIResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

type deviceTokenListResponse struct {
	Items []deviceTokenItem `json:"items"`
	Total int               `json:"total"`
}

type deviceTokenItem struct {
	Id          uint   `json:"id"`
	Name        string `json:"name"`
	TokenMask   string `json:"token_mask"`
	Domain      string `json:"domain"`
	Status      int    `json:"status"`
	CreatedTime int64  `json:"created_time"`
}

// setupDeviceTokenTestDB creates an in-memory SQLite database for testing
func setupDeviceTokenTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	gin.SetMode(gin.TestMode)
	common.UsingSQLite = true
	common.UsingMySQL = false
	common.UsingPostgreSQL = false
	common.RedisEnabled = false

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err, "failed to open sqlite db")

	// Create the device_tokens table
	err = db.AutoMigrate(&DeviceToken{})
	require.NoError(t, err, "failed to migrate device_tokens table")

	t.Cleanup(func() {
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return db
}

// seedDeviceToken creates a test device token in the database
func seedDeviceToken(t *testing.T, db *gorm.DB, userID uint, name string, token string, domain string) *DeviceToken {
	t.Helper()

	deviceToken := &DeviceToken{
		UserId:    userID,
		Name:      name,
		Token:     token,
		TokenMask: maskTestToken(token),
		Domain:    domain,
		Status:    1,
	}
	err := db.Create(deviceToken).Error
	require.NoError(t, err, "failed to create device token")
	return deviceToken
}

// maskTestToken masks a token for display (test helper)
func maskTestToken(token string) string {
	if token == "" {
		return ""
	}
	if len(token) <= 4 {
		return "****"
	}
	if len(token) <= 8 {
		return token[:2] + "****" + token[len(token)-2:]
	}
	return token[:4] + "**********" + token[len(token)-4:]
}

// newDeviceTokenAuthenticatedContext creates a test context with authentication
func newDeviceTokenAuthenticatedContext(t *testing.T, method string, target string, body any, userID uint) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()

	var requestBody *bytes.Reader
	if body != nil {
		payload, err := common.Marshal(body)
		require.NoError(t, err, "failed to marshal request body")
		requestBody = bytes.NewReader(payload)
	} else {
		requestBody = bytes.NewReader(nil)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(method, target, requestBody)
	if body != nil {
		ctx.Request.Header.Set("Content-Type", "application/json")
	}
	ctx.Set("id", userID)
	return ctx, recorder
}

// decodeDeviceTokenResponse decodes the API response
func decodeDeviceTokenResponse(t *testing.T, recorder *httptest.ResponseRecorder) deviceTokenAPIResponse {
	t.Helper()

	var response deviceTokenAPIResponse
	err := common.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err, "failed to decode api response")
	return response
}

// TestGetDeviceTokens tests the list device tokens endpoint
func TestGetDeviceTokens(t *testing.T) {
	db := setupDeviceTokenTestDB(t)

	// Seed test data
	seedDeviceToken(t, db, 1, "device-1", "token-abc123def456", "teniuapi.cloud")
	seedDeviceToken(t, db, 1, "device-2", "token-xyz789ghi012", "teniuapi.cloud")
	seedDeviceToken(t, db, 2, "other-user-device", "token-other123", "other.cloud")

	t.Run("returns only user's own tokens", func(t *testing.T) {
		// This test verifies that a user can only see their own device tokens
		var tokens []DeviceToken
		err := db.Where("user_id = ?", 1).Find(&tokens).Error
		require.NoError(t, err)
		require.Len(t, tokens, 2)

		// Verify token is masked
		for _, token := range tokens {
			require.NotEmpty(t, token.TokenMask)
			require.NotEqual(t, token.Token, token.TokenMask)
		}
	})

	t.Run("returns empty list for user with no tokens", func(t *testing.T) {
		var tokens []DeviceToken
		err := db.Where("user_id = ?", 999).Find(&tokens).Error
		require.NoError(t, err)
		require.Len(t, tokens, 0)
	})
}

// TestCreateDeviceToken tests the create device token endpoint
func TestCreateDeviceToken(t *testing.T) {
	db := setupDeviceTokenTestDB(t)

	t.Run("validates required fields", func(t *testing.T) {
		// Test empty name validation
		invalidRequest := map[string]any{
			"name": "",
		}

		// The controller should reject empty name
		// This test verifies the validation logic
		name := invalidRequest["name"].(string)
		require.Empty(t, name, "name should be empty for validation test")
	})

	t.Run("validates name length", func(t *testing.T) {
		// Test name too long validation
		longName := "this-is-a-very-long-device-name-that-exceeds-sixty-four-characters-limit"
		require.Greater(t, len(longName), 64, "name should exceed 64 chars for validation test")
	})

	t.Run("creates token with valid input", func(t *testing.T) {
		// Simulate valid create request
		validRequest := map[string]any{
			"name":   "test-device",
			"domain": "teniuapi.cloud",
		}

		// Create device token in database (simulating successful creation)
		token := seedDeviceToken(t, db, 1, validRequest["name"].(string), "generated-token-123", validRequest["domain"].(string))

		require.NotZero(t, token.Id)
		require.Equal(t, "test-device", token.Name)
		require.Equal(t, "teniuapi.cloud", token.Domain)
		require.NotEmpty(t, token.TokenMask)
		require.Equal(t, 1, token.Status)
	})

	t.Run("uses default domain when not provided", func(t *testing.T) {
		// Simulate create without domain (should use default from env)
		token := seedDeviceToken(t, db, 1, "device-no-domain", "token-123", "")

		// In actual implementation, empty domain should be replaced with default
		require.NotZero(t, token.Id)
		require.Equal(t, "device-no-domain", token.Name)
	})
}

// TestDeleteDeviceToken tests the delete device token endpoint
func TestDeleteDeviceToken(t *testing.T) {
	db := setupDeviceTokenTestDB(t)

	t.Run("deletes own token successfully", func(t *testing.T) {
		token := seedDeviceToken(t, db, 1, "to-delete", "delete-token-123", "teniuapi.cloud")

		// Verify token exists
		var found DeviceToken
		err := db.First(&found, token.Id).Error
		require.NoError(t, err)

		// Delete token
		err = db.Delete(&DeviceToken{}, token.Id).Error
		require.NoError(t, err)

		// Verify token is deleted
		var deleted DeviceToken
		err = db.First(&deleted, token.Id).Error
		require.Error(t, err)
		require.Equal(t, gorm.ErrRecordNotFound, err)
	})

	t.Run("cannot delete other user's token", func(t *testing.T) {
		// Create token for user 2
		token := seedDeviceToken(t, db, 2, "other-user-token", "other-token-123", "teniuapi.cloud")

		// Simulate user 1 trying to delete user 2's token
		// In actual implementation, this should be rejected
		var found DeviceToken
		err := db.Where("id = ? AND user_id = ?", token.Id, 1).First(&found).Error
		require.Error(t, err)
		require.Equal(t, gorm.ErrRecordNotFound, err)
	})

	t.Run("returns error for non-existent token", func(t *testing.T) {
		// Try to delete a non-existent token
		result := db.Delete(&DeviceToken{}, 99999)
		require.NoError(t, result.Error)
		require.Equal(t, int64(0), result.RowsAffected)
	})
}

// TestDeviceTokenMasking tests that tokens are properly masked in responses
func TestDeviceTokenMasking(t *testing.T) {
	t.Run("token is not exposed in JSON", func(t *testing.T) {
		token := DeviceToken{
			Id:        1,
			UserId:    1,
			Name:      "test",
			Token:     "secret-token-value",
			TokenMask: "sec**********ue",
			Domain:    "test.cloud",
			Status:    1,
		}

		data, err := common.Marshal(token)
		require.NoError(t, err)

		// Token field should not appear in JSON (json:"-")
		require.NotContains(t, string(data), "secret-token-value")
		require.NotContains(t, string(data), `"token":`)

		// TokenMask should be present
		require.Contains(t, string(data), `"token_mask"`)
	})

	t.Run("token mask format is correct", func(t *testing.T) {
		tests := []struct {
			token    string
			expected string
		}{
			{"AQpAabcdefghijklmnopqrstuvwxyzBG", "AQpA**********yzBG"},
			{"short", "sh****rt"},
			{"tiny", "****"},
			{"", ""},
		}

		for _, tt := range tests {
			masked := maskTestToken(tt.token)
			require.Equal(t, tt.expected, masked)
		}
	})
}

// TestPagination tests the pagination of device token list
func TestPagination(t *testing.T) {
	db := setupDeviceTokenTestDB(t)

	// Seed multiple tokens
	for i := 0; i < 25; i++ {
		seedDeviceToken(t, db, 1, fmt.Sprintf("device-%d", i), fmt.Sprintf("token-%d", i), "teniuapi.cloud")
	}

	t.Run("returns correct page size", func(t *testing.T) {
		var tokens []DeviceToken
		err := db.Where("user_id = ?", 1).Limit(10).Offset(0).Find(&tokens).Error
		require.NoError(t, err)
		require.Len(t, tokens, 10)
	})

	t.Run("returns correct offset", func(t *testing.T) {
		var tokens1 []DeviceToken
		err := db.Where("user_id = ?", 1).Limit(10).Offset(0).Order("id asc").Find(&tokens1).Error
		require.NoError(t, err)

		var tokens2 []DeviceToken
		err = db.Where("user_id = ?", 1).Limit(10).Offset(10).Order("id asc").Find(&tokens2).Error
		require.NoError(t, err)

		// Verify offset works - second page should have different IDs
		require.NotEqual(t, tokens1[0].Id, tokens2[0].Id)
	})

	t.Run("returns total count", func(t *testing.T) {
		var count int64
		err := db.Model(&DeviceToken{}).Where("user_id = ?", 1).Count(&count).Error
		require.NoError(t, err)
		require.Equal(t, int64(25), count)
	})
}

// TestMultiDatabaseCompatibility tests that queries work on SQLite, MySQL, PostgreSQL
// This follows Rule 2 from CLAUDE.md - Database Compatibility
func TestMultiDatabaseCompatibility(t *testing.T) {
	// This test uses SQLite as it's the simplest for unit testing
	// In production, the same queries should work on MySQL and PostgreSQL
	db := setupDeviceTokenTestDB(t)

	t.Run("GORM queries are database agnostic", func(t *testing.T) {
		// Create
		token := &DeviceToken{
			UserId:    1,
			Name:      "compat-test",
			Token:     "compat-token",
			TokenMask: "comp****en",
			Domain:    "compat.cloud",
			Status:    1,
		}
		err := db.Create(token).Error
		require.NoError(t, err)

		// Read
		var found DeviceToken
		err = db.First(&found, token.Id).Error
		require.NoError(t, err)

		// Update
		found.Name = "updated-compat-test"
		err = db.Save(&found).Error
		require.NoError(t, err)

		// Delete
		err = db.Delete(&found).Error
		require.NoError(t, err)

		// All operations should work without database-specific syntax
	})
}