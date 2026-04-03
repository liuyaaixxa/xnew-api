# Device Token Management - Technical Design

## Context

xnew-api 是一个 AI API 网关，需要集成 octelium 网络服务来支持家庭节点共享 GPU/大模型服务。家庭节点通过本地智能网关 (teniulink-node-client) 连接 octelium 云端隧道，而 xnew-api 需要生成设备令牌 (auth-token) 用于设备认证。

### Current State
- 现有"令牌管理"功能用于 API 调用认证
- 无设备令牌管理功能
- 未集成 octelium-go SDK

### Constraints
- Go 1.25+ 后端
- React 18 + Semi Design UI 前端
- SQLite/MySQL/PostgreSQL 多数据库支持
- octelium-go SDK: `github.com/octelium/octelium/octelium-go`

## Goals / Non-Goals

**Goals:**
- 集成 octelium-go SDK
- 实现设备令牌 CRUD 功能
- 前端"设备令牌管理"区域与"令牌管理"布局一致
- 设备令牌与用户关联存储

**Non-Goals:**
- 不实现设备令牌的权限控制（与 API Token 不同）
- 不实现设备令牌的配额管理
- 不实现设备令牌的分组功能

## Decisions

### D1: 数据模型设计

**Decision:** 创建独立的 `device_tokens` 表

**Rationale:**
- 设备令牌与 API Token 用途不同（设备认证 vs API 调用）
- 设备令牌需要存储 octelium 相关信息（domain, auth-token）
- 便于后续扩展设备相关字段

**Model:**
```go
type DeviceToken struct {
    Id          uint   `gorm:"primaryKey" json:"id"`
    UserId      uint   `gorm:"index" json:"user_id"`
    Name        string `gorm:"size:64" json:"name"`           // 设备名称
    Token       string `gorm:"size:512" json:"-"`             // octelium auth-token (敏感)
    TokenMask   string `gorm:"size:32" json:"token_mask"`     // 脱敏显示
    Domain      string `gorm:"size:128" json:"domain"`        // octelium domain
    Status      int    `gorm:"default:1" json:"status"`       // 1:active, 2:disabled
    CreatedTime int64  `gorm:"autoCreateTime" json:"created_time"`
    UpdatedTime int64  `gorm:"autoUpdateTime" json:"updated_time"`
}
```

### D2: octelium-go 集成方式

**Decision:** 封装 octelium-go 客户端为 service 层

**Rationale:**
- 遵循项目分层架构 (Router -> Controller -> Service -> Model)
- 便于 Mock 测试
- 集中管理 octelium 配置

**Integration:**
```go
// service/octelium_service.go
type OcteliumService struct {
    client    *octelium.Client
    domain    string
    authToken string
}

func (s *OcteliumService) GenerateAuthToken(ctx context.Context, req *GenerateTokenRequest) (*TokenResponse, error)
func (s *OcteliumService) RevokeAuthToken(ctx context.Context, token string) error
```

**Alternatives Considered:**
- 直接在 controller 调用 octelium-go: 耦合度高，不利于测试
- 创建独立的 microservice: 过度设计，增加部署复杂度

### D3: API 设计

**Decision:** RESTful API 风格

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/device-token/` | 获取设备令牌列表 |
| POST | `/api/device-token/` | 创建设备令牌 |
| DELETE | `/api/device-token/:id` | 删除设备令牌 |

**Request/Response:**
```json
// POST /api/device-token/
{
  "name": "my-device",
  "domain": "teniuapi.cloud"
}

// Response
{
  "id": 1,
  "name": "my-device",
  "token_mask": "AQpA****Bg",
  "domain": "teniuapi.cloud",
  "status": 1,
  "created_time": 1712345678
}
```

### D4: 前端组件设计

**Decision:** 创建独立的 DeviceTokenCard 组件，复用 Token 管理页面布局

**Component Structure:**
```
web/src/components/DeviceTokenCard/
├── index.jsx          # 主组件
├── AddTokenModal.jsx  # 添加令牌弹窗
└── style.scss         # 样式
```

**Layout:** 与现有 Token 管理卡片布局一致
- 顶部：标题 + 添加按钮
- 中间：令牌列表表格
- 操作：删除按钮

## Risks / Trade-offs

### R1: octelium-go SDK 依赖风险
**Risk:** octelium-go SDK 可能不稳定或 API 变更
**Mitigation:**
- 使用接口抽象 octelium 客户端
- 添加集成测试覆盖关键路径
- 监控 SDK 更新日志

### R2: Auth-token 安全存储
**Risk:** auth-token 存储在数据库可能泄露
**Mitigation:**
- Token 字段使用 `json:"-"` 不在 API 响应中返回
- 返回时使用脱敏的 TokenMask
- 数据库字段考虑加密存储（后续优化）

### R3: 多数据库兼容性
**Risk:** 新表需要兼容 SQLite/MySQL/PostgreSQL
**Mitigation:**
- 使用 GORM 自动迁移
- 避免数据库特定类型
- 遵循项目 Rule 2: 数据库兼容性规范

## Migration Plan

### Phase 1: 后端实现
1. 添加 octelium-go 依赖
2. 创建 DeviceToken 模型
3. 实现 OcteliumService
4. 创建 Controller 和 Router

### Phase 2: 前端实现
1. 创建 DeviceTokenCard 组件
2. 集成到 Token 管理页面
3. 添加 i18n 翻译

### Rollback Strategy
- 数据库迁移可回滚（GORM DropTable）
- 前端组件可独立移除
- 无破坏性变更

## Open Questions

1. **Q:** octelium auth-token 的有效期是多久？是否需要刷新机制？
   **A:** 待确认，初始版本假设 token 长期有效

2. **Q:** 一个用户可以创建多少个设备令牌？
   **A:** 初始版本不限制，后续可添加配额控制

3. **Q:** 设备令牌是否需要支持禁用/启用？
   **A:** 已在模型中预留 status 字段，初始版本仅支持删除