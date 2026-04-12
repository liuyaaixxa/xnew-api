# Openfort Wallet Phase 1 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Openfort embedded wallet (Solana) support — auto-create wallet on user registration, wallet info page in console.

**Architecture:** Backend-driven wallet creation via Openfort REST API. User model gets two new fields. Settings system stores API keys (admin-configurable). Registration hooks trigger async wallet creation. Frontend adds a wallet page under `/console/wallet`.

**Tech Stack:** Go + Gin + GORM (backend), Openfort REST API, React + Semi Design (frontend), i18next (i18n)

---

### Task 1: Configuration — Setting Variables for Openfort

**Files:**
- Create: `setting/openfort.go`
- Modify: `model/option.go:83-97` (InitOptionMap) and `model/option.go:357-384` (UpdateOption switch)

**Step 1: Create setting/openfort.go**

```go
package setting

var OpenfortApiKey = ""
var OpenfortShieldPublishableKey = ""
var OpenfortShieldSecretKey = ""
var OpenfortEncryptionShare = ""
```

**Step 2: Register in model/option.go InitOptionMap**

After line ~97 (after WaffoSandboxApiKey), add:

```go
common.OptionMap["OpenfortApiKey"] = setting.OpenfortApiKey
common.OptionMap["OpenfortShieldPublishableKey"] = setting.OpenfortShieldPublishableKey
common.OptionMap["OpenfortShieldSecretKey"] = setting.OpenfortShieldSecretKey
common.OptionMap["OpenfortEncryptionShare"] = setting.OpenfortEncryptionShare
```

**Step 3: Add UpdateOption cases**

After the Waffo cases in the switch block, add:

```go
case "OpenfortApiKey":
    setting.OpenfortApiKey = value
case "OpenfortShieldPublishableKey":
    setting.OpenfortShieldPublishableKey = value
case "OpenfortShieldSecretKey":
    setting.OpenfortShieldSecretKey = value
case "OpenfortEncryptionShare":
    setting.OpenfortEncryptionShare = value
```

**Step 4: Commit**

```
git add setting/openfort.go model/option.go
git commit -m "feat(openfort): add Openfort setting variables and option registration"
```

---

### Task 2: Data Model — Add Wallet Fields to User

**Files:**
- Modify: `model/user.go:52` (User struct, after StripeCustomer field)

**Step 1: Add fields to User struct**

After `StripeCustomer` (line 52), add:

```go
OpenfortPlayerId string `json:"openfort_player_id" gorm:"column:openfort_player_id;index"`
SolanaAddress    string `json:"solana_address" gorm:"column:solana_address;index"`
```

GORM AutoMigrate will auto-add these columns on startup for all three databases.

**Step 2: Verify the fields don't leak in setupLogin**

Check `controller/user.go` setupLogin function — it returns `user` JSON to the client. The new fields are non-sensitive (wallet address is public), so no cleanup needed. But verify `OpenfortPlayerId` is acceptable to expose. If not, add it to any sanitization logic.

**Step 3: Build and run tests**

```bash
go build ./...
go test ./model/... -count=1
```

**Step 4: Commit**

```
git add model/user.go
git commit -m "feat(openfort): add OpenfortPlayerId and SolanaAddress to User model"
```

---

### Task 3: Openfort Service — HTTP Client

**Files:**
- Create: `service/openfort.go`

**Step 1: Implement the Openfort service**

```go
package service

import (
    "fmt"
    "io"
    "net/http"
    "net/url"
    "strings"

    "github.com/QuantumNous/new-api/common"
    "github.com/QuantumNous/new-api/model"
    "github.com/QuantumNous/new-api/setting"
)

const openfortBaseURL = "https://api.openfort.xyz"

// CreateOpenfortWallet creates an Openfort player with a pre-generated
// Solana embedded wallet for the given user. It is safe to call from a
// goroutine — errors are logged but never returned to the caller.
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
    if user.OpenfortPlayerId != "" {
        return
    }

    // Step 1: Create player with pre-generated embedded account
    playerId, solanaAddress, err := createPlayerWithWallet(fmt.Sprintf("%d", userId))
    if err != nil {
        common.SysError(fmt.Sprintf("openfort: failed to create wallet for user %d: %v", userId, err))
        return
    }

    // Step 2: Update user record
    err = model.DB.Model(&model.User{}).Where("id = ?", userId).Updates(map[string]interface{}{
        "openfort_player_id": playerId,
        "solana_address":     solanaAddress,
    }).Error
    if err != nil {
        common.SysError(fmt.Sprintf("openfort: failed to save wallet for user %d: %v", userId, err))
        return
    }

    common.SysLog(fmt.Sprintf("openfort: created wallet for user %d, player=%s, address=%s", userId, playerId, solanaAddress))
}

func createPlayerWithWallet(thirdPartyUserId string) (playerId string, address string, err error) {
    // POST /iam/v1/players with preGenerateEmbeddedAccount
    form := url.Values{}
    form.Set("thirdPartyUserId", thirdPartyUserId)
    form.Set("preGenerateEmbeddedAccount", "true")

    req, err := http.NewRequest("POST", openfortBaseURL+"/iam/v1/players", strings.NewReader(form.Encode()))
    if err != nil {
        return "", "", fmt.Errorf("build request: %w", err)
    }
    req.SetBasicAuth(setting.OpenfortApiKey, "")
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return "", "", fmt.Errorf("http request: %w", err)
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
        return "", "", fmt.Errorf("openfort API returned %d: %s", resp.StatusCode, string(body))
    }

    // Parse response
    var result map[string]interface{}
    if err := common.Unmarshal(body, &result); err != nil {
        return "", "", fmt.Errorf("parse response: %w", err)
    }

    id, _ := result["id"].(string)
    if id == "" {
        return "", "", fmt.Errorf("no player id in response: %s", string(body))
    }

    // Extract address from linkedAccounts or accounts
    addr := extractSolanaAddress(result)

    return id, addr, nil
}

func extractSolanaAddress(result map[string]interface{}) string {
    // Try accounts array first
    if accounts, ok := result["accounts"].([]interface{}); ok {
        for _, acc := range accounts {
            if accMap, ok := acc.(map[string]interface{}); ok {
                if addr, ok := accMap["address"].(string); ok && addr != "" {
                    return addr
                }
            }
        }
    }
    // Try linkedAccounts
    if linked, ok := result["linkedAccounts"].([]interface{}); ok {
        for _, la := range linked {
            if laMap, ok := la.(map[string]interface{}); ok {
                if addr, ok := laMap["address"].(string); ok && addr != "" {
                    return addr
                }
            }
        }
    }
    return ""
}
```

**Step 2: Build**

```bash
go build ./service/...
```

**Step 3: Commit**

```
git add service/openfort.go
git commit -m "feat(openfort): add Openfort HTTP client service for wallet creation"
```

---

### Task 4: Wallet Controller — API Endpoints

**Files:**
- Create: `controller/wallet.go`
- Modify: `router/api-router.go:95` (add routes in selfRoute block)

**Step 1: Create controller/wallet.go**

```go
package controller

import (
    "github.com/QuantumNous/new-api/model"
    "github.com/QuantumNous/new-api/service"
    "github.com/QuantumNous/new-api/setting"
    "github.com/gin-gonic/gin"
    "net/http"
)

func GetWallet(c *gin.Context) {
    userId := c.GetInt("id")
    user, err := model.GetUserById(userId, false)
    if err != nil {
        c.JSON(http.StatusOK, gin.H{
            "success": false,
            "message": "failed to get user",
        })
        return
    }

    status := "not_created"
    if user.OpenfortPlayerId != "" && user.SolanaAddress != "" {
        status = "created"
    } else if user.OpenfortPlayerId != "" {
        status = "creating"
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "openfort_player_id": user.OpenfortPlayerId,
            "solana_address":     user.SolanaAddress,
            "status":             status,
            "enabled":            setting.OpenfortApiKey != "",
        },
    })
}

func CreateWallet(c *gin.Context) {
    if setting.OpenfortApiKey == "" {
        c.JSON(http.StatusOK, gin.H{
            "success": false,
            "message": "Openfort is not configured",
        })
        return
    }

    userId := c.GetInt("id")
    user, err := model.GetUserById(userId, false)
    if err != nil {
        c.JSON(http.StatusOK, gin.H{
            "success": false,
            "message": "failed to get user",
        })
        return
    }

    if user.OpenfortPlayerId != "" && user.SolanaAddress != "" {
        c.JSON(http.StatusOK, gin.H{
            "success": false,
            "message": "wallet already exists",
        })
        return
    }

    // Synchronous creation for manual trigger
    service.CreateOpenfortWallet(userId)

    // Re-fetch to get updated data
    user, _ = model.GetUserById(userId, false)
    status := "not_created"
    if user.OpenfortPlayerId != "" && user.SolanaAddress != "" {
        status = "created"
    }

    c.JSON(http.StatusOK, gin.H{
        "success": status == "created",
        "message": map[bool]string{true: "wallet created", false: "wallet creation failed"}[status == "created"],
        "data": gin.H{
            "openfort_player_id": user.OpenfortPlayerId,
            "solana_address":     user.SolanaAddress,
            "status":             status,
        },
    })
}
```

**Step 2: Add routes in router/api-router.go**

In the selfRoute block (after line ~110, after OAuth bindings routes), add:

```go
// Wallet routes
selfRoute.GET("/wallet", controller.GetWallet)
selfRoute.POST("/wallet/create", middleware.CriticalRateLimit(), controller.CreateWallet)
```

**Step 3: Build**

```bash
go build ./...
```

**Step 4: Commit**

```
git add controller/wallet.go router/api-router.go
git commit -m "feat(openfort): add wallet API endpoints (GET + POST create)"
```

---

### Task 5: Registration Hooks — Auto-Create Wallet

**Files:**
- Modify: `controller/user.go:220` (after token creation in Register)
- Modify: `model/user.go:492` (end of FinalizeOAuthUserCreation)

**Step 1: Add hook in controller/user.go Register()**

After line 220 (after default token creation block, before the success response), add:

```go
// Async: create Openfort wallet for new user
go service.CreateOpenfortWallet(insertedUser.Id)
```

Add import `"github.com/QuantumNous/new-api/service"` if not already imported.

**Step 2: Add hook in model/user.go FinalizeOAuthUserCreation()**

At the end of FinalizeOAuthUserCreation (before closing `}`), add:

```go
// Async: create Openfort wallet for new OAuth user
go service.CreateOpenfortWallet(user.Id)
```

Add import `"github.com/QuantumNous/new-api/service"` to model/user.go imports.

Note: This creates a circular import risk (model → service → model). If this happens, move the goroutine call to the controller level instead. In `controller/oauth.go`, after `findOrCreateOAuthUser` returns successfully for a new user, add the goroutine there.

**Step 3: Build and verify**

```bash
go build ./...
```

If circular import error occurs, revert model/user.go change and instead add the hook in `controller/oauth.go` after line 327 (both the custom and built-in provider paths).

**Step 4: Commit**

```
git add controller/user.go model/user.go
git commit -m "feat(openfort): auto-create wallet on user registration (async)"
```

---

### Task 6: Frontend — Sidebar + Routing

**Files:**
- Modify: `web/src/components/layout/SiderBar.jsx:54` (routerMap) and `:138` (financeItems)
- Modify: `web/src/helpers/render.jsx:78` (icon import) and `:150` (icon case)
- Modify: `web/src/App.jsx:39` (import) and `:302` (route)
- Create: `web/src/pages/Wallet/index.js`

**Step 1: Add route to SiderBar.jsx routerMap (line 54)**

```js
wallet: '/console/wallet',
```

**Step 2: Add wallet to financeItems (after topup item, line ~138)**

```js
{
  text: t('加密钱包'),
  itemKey: 'wallet',
  to: '/wallet',
},
```

**Step 3: Add icon in render.jsx**

Import `Wallet` from lucide-react (add to line 78 imports):

```js
Wallet as WalletIcon,
```

Add case before `default` (line ~150):

```js
case 'wallet':
  return <WalletIcon {...commonProps} color={iconColor} />;
```

**Step 4: Add route in App.jsx**

Import (with the other page imports around line 39):

```js
import Wallet from './pages/Wallet';
```

Add route after topup route (after line 302):

```jsx
<Route
  path='/console/wallet'
  element={
    <PrivateRoute>
      <Suspense fallback={<Loading></Loading>} key={location.pathname}>
        <Wallet />
      </Suspense>
    </PrivateRoute>
  }
/>
```

**Step 5: Create web/src/pages/Wallet/index.js**

```js
import WalletPage from '../../components/wallet';
export default WalletPage;
```

**Step 6: Commit**

```
git add web/src/components/layout/SiderBar.jsx web/src/helpers/render.jsx web/src/App.jsx web/src/pages/Wallet/index.js
git commit -m "feat(openfort): add wallet route, sidebar item, and icon"
```

---

### Task 7: Frontend — Wallet Page Component

**Files:**
- Create: `web/src/components/wallet/index.jsx`

**Step 1: Create the wallet page component**

```jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Typography,
  Button,
  Spin,
  Toast,
  Banner,
  Tag,
} from '@douyinfe/semi-ui';
import { Copy, Wallet, CheckCircle, AlertCircle } from 'lucide-react';
import { API, showError } from '../../helpers';

const { Title, Text, Paragraph } = Typography;

export default function WalletPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [wallet, setWallet] = useState(null);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/user/wallet');
      const { success, data } = res.data;
      if (success) {
        setWallet(data);
      }
    } catch (e) {
      showError(t('获取钱包信息失败'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await API.post('/api/user/wallet/create');
      const { success, message } = res.data;
      if (success) {
        Toast.success(t('钱包创建成功'));
        fetchWallet();
      } else {
        showError(message || t('钱包创建失败'));
      }
    } catch (e) {
      showError(t('钱包创建失败'));
    } finally {
      setCreating(false);
    }
  };

  const copyAddress = () => {
    if (wallet?.solana_address) {
      navigator.clipboard.writeText(wallet.solana_address);
      Toast.success(t('已复制到剪贴板'));
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size='large' />
      </div>
    );
  }

  if (!wallet?.enabled) {
    return (
      <div style={{ padding: '24px' }}>
        <Banner
          type='info'
          description={t('管理员尚未配置加密钱包功能')}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 640 }}>
      <Title heading={4} style={{ marginBottom: 24 }}>
        <Wallet size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        {t('加密钱包')}
      </Title>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <Text strong style={{ marginRight: 8 }}>{t('钱包状态')}</Text>
          {wallet.status === 'created' ? (
            <Tag color='green' prefixIcon={<CheckCircle size={12} />}>
              {t('已创建')}
            </Tag>
          ) : (
            <Tag color='orange' prefixIcon={<AlertCircle size={12} />}>
              {t('未创建')}
            </Tag>
          )}
        </div>

        {wallet.status === 'created' ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <Text type='secondary' size='small'>{t('区块链网络')}</Text>
              <div><Text strong>Solana</Text></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text type='secondary' size='small'>{t('钱包地址')}</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Paragraph
                  copyable={false}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    wordBreak: 'break-all',
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {wallet.solana_address}
                </Paragraph>
                <Button
                  icon={<Copy size={14} />}
                  size='small'
                  theme='borderless'
                  onClick={copyAddress}
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Text type='tertiary' style={{ display: 'block', marginBottom: 16 }}>
              {t('您还没有创建加密钱包，点击下方按钮创建')}
            </Text>
            <Button
              theme='solid'
              type='primary'
              loading={creating}
              onClick={handleCreate}
            >
              {t('创建钱包')}
            </Button>
          </div>
        )}
      </Card>

      <Banner
        type='info'
        description={t('加密钱包用于未来接收节点收益（Solana USDC）。钱包地址是您在区块链上的唯一标识。')}
        style={{ marginTop: 16 }}
      />
    </div>
  );
}
```

**Step 2: Build frontend**

```bash
cd web && bun run build
```

**Step 3: Commit**

```
git add web/src/components/wallet/index.jsx
git commit -m "feat(openfort): add wallet page component with status display and create button"
```

---

### Task 8: i18n — Add Translations

**Files:**
- Modify: `web/src/i18n/locales/en.json`
- Modify: `web/src/i18n/locales/ja.json`
- Modify: `web/src/i18n/locales/fr.json`
- Modify: `web/src/i18n/locales/ru.json`
- Modify: `web/src/i18n/locales/vi.json`
- Modify: `web/src/i18n/locales/zh-TW.json`
- Verify: `web/src/i18n/locales/zh.json` (zh is the source language, keys match Chinese text)

**Keys to add to each locale file:**

| Chinese Key (source) | en | ja | fr | ru | vi | zh-TW |
|---|---|---|---|---|---|---|
| 加密钱包 | Crypto Wallet | 暗号ウォレット | Portefeuille Crypto | Крипто-кошелёк | Ví tiền điện tử | 加密錢包 |
| 钱包状态 | Wallet Status | ウォレット状態 | État du portefeuille | Статус кошелька | Trạng thái ví | 錢包狀態 |
| 已创建 | Created | 作成済み | Créé | Создан | Đã tạo | 已建立 |
| 未创建 | Not Created | 未作成 | Non créé | Не создан | Chưa tạo | 未建立 |
| 区块链网络 | Blockchain Network | ブロックチェーンネットワーク | Réseau Blockchain | Сеть блокчейн | Mạng Blockchain | 區塊鏈網路 |
| 钱包地址 | Wallet Address | ウォレットアドレス | Adresse du portefeuille | Адрес кошелька | Địa chỉ ví | 錢包地址 |
| 已复制到剪贴板 | Copied to clipboard | クリップボードにコピーしました | Copié dans le presse-papiers | Скопировано | Đã sao chép | 已複製到剪貼簿 |
| 获取钱包信息失败 | Failed to get wallet info | ウォレット情報の取得に失敗しました | Échec de récupération du portefeuille | Ошибка получения данных кошелька | Lấy thông tin ví thất bại | 取得錢包資訊失敗 |
| 管理员尚未配置加密钱包功能 | Crypto wallet is not configured by admin | 管理者が暗号ウォレット機能を設定していません | Le portefeuille crypto n'est pas configuré | Крипто-кошелёк не настроен администратором | Quản trị viên chưa cấu hình ví tiền điện tử | 管理員尚未設定加密錢包功能 |
| 您还没有创建加密钱包，点击下方按钮创建 | You haven't created a crypto wallet yet. Click below to create one. | 暗号ウォレットがまだ作成されていません。下のボタンをクリックして作成してください。 | Vous n'avez pas encore créé de portefeuille. Cliquez ci-dessous. | У вас ещё нет крипто-кошелька. Нажмите ниже для создания. | Bạn chưa tạo ví tiền điện tử. Nhấn nút bên dưới để tạo. | 您尚未建立加密錢包，請點擊下方按鈕建立 |
| 创建钱包 | Create Wallet | ウォレットを作成 | Créer le portefeuille | Создать кошелёк | Tạo ví | 建立錢包 |
| 钱包创建成功 | Wallet created successfully | ウォレットが作成されました | Portefeuille créé avec succès | Кошелёк успешно создан | Tạo ví thành công | 錢包建立成功 |
| 钱包创建失败 | Failed to create wallet | ウォレットの作成に失敗しました | Échec de la création du portefeuille | Ошибка создания кошелька | Tạo ví thất bại | 錢包建立失敗 |
| 加密钱包用于未来接收节点收益（Solana USDC）。钱包地址是您在区块链上的唯一标识。 | Your crypto wallet will be used to receive node earnings (Solana USDC) in the future. The wallet address is your unique identifier on the blockchain. | 暗号ウォレットは将来ノード収益（Solana USDC）の受け取りに使用されます。ウォレットアドレスはブロックチェーン上のあなたの一意の識別子です。 | Votre portefeuille crypto servira à recevoir les revenus de nœuds (Solana USDC). L'adresse est votre identifiant unique sur la blockchain. | Крипто-кошелёк будет использоваться для получения дохода от узлов (Solana USDC). Адрес кошелька — ваш уникальный идентификатор в блокчейне. | Ví tiền điện tử sẽ được dùng để nhận thu nhập từ node (Solana USDC). Địa chỉ ví là mã định danh duy nhất của bạn trên blockchain. | 加密錢包用於未來接收節點收益（Solana USDC）。錢包地址是您在區塊鏈上的唯一標識。 |

**Step 1:** Add each key-value pair to the respective locale JSON files.

**Step 2: Build frontend**

```bash
cd web && bun run build
```

**Step 3: Commit**

```
git add web/src/i18n/locales/
git commit -m "feat(openfort): add wallet i18n translations for all 7 locales"
```

---

### Task 9: Full Build + Manual Test

**Step 1: Build backend**

```bash
go build ./...
```

**Step 2: Build frontend**

```bash
cd web && bun run build
```

**Step 3: Start backend locally**

```bash
go run main.go
```

**Step 4: Test wallet API**

```bash
# Without auth (should fail)
curl http://localhost:3000/api/user/wallet

# With auth (login first, get session cookie, then)
curl -b cookies.txt http://localhost:3000/api/user/wallet
```

**Step 5: Test frontend**

Open http://localhost:3000 → login → navigate to /console/wallet → verify page renders.

**Step 6: Final commit if any fixes needed**

```
git commit -m "fix(openfort): address issues found in manual testing"
```
