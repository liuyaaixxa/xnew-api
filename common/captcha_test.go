package common

import (
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestMemoryCaptchaStore_SetAndVerify(t *testing.T) {
	s := newMemoryCaptchaStore()

	require.NoError(t, s.Set("test-id-1", "abc123"))

	ok := s.Verify("test-id-1", "abc123", true)
	require.True(t, ok, "correct answer should verify")

	// One-time: second verify should fail
	ok = s.Verify("test-id-1", "abc123", true)
	require.False(t, ok, "same id should not verify twice")
}

func TestMemoryCaptchaStore_CaseInsensitive(t *testing.T) {
	s := newMemoryCaptchaStore()
	require.NoError(t, s.Set("test-id-2", "AbCdE"))

	ok := s.Verify("test-id-2", "abcde", true)
	require.True(t, ok, "verification should be case-insensitive")
}

func TestMemoryCaptchaStore_WrongAnswer(t *testing.T) {
	s := newMemoryCaptchaStore()
	require.NoError(t, s.Set("test-id-3", "correct"))

	ok := s.Verify("test-id-3", "wrong", true)
	require.False(t, ok, "wrong answer should not verify")

	// After wrong attempt with clear=true, id is consumed
	ok = s.Verify("test-id-3", "correct", true)
	require.False(t, ok, "id should be consumed after failed attempt")
}

func TestMemoryCaptchaStore_Expiry(t *testing.T) {
	s := newMemoryCaptchaStore()
	s.mu.Lock()
	s.items["expired-id"] = memoryCaptchaEntry{
		value:     "answer",
		expiresAt: time.Now().Add(-1 * time.Second),
	}
	s.mu.Unlock()

	val, err := s.Get("expired-id", false)
	require.NoError(t, err)
	require.Empty(t, val, "expired entry should return empty")
}

func TestMemoryCaptchaStore_NonExistent(t *testing.T) {
	s := newMemoryCaptchaStore()

	ok := s.Verify("does-not-exist", "anything", true)
	require.False(t, ok, "non-existent id should not verify")
}

func TestGenerateCaptcha(t *testing.T) {
	// Init memory store for test
	captchaStore = newMemoryCaptchaStore()

	id, image, err := GenerateCaptcha()
	require.NoError(t, err)
	require.True(t, len(id) >= 16, "captcha id should be at least 16 chars, got %d", len(id))
	require.True(t, strings.HasPrefix(image, "data:image/png;base64,"), "image should be base64 PNG data URI")
}

func TestVerifyCaptcha_EmptyParams(t *testing.T) {
	captchaStore = newMemoryCaptchaStore()

	valid, reason := VerifyCaptcha("", "value")
	require.False(t, valid)
	require.Contains(t, reason, "人机校验")

	valid, reason = VerifyCaptcha("id", "")
	require.False(t, valid)
	require.Contains(t, reason, "人机校验")
}

func TestVerifyCaptcha_ExpiredOrMissing(t *testing.T) {
	captchaStore = newMemoryCaptchaStore()

	valid, reason := VerifyCaptcha("nonexistent", "answer")
	require.False(t, valid)
	require.Contains(t, reason, "过期")
}

func TestVerifyCaptcha_CorrectThenReuse(t *testing.T) {
	captchaStore = newMemoryCaptchaStore()

	id, _, err := GenerateCaptcha()
	require.NoError(t, err)

	// Get the stored answer directly for testing
	ms := captchaStore.(*memoryCaptchaStore)
	ms.mu.Lock()
	answer := ms.items[id].value
	ms.mu.Unlock()

	valid, reason := VerifyCaptcha(id, answer)
	require.True(t, valid)
	require.Empty(t, reason)

	// Reuse should fail
	valid, reason = VerifyCaptcha(id, answer)
	require.False(t, valid)
	require.Contains(t, reason, "过期")
}
