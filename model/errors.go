package model

import "errors"

// Common errors
var (
	ErrDatabase = errors.New("database error")
)

// User auth errors
var (
	ErrInvalidCredentials   = errors.New("invalid credentials")
	ErrUserEmptyCredentials = errors.New("empty credentials")
)

// Token auth errors
var (
	ErrTokenNotProvided = errors.New("token not provided")
	ErrTokenInvalid     = errors.New("token invalid")
)

// Redemption errors
var ErrRedeemFailed = errors.New("redeem.failed")

// Flash sale errors
var (
	ErrFlashSaleAlreadyGrabed = errors.New("flash_sale.already_grabbed")
	ErrFlashSaleSoldOut       = errors.New("flash_sale.sold_out")
	ErrFlashSaleInvalidStatus = errors.New("flash_sale.invalid_status")
	ErrFlashSaleNotYours      = errors.New("flash_sale.not_yours")
	ErrFlashSaleExpired       = errors.New("flash_sale.expired")
)

// 2FA errors
var ErrTwoFANotEnabled = errors.New("2fa not enabled")
