package controller

import (
	"fmt"
	"net"
	"strconv"
	"strings"
)

// Pure guard helpers for the /epay/notify callback path. Kept separate from
// the handler so they can be exhaustively unit-tested without gin, DB, or
// time dependencies.

// CheckCallbackIPAllowed verifies whether clientIP falls within the
// whitelist defined by a comma-separated list of IPs and/or CIDR blocks.
//
// An empty whitelist returns (true, "") — the feature is opt-in, so a
// fresh deploy preserves the pre-hardening behavior until an admin
// configures real values.
func CheckCallbackIPAllowed(clientIP string, allowedIPs string) (allowed bool, reason string) {
	trimmed := strings.TrimSpace(allowedIPs)
	if trimmed == "" {
		return true, "whitelist empty, skipping"
	}
	ip := net.ParseIP(strings.TrimSpace(clientIP))
	if ip == nil {
		return false, fmt.Sprintf("client IP %q is not a valid IP address", clientIP)
	}

	for _, raw := range strings.Split(trimmed, ",") {
		entry := strings.TrimSpace(raw)
		if entry == "" {
			continue
		}
		// CIDR form?
		if strings.Contains(entry, "/") {
			_, cidr, err := net.ParseCIDR(entry)
			if err != nil {
				// Malformed CIDR in config — skip, but keep checking others.
				continue
			}
			if cidr.Contains(ip) {
				return true, "matched CIDR " + entry
			}
			continue
		}
		// Plain IP form.
		if parsed := net.ParseIP(entry); parsed != nil && parsed.Equal(ip) {
			return true, "matched IP " + entry
		}
	}
	return false, fmt.Sprintf("client IP %s not in whitelist", clientIP)
}

// CheckOrderAge returns (true, ageSeconds) if the order's age is within
// maxAgeSeconds. maxAgeSeconds <= 0 disables the check entirely — callers
// can still use ageSeconds for logging.
//
// now is injected so tests can pin it without monkey-patching time.Now.
func CheckOrderAge(createTime int64, now int64, maxAgeSeconds int) (valid bool, ageSeconds int64) {
	ageSeconds = now - createTime
	if maxAgeSeconds <= 0 {
		return true, ageSeconds
	}
	if createTime <= 0 {
		// Missing create time; don't block — treat as skip so we don't
		// fail legit callbacks on legacy rows.
		return true, ageSeconds
	}
	return ageSeconds <= int64(maxAgeSeconds), ageSeconds
}

// CheckTradeNoOwnership confirms the tradeNo encodes the same user_id as
// the order row. topup.go creates trade_no as "USR{user_id}NO{random}";
// we parse the digits after "USR" and before "NO" and compare. Any parsing
// failure results in (false, 0) so a badly-shaped trade_no is rejected
// rather than silently accepted.
func CheckTradeNoOwnership(tradeNo string, orderUserID int) (match bool, parsedUserID int) {
	const prefix = "USR"
	if !strings.HasPrefix(tradeNo, prefix) {
		return false, 0
	}
	rest := tradeNo[len(prefix):]
	idx := strings.Index(rest, "NO")
	if idx <= 0 {
		return false, 0
	}
	parsed, err := strconv.Atoi(rest[:idx])
	if err != nil {
		return false, 0
	}
	return parsed == orderUserID, parsed
}

// CheckSubscriptionTradeNoOwnership is the SUBUSR-prefixed variant used by
// subscription orders. Format: "SUBUSR{user_id}NO{random}".
func CheckSubscriptionTradeNoOwnership(tradeNo string, orderUserID int) (match bool, parsedUserID int) {
	const prefix = "SUBUSR"
	if !strings.HasPrefix(tradeNo, prefix) {
		return false, 0
	}
	rest := tradeNo[len(prefix):]
	idx := strings.Index(rest, "NO")
	if idx <= 0 {
		return false, 0
	}
	parsed, err := strconv.Atoi(rest[:idx])
	if err != nil {
		return false, 0
	}
	return parsed == orderUserID, parsed
}

// ShouldPendingReview decides whether an incoming topup should enter
// manual review rather than auto-credit. threshold <= 0 disables the
// feature (pre-hardening behavior).
func ShouldPendingReview(money float64, threshold float64) bool {
	if threshold <= 0 {
		return false
	}
	return money > threshold
}
