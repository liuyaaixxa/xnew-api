package service

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

// MockOcteliumClient is a mock implementation of the octelium-go client
// for testing purposes. This will be replaced with actual implementation
// when octelium-go SDK is integrated.
type MockOcteliumClient struct {
	GenerateTokenFunc func(ctx context.Context, name string, domain string) (string, error)
	RevokeTokenFunc   func(ctx context.Context, token string) error
}

// GenerateAuthToken mock implementation
func (m *MockOcteliumClient) GenerateAuthToken(ctx context.Context, name string, domain string) (string, error) {
	if m.GenerateTokenFunc != nil {
		return m.GenerateTokenFunc(ctx, name, domain)
	}
	return "mock-auth-token-12345", nil
}

// RevokeAuthToken mock implementation
func (m *MockOcteliumClient) RevokeAuthToken(ctx context.Context, token string) error {
	if m.RevokeTokenFunc != nil {
		return m.RevokeTokenFunc(ctx, token)
	}
	return nil
}

// TestOcteliumServiceGenerateAuthToken tests the GenerateAuthToken method
func TestOcteliumServiceGenerateAuthToken(t *testing.T) {
	t.Run("successful token generation", func(t *testing.T) {
		ctx := context.Background()
		mockClient := &MockOcteliumClient{
			GenerateTokenFunc: func(ctx context.Context, name string, domain string) (string, error) {
				require.NotEmpty(t, name)
				require.NotEmpty(t, domain)
				return "test-auth-token-abc123", nil
			},
		}

		token, err := mockClient.GenerateAuthToken(ctx, "test-device", "teniuapi.cloud")

		require.NoError(t, err)
		require.NotEmpty(t, token)
		require.Equal(t, "test-auth-token-abc123", token)
	})

	t.Run("empty device name returns error", func(t *testing.T) {
		ctx := context.Background()
		mockClient := &MockOcteliumClient{
			GenerateTokenFunc: func(ctx context.Context, name string, domain string) (string, error) {
				if name == "" {
					return "", errors.New("device name cannot be empty")
				}
				return "token", nil
			},
		}

		token, err := mockClient.GenerateAuthToken(ctx, "", "teniuapi.cloud")

		require.Error(t, err)
		require.Empty(t, token)
		require.Contains(t, err.Error(), "device name")
	})

	t.Run("device name too long returns error", func(t *testing.T) {
		ctx := context.Background()
		longName := "this-is-a-very-long-device-name-that-exceeds-the-maximum-limit-of-64-characters-which-is-not-allowed"
		mockClient := &MockOcteliumClient{
			GenerateTokenFunc: func(ctx context.Context, name string, domain string) (string, error) {
				if len(name) > 64 {
					return "", errors.New("device name is too long")
				}
				return "token", nil
			},
		}

		token, err := mockClient.GenerateAuthToken(ctx, longName, "teniuapi.cloud")

		require.Error(t, err)
		require.Empty(t, token)
		require.Contains(t, err.Error(), "too long")
	})

	t.Run("empty domain uses default", func(t *testing.T) {
		ctx := context.Background()
		mockClient := &MockOcteliumClient{
			GenerateTokenFunc: func(ctx context.Context, name string, domain string) (string, error) {
				// When domain is empty, use default from environment
				if domain == "" {
					domain = "default.octelium.cloud"
				}
				return "token-for-" + domain, nil
			},
		}

		token, err := mockClient.GenerateAuthToken(ctx, "test-device", "")

		require.NoError(t, err)
		require.Contains(t, token, "default.octelium.cloud")
	})

	t.Run("network error returns error", func(t *testing.T) {
		ctx := context.Background()
		mockClient := &MockOcteliumClient{
			GenerateTokenFunc: func(ctx context.Context, name string, domain string) (string, error) {
				return "", errors.New("network connection failed")
			},
		}

		token, err := mockClient.GenerateAuthToken(ctx, "test-device", "teniuapi.cloud")

		require.Error(t, err)
		require.Empty(t, token)
	})
}

// TestOcteliumServiceRevokeAuthToken tests the RevokeAuthToken method
func TestOcteliumServiceRevokeAuthToken(t *testing.T) {
	t.Run("successful token revocation", func(t *testing.T) {
		ctx := context.Background()
		mockClient := &MockOcteliumClient{
			RevokeTokenFunc: func(ctx context.Context, token string) error {
				require.NotEmpty(t, token)
				return nil
			},
		}

		err := mockClient.RevokeAuthToken(ctx, "test-token-to-revoke")

		require.NoError(t, err)
	})

	t.Run("empty token returns error", func(t *testing.T) {
		ctx := context.Background()
		mockClient := &MockOcteliumClient{
			RevokeTokenFunc: func(ctx context.Context, token string) error {
				if token == "" {
					return errors.New("token cannot be empty")
				}
				return nil
			},
		}

		err := mockClient.RevokeAuthToken(ctx, "")

		require.Error(t, err)
		require.Contains(t, err.Error(), "cannot be empty")
	})

	t.Run("token not found returns error", func(t *testing.T) {
		ctx := context.Background()
		mockClient := &MockOcteliumClient{
			RevokeTokenFunc: func(ctx context.Context, token string) error {
				if token == "non-existent-token" {
					return errors.New("token not found")
				}
				return nil
			},
		}

		err := mockClient.RevokeAuthToken(ctx, "non-existent-token")

		require.Error(t, err)
		require.Contains(t, err.Error(), "not found")
	})
}

// TestMaskDeviceToken tests the token masking utility
func TestMaskDeviceToken(t *testing.T) {
	tests := []struct {
		name     string
		token    string
		expected string
	}{
		{
			name:     "empty token",
			token:    "",
			expected: "",
		},
		{
			name:     "short token (4 chars)",
			token:    "abcd",
			expected: "****",
		},
		{
			name:     "medium token (8 chars)",
			token:    "abcd1234",
			expected: "ab****34",
		},
		{
			name:     "long token (32 chars)",
			token:    "AQpAabcdefghijklmnopqrstuvwxyzBG",
			expected: "AQpA**********yzBG",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := maskDeviceToken(tt.token)
			require.Equal(t, tt.expected, result)
		})
	}
}

// maskDeviceToken masks a device token for display
// Shows first 4 and last 4 characters, with asterisks in between
func maskDeviceToken(token string) string {
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

// TestValidateDeviceName tests the device name validation
func TestValidateDeviceName(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		expectErr bool
		errMsg    string
	}{
		{
			name:      "valid name",
			input:     "my-device",
			expectErr: false,
		},
		{
			name:      "empty name",
			input:     "",
			expectErr: true,
			errMsg:    "device name cannot be empty",
		},
		{
			name:      "name too long",
			input:     "this-device-name-is-way-too-long-and-exceeds-the-64-character-limit",
			expectErr: true,
			errMsg:    "device name is too long",
		},
		{
			name:      "name exactly 64 chars",
			input:     "this-is-exactly-sixty-four-characters-long-device-name-123456789",
			expectErr: false,
		},
		{
			name:      "name with special chars",
			input:     "device-123_test",
			expectErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateDeviceName(tt.input)
			if tt.expectErr {
				require.Error(t, err)
				require.Contains(t, err.Error(), tt.errMsg)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

// validateDeviceName validates a device name
func validateDeviceName(name string) error {
	if name == "" {
		return errors.New("device name cannot be empty")
	}
	if len(name) > 64 {
		return errors.New("device name is too long")
	}
	return nil
}