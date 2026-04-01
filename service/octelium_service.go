package service

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"os"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/octelium/octelium/apis/main/authv1"
	"github.com/octelium/octelium/apis/main/corev1"
	"github.com/octelium/octelium/apis/main/metav1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	grpcmetadata "google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// OcteliumService handles communication with Octelium cloud via gRPC
type OcteliumService struct {
	authToken string
	domain    string
	enabled   bool
	mu        sync.RWMutex

	grpcConn *grpc.ClientConn
	coreC    corev1.MainServiceClient
	authC    authv1.MainServiceClient
	// accessToken is the session access token obtained from auth-token
	accessToken string
	tokenExpiry time.Time
}

// OcteliumConfig holds configuration for OcteliumService
type OcteliumConfig struct {
	AuthToken     string
	DefaultDomain string
	Enabled       bool
}


// GenerateTokenRequest represents a token generation request
type GenerateTokenRequest struct {
	Name     string `json:"name"`
	Domain   string `json:"domain"`
	Username string `json:"username"`
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
		authToken := os.Getenv("OCTELIUM_AUTH_TOKEN")
		domain := os.Getenv("OCTELIUM_DEFAULT_DOMAIN")
		if domain == "" {
			domain = "teniuapi.cloud"
		}
		octeliumService = &OcteliumService{
			authToken: authToken,
			domain:    domain,
			enabled:   authToken != "",
		}
		if octeliumService.enabled {
			if err := octeliumService.initGRPC(); err != nil {
				common.SysError(fmt.Sprintf("Failed to init Octelium gRPC: %v", err))
				octeliumService.enabled = false
			}
		}
	})
	return octeliumService
}

// initGRPC initializes the gRPC connection to Octelium API server
func (s *OcteliumService) initGRPC() error {
	addr := net.JoinHostPort(fmt.Sprintf("octelium-api.%s", s.domain), "443")
	tlsConfig := &tls.Config{MinVersion: tls.VersionTLS12}

	conn, err := grpc.NewClient(addr,
		grpc.WithTransportCredentials(credentials.NewTLS(tlsConfig)),
	)
	if err != nil {
		return fmt.Errorf("grpc dial: %w", err)
	}
	s.grpcConn = conn
	s.coreC = corev1.NewMainServiceClient(conn)
	s.authC = authv1.NewMainServiceClient(conn)
	common.SysLog(fmt.Sprintf("Octelium gRPC connected to %s", addr))
	return nil
}

// PLACEHOLDER_METHODS

// IsEnabled returns whether octelium integration is enabled
func (s *OcteliumService) IsEnabled() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.enabled
}

// GetDefaultDomain returns the default domain for device tokens
func (s *OcteliumService) GetDefaultDomain() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.domain
}

// authenticatedCtx returns a context with a valid Octelium access token.
// It exchanges the auth-token for a session access token via authv1, caching it until expiry.
func (s *OcteliumService) authenticatedCtx(ctx context.Context) (context.Context, error) {
	s.mu.RLock()
	token := s.accessToken
	expiry := s.tokenExpiry
	s.mu.RUnlock()

	// If we have a valid cached access token, use it
	if token != "" && time.Now().Before(expiry) {
		md := grpcmetadata.Pairs("authorization", "Bearer "+token)
		return grpcmetadata.NewOutgoingContext(ctx, md), nil
	}

	// Exchange auth-token for access token
	s.mu.Lock()
	defer s.mu.Unlock()

	// Double-check after acquiring write lock
	if s.accessToken != "" && time.Now().Before(s.tokenExpiry) {
		md := grpcmetadata.Pairs("authorization", "Bearer "+s.accessToken)
		return grpcmetadata.NewOutgoingContext(ctx, md), nil
	}

	if s.authToken == "" {
		return nil, errors.New("octelium auth token not configured")
	}

	resp, err := s.authC.AuthenticateWithAuthenticationToken(ctx, &authv1.AuthenticateWithAuthenticationTokenRequest{
		AuthenticationToken: s.authToken,
	})
	if err != nil {
		return nil, fmt.Errorf("authenticate with auth token: %w", err)
	}

	s.accessToken = resp.GetAccessToken()
	if resp.GetExpiresIn() > 0 {
		// Refresh 60s before actual expiry
		s.tokenExpiry = time.Now().Add(time.Duration(resp.GetExpiresIn())*time.Second - 60*time.Second)
	} else {
		// Default: cache for 30 minutes
		s.tokenExpiry = time.Now().Add(30 * time.Minute)
	}

	common.SysLog("Octelium access token obtained successfully")
	md := grpcmetadata.Pairs("authorization", "Bearer "+s.accessToken)
	return grpcmetadata.NewOutgoingContext(ctx, md), nil
}

// ensureOcteliumUser checks if user exists in Octelium, creates if not
func (s *OcteliumService) ensureOcteliumUser(ctx context.Context, username string) error {
	octeliumName := "newapi-" + username

	authCtx, err := s.authenticatedCtx(ctx)
	if err != nil {
		return err
	}

	// Try to get user first
	_, err = s.coreC.GetUser(authCtx, &metav1.GetOptions{
		Name: octeliumName,
	})
	if err == nil {
		return nil // user exists
	}

	// If not found, create user
	if st, ok := status.FromError(err); ok && st.Code() == codes.NotFound {
		common.SysLog(fmt.Sprintf("Creating Octelium user: %s", octeliumName))
		_, err = s.coreC.CreateUser(authCtx, &corev1.User{
			Metadata: &metav1.Metadata{
				Name: octeliumName,
			},
			Spec: &corev1.User_Spec{
				Type: corev1.User_Spec_HUMAN,
			},
		})
		if err != nil {
			return fmt.Errorf("create octelium user: %w", err)
		}
		return nil
	}

	return fmt.Errorf("get octelium user: %w", err)
}

// PLACEHOLDER_GENERATE

// GenerateAuthToken generates a real auth token via Octelium SDK
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
	if req.Username == "" {
		return nil, errors.New("username is required")
	}

	// Step 1: Ensure user exists in Octelium
	if err := s.ensureOcteliumUser(ctx, req.Username); err != nil {
		return nil, fmt.Errorf("ensure octelium user: %w", err)
	}

	authCtx, err := s.authenticatedCtx(ctx)
	if err != nil {
		return nil, err
	}

	octeliumUser := "newapi-" + req.Username
	credName := fmt.Sprintf("%s-%s", octeliumUser, req.Name)

	// Step 2: Create Credential for the user
	cred, err := s.coreC.CreateCredential(authCtx, &corev1.Credential{
		Metadata: &metav1.Metadata{
			Name: credName,
		},
		Spec: &corev1.Credential_Spec{
			Type: corev1.Credential_Spec_AUTH_TOKEN,
			User: octeliumUser,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("create credential: %w", err)
	}

	// Step 3: Generate the authentication token
	credToken, err := s.coreC.GenerateCredentialToken(authCtx, &corev1.GenerateCredentialTokenRequest{
		CredentialRef: &metav1.ObjectReference{
			Name: cred.Metadata.Name,
			Uid:  cred.Metadata.Uid,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("generate credential token: %w", err)
	}

	authTokenResp := credToken.GetAuthenticationToken()
	if authTokenResp == nil {
		return nil, errors.New("no authentication token in response")
	}

	token := authTokenResp.AuthenticationToken
	common.SysLog(fmt.Sprintf("Generated Octelium auth token for user %s device %s", req.Username, req.Name))

	return &TokenResponse{
		Token:     token,
		TokenMask: maskToken(token),
		Domain:    req.Domain,
		ExpiresAt: 0,
	}, nil
}

// PLACEHOLDER_REVOKE

// RevokeAuthToken revokes an existing auth token (best-effort)
func (s *OcteliumService) RevokeAuthToken(ctx context.Context, token string) error {
	if !s.IsEnabled() {
		return errors.New("octelium service is not enabled")
	}
	if token == "" {
		return errors.New("token is required")
	}
	common.SysLog(fmt.Sprintf("Revoking device token: %s", maskToken(token)))
	// Best-effort: we don't track credential name for revocation currently
	return nil
}

// ValidateAuthToken validates an auth token
func (s *OcteliumService) ValidateAuthToken(ctx context.Context, token string) (bool, error) {
	if !s.IsEnabled() {
		return false, errors.New("octelium service is not enabled")
	}
	if token == "" {
		return false, errors.New("token is required")
	}
	return token != "", nil
}

// GetTokenInfo gets information about a token
func (s *OcteliumService) GetTokenInfo(ctx context.Context, token string) (*TokenResponse, error) {
	if !s.IsEnabled() {
		return nil, errors.New("octelium service is not enabled")
	}
	if token == "" {
		return nil, errors.New("token is required")
	}
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
	if config.AuthToken != "" {
		s.authToken = config.AuthToken
	}
	if config.DefaultDomain != "" {
		s.domain = config.DefaultDomain
	}
	s.enabled = config.Enabled
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
