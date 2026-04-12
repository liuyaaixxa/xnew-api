# Openfort Wallet Integration — Phase 1 Design

**Date:** 2026-04-12
**Scope:** Backend Openfort API integration + auto wallet creation on registration + frontend wallet page
**Chain:** Solana (embedded wallet)

## Context

Teniu.AI is a DePIN platform where home nodes share local AI services (Ollama etc.) to the cloud. Node contributors earn revenue and need a crypto wallet for future USDC payouts. Phase 1 establishes the wallet foundation: automatic Openfort embedded wallet creation on user registration + a wallet info page in the console.

## Data Model

Add two fields to `model/user.go` User struct:

```go
OpenfortPlayerId string `json:"openfort_player_id" gorm:"column:openfort_player_id;index"`
SolanaAddress    string `json:"solana_address" gorm:"column:solana_address;index"`
```

GORM AutoMigrate handles migration for all three databases (SQLite, MySQL, PostgreSQL).

## Backend

### Configuration (`common/openfort.go`)

Environment variables:
- `OPENFORT_API_KEY` — Secret key (`sk_test_...`)
- `OPENFORT_SHIELD_PUBLISHABLE_KEY`
- `OPENFORT_SHIELD_SECRET_KEY`
- `OPENFORT_ENCRYPTION_SHARE`

### Service (`service/openfort.go`)

HTTP client wrapping Openfort REST API:
- `CreateOpenfortWallet(userId int) error` — Creates Player + Embedded Wallet, updates User record
- API flow:
  1. `POST https://api.openfort.xyz/v1/players` → get Player ID
  2. `POST https://api.openfort.xyz/v1/accounts` → create embedded wallet on Solana chain → get address
  3. Update `User.OpenfortPlayerId` and `User.SolanaAddress`

### Controller (`controller/wallet.go`)

- `GET /api/user/wallet` — Return current user's wallet info (player ID, address, status)
- `POST /api/user/wallet/create` — Manual wallet creation (fallback if async creation failed)

### Registration Hook

In `controller/user.go` Register() and `controller/oauth.go` OAuth registration:
- After successful user creation, spawn `go service.CreateOpenfortWallet(user.Id)`
- Async — registration is not blocked if Openfort API is slow/down

### API Routes (`router/api-router.go`)

```
GET  /api/user/wallet        → controller.GetWallet
POST /api/user/wallet/create → controller.CreateWallet
```

Both require auth middleware.

## Frontend

### Sidebar (`SiderBar.jsx`)

Add to "Personal" section:
```jsx
{ text: t('加密钱包'), itemKey: 'wallet', to: '/wallet' }
```

Route map: `wallet: '/console/wallet'`

### Wallet Page (`web/src/pages/Wallet/index.jsx`)

Card-based layout consistent with existing TopUp page:
- **Wallet Card:** Solana address (copyable), creation status indicator
- **Status states:** Created (green) / Creating (loading) / Not Created (with "Create Wallet" button)
- Uses Semi Design components (Card, Typography, Button, Toast)

### i18n

Add wallet-related keys to all 7 locale files (zh, en, ja, fr, ru, vi, zh-TW).

## Not In Scope (Phase 2+)

- Fiat payments (Lemon Squeezy)
- USDC withdrawal/payout
- Openfort OAuth login
- Multi-chain support
- Wallet balance queries (requires Solana RPC)
- Wallet transaction history
