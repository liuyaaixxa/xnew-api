package service

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
)

// OcteliumService handles communication with octelium API
type OcteliumService struct {
	apiEndpoint string
	apiKey      string
	domain      string
	enabled     bool
	mu          sync.RWMutex
}

// OcteliumConfig holds configuration for OcteliumService
type OcteliumConfig struct {
	APIEndpoint string
	APIKey      string
	DefaultDomain string
	Enabled     bool
}

// GenerateTokenRequest represents a token generation request
type GenerateTokenRequest struct {
	Name   string `json:"name"`
	Domain string `json:"domain"`
}

// TokenResponse represents a token generation response
type TokenResponse struct {
	Token     string `json:"token"`
	TokenMask string `json:"token_mask"`
	Domain    string `json:"domain"`
	ExpiresAt int64  `json:"expires_at"`
}

var (
	octeliumService     *OcteliumService
	octeliumServiceOnce sync.Once
)

// GetOcteliumService returns the singleton OcteliumService instance
func GetOcteliumService() *OcteliumService {
	octeliumServiceOnce.Do(func() {
		octeliumService = &OcteliumService{
			apiEndpoint: os.Getenv("OCTELIUM_API_ENDPOINT"),
			apiKey:      os.Getenv("OCTELIUM_API_KEY"),
			domain:      os.Getenv("OCTELIUM_DEFAULT_DOMAIN"),
			enabled:     os.Getenv("OCTELIUM_API_ENDPOINT") != "",
		}
	})
	return octeliumService
}

// IsEnabled returns whether octelium integration is enabled
func (s *OcteliumService) IsEnabled() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.enabled
}

// SetEnabled sets the enabled status
func (s *OcteliumService) SetEnabled(enabled bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.enabled = enabled
}

// GetDefaultDomain returns the default domain for device tokens
func (s *OcteliumService) GetDefaultDomain() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.domain != "" {
		return s.domain
	}
	return "teniuapi.cloud"
}

// GenerateAuthToken generates a new auth token for a device
// This is a placeholder implementation - the actual octelium-go SDK integration
// will be added when the SDK is available
func (s *OcteliumService) GenerateAuthToken(ctx context.Context, req *GenerateTokenRequest) (*TokenResponse, error) {
	if !s.IsEnabled() {
		return nil, errors.New("octelium service is not enabled")
	}

	if req.Name == "" {
		return nil, errors.New("device name is required")
	}

	if req.Domain == "" {
		req.Domain = s.GetDefaultDomain()
	}

	s.mu.RLock()
	endpoint := s.apiEndpoint
	_ = s.apiKey // Reserved for future use when octelium-go SDK is integrated
	s.mu.RUnlock()

	if endpoint == "" {
		return nil, errors.New("octelium API endpoint is not configured")
	}

	// Placeholder implementation - generates a mock token
	// In production, this would call the octelium-go SDK
	// For now, we generate a unique token for testing purposes
	token := generateMockToken(req.Name, req.Domain)

	common.SysLog(fmt.Sprintf("Generated device token for %s on domain %s", req.Name, req.Domain))

	return &TokenResponse{
		Token:     token,
		TokenMask: maskToken(token),
		Domain:    req.Domain,
		ExpiresAt: 0, // 0 means no expiration (long-lived token)
	}, nil
}

// RevokeAuthToken revokes an existing auth token
// This is a placeholder implementation
func (s *OcteliumService) RevokeAuthToken(ctx context.Context, token string) error {
	if !s.IsEnabled() {
		return errors.New("octelium service is not enabled")
	}

	if token == "" {
		return errors.New("token is required")
	}

	common.SysLog(fmt.Sprintf("Revoking device token: %s", maskToken(token)))

	// Placeholder implementation - in production, this would call octelium-go SDK
	return nil
}

// ValidateAuthToken validates an auth token with octelium
// This is a placeholder implementation
func (s *OcteliumService) ValidateAuthToken(ctx context.Context, token string) (bool, error) {
	if !s.IsEnabled() {
		return false, errors.New("octelium service is not enabled")
	}

	if token == "" {
		return false, errors.New("token is required")
	}

	// Placeholder implementation - in production, this would call octelium-go SDK
	// For now, we just check if the token is not empty
	return token != "", nil
}

// GetTokenInfo gets information about a token
// This is a placeholder implementation
func (s *OcteliumService) GetTokenInfo(ctx context.Context, token string) (*TokenResponse, error) {
	if !s.IsEnabled() {
		return nil, errors.New("octelium service is not enabled")
	}

	if token == "" {
		return nil, errors.New("token is required")
	}

	// Placeholder implementation
	return &TokenResponse{
		Token:     token,
		TokenMask: maskToken(token),
		Domain:    s.GetDefaultDomain(),
		ExpiresAt: 0,
	}, nil
}

// UpdateConfig updates the service configuration
func (s *OcteliumService) UpdateConfig(config *OcteliumConfig) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if config.APIEndpoint != "" {
		s.apiEndpoint = config.APIEndpoint
	}
	if config.APIKey != "" {
		s.apiKey = config.APIKey
	}
	if config.DefaultDomain != "" {
		s.domain = config.DefaultDomain
	}
	s.enabled = config.Enabled
}

// generateMockToken generates a mock token for testing
// This should be replaced with actual octelium-go SDK calls
func generateMockToken(name, domain string) string {
	// Generate a unique token based on name, domain, and timestamp
	// This is a placeholder - in production, octelium SDK will generate real tokens
	timestamp := time.Now().UnixNano()
	return fmt.Sprintf("dt-%s-%s-%d", domain, name, timestamp)
}

// maskToken masks a token for safe display
func maskToken(token string) string {
	if token == "" {
		return ""
	}
	if len(token) <= 8 {
		return "****"
	}
	return token[:4] + "****" + token[len(token)-4:]
}

// OcteliumServiceInterface defines the interface for Octelium service
// This allows for mock implementations in tests
type OcteliumServiceInterface interface {
	IsEnabled() bool
	GetDefaultDomain() string
	GenerateAuthToken(ctx context.Context, req *GenerateTokenRequest) (*TokenResponse, error)
	RevokeAuthToken(ctx context.Context, token string) error
	ValidateAuthToken(ctx context.Context, token string) (bool, error)
	GetTokenInfo(ctx context.Context, token string) (*TokenResponse, error)
}

// MockOcteliumService is a mock implementation for testing
type MockOcteliumService struct {
	Enabled       bool
	DefaultDomain string
	Tokens        map[string]*TokenResponse
}

// NewMockOcteliumService creates a new mock service for testing
func NewMockOcteliumService() *MockOcteliumService {
	return &MockOcteliumService{
		Enabled:       true,
		DefaultDomain: "teniuapi.cloud",
		Tokens:        make(map[string]*TokenResponse),
	}
}

func (m *MockOcteliumService) IsEnabled() bool {
	return m.Enabled
}

func (m *MockOcteliumService) GetDefaultDomain() string {
	return m.DefaultDomain
}

func (m *MockOcteliumService) GenerateAuthToken(ctx context.Context, req *GenerateTokenRequest) (*TokenResponse, error) {
	if !m.Enabled {
		return nil, errors.New("octelium service is not enabled")
	}
	if req.Name == "" {
		return nil, errors.New("device name is required")
	}
	if req.Domain == "" {
		req.Domain = m.DefaultDomain
	}

	token := fmt.Sprintf("mock-token-%s-%d", req.Name, time.Now().UnixNano())
	resp := &TokenResponse{
		Token:     token,
		TokenMask: maskToken(token),
		Domain:    req.Domain,
		ExpiresAt: 0,
	}
	m.Tokens[token] = resp
	return resp, nil
}

func (m *MockOcteliumService) RevokeAuthToken(ctx context.Context, token string) error {
	if !m.Enabled {
		return errors.New("octelium service is not enabled")
	}
	delete(m.Tokens, token)
	return nil
}

func (m *MockOcteliumService) ValidateAuthToken(ctx context.Context, token string) (bool, error) {
	if !m.Enabled {
		return false, errors.New("octelium service is not enabled")
	}
	_, exists := m.Tokens[token]
	return exists, nil
}

func (m *MockOcteliumService) GetTokenInfo(ctx context.Context, token string) (*TokenResponse, error) {
	if !m.Enabled {
		return nil, errors.New("octelium service is not enabled")
	}
	resp, exists := m.Tokens[token]
	if !exists {
		return nil, errors.New("token not found")
	}
	return resp, nil
}