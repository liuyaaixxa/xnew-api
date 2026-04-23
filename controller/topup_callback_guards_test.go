package controller

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCheckCallbackIPAllowed(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name       string
		clientIP   string
		allowedIPs string
		want       bool
	}{
		{"empty whitelist lets all through", "1.2.3.4", "", true},
		{"whitespace-only whitelist lets all through", "1.2.3.4", "   ", true},

		{"exact IP match", "150.158.151.80", "150.158.151.80", true},
		{"exact IP no match", "1.2.3.4", "150.158.151.80", false},

		{"multi-IP list with match", "203.0.113.5", "150.158.151.80,203.0.113.5", true},
		{"multi-IP list no match", "10.0.0.1", "150.158.151.80,203.0.113.5", false},
		{"multi-IP list with spaces around entries", "203.0.113.5", " 150.158.151.80 , 203.0.113.5 ", true},

		{"CIDR match /16", "150.158.151.80", "150.158.0.0/16", true},
		{"CIDR no match /24", "150.158.151.80", "150.158.152.0/24", false},

		{"mixed list IP+CIDR, matches IP", "1.2.3.4", "1.2.3.4,10.0.0.0/8", true},
		{"mixed list IP+CIDR, matches CIDR", "10.5.5.5", "1.2.3.4,10.0.0.0/8", true},

		{"invalid client IP returns false", "not-an-ip", "150.158.151.80", false},
		{"invalid CIDR in config is skipped, IP still checked", "1.2.3.4", "nonsense/40,1.2.3.4", true},
		{"empty entries in list skipped", "1.2.3.4", ",, ,1.2.3.4,", true},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, reason := CheckCallbackIPAllowed(tc.clientIP, tc.allowedIPs)
			require.Equalf(t, tc.want, got, "reason=%q", reason)
		})
	}
}

func TestCheckOrderAge(t *testing.T) {
	t.Parallel()

	const now int64 = 1_700_000_000
	tests := []struct {
		name           string
		createTime     int64
		maxAgeSeconds  int
		wantValid      bool
		wantAgeAtLeast int64
	}{
		{"threshold 0 disables check (fresh order)", now - 10, 0, true, 10},
		{"threshold 0 disables check (ancient order)", now - 999_999, 0, true, 999_999},
		{"within window", now - 600, 1800, true, 600},
		{"exactly at boundary", now - 1800, 1800, true, 1800},
		{"just over boundary", now - 1801, 1800, false, 1801},
		{"negative createTime treated as legacy skip", 0, 1800, true, now},
		{"createTime in future yields negative age but still valid", now + 100, 1800, true, -100},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			valid, age := CheckOrderAge(tc.createTime, now, tc.maxAgeSeconds)
			require.Equal(t, tc.wantValid, valid)
			if tc.wantAgeAtLeast >= 0 {
				require.Equal(t, tc.wantAgeAtLeast, age)
			}
		})
	}
}

func TestCheckTradeNoOwnership(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		tradeNo  string
		userID   int
		wantOK   bool
		wantUser int
	}{
		{"match", "USR12NOB96OyP1776770655", 12, true, 12},
		{"mismatch", "USR12NOB96OyP1776770655", 99, false, 12},
		{"subscription prefix, does not start with USR", "SUBUSR1NOXZnwJP1775960005", 1, false, 0},
		{"missing NO delimiter", "USR12XY", 12, false, 0},
		{"non-numeric user segment", "USRabcNOxxx", 12, false, 0},
		{"empty", "", 12, false, 0},
		{"just USR", "USR", 12, false, 0},
		{"user 0 rejected (prefix needs digits)", "USRNOabc", 0, false, 0},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			ok, parsed := CheckTradeNoOwnership(tc.tradeNo, tc.userID)
			require.Equal(t, tc.wantOK, ok)
			require.Equal(t, tc.wantUser, parsed)
		})
	}
}

func TestCheckSubscriptionTradeNoOwnership(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		tradeNo  string
		userID   int
		wantOK   bool
		wantUser int
	}{
		{"match", "SUBUSR1NOXZnwJP1775960005", 1, true, 1},
		{"mismatch", "SUBUSR1NOXZnwJP1775960005", 99, false, 1},
		{"non-subscription USR prefix rejected", "USR12NOxyz", 12, false, 0},
		{"missing NO delimiter", "SUBUSR1XY", 1, false, 0},
		{"non-numeric user segment", "SUBUSRabcNOxyz", 1, false, 0},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			ok, parsed := CheckSubscriptionTradeNoOwnership(tc.tradeNo, tc.userID)
			require.Equal(t, tc.wantOK, ok)
			require.Equal(t, tc.wantUser, parsed)
		})
	}
}

func TestShouldPendingReview(t *testing.T) {
	t.Parallel()

	require.False(t, ShouldPendingReview(100, 0), "threshold 0 disables the feature")
	require.False(t, ShouldPendingReview(100, -1), "negative threshold disables the feature")
	require.False(t, ShouldPendingReview(10, 100), "below threshold auto-credits")
	require.False(t, ShouldPendingReview(100, 100), "equal to threshold auto-credits (> is strict)")
	require.True(t, ShouldPendingReview(100.01, 100), "just above threshold pends review")
	require.True(t, ShouldPendingReview(2500, 500), "way above threshold pends review")
}
