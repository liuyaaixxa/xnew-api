# Device Token Management

## Why

家庭节点需要通过 octelium 网络将自己的闲置 GPU 或大模型 Token 共享到云端服务。为了实现设备与 octelium 云端的打通，需要在 xnew-api 中集成 octelium 客户端，生成 auth-token 用于设备认证和隧道建立。

这是构建"共享服务家庭大模型 Token/GPU 服务平台"的关键基础设施，使普通用户能够通过 xnew-api 网关调用家庭节点共享的网络服务。

## What Changes

- 新增"设备令牌管理"功能模块，与现有"令牌管理"并列
- 集成 octelium-go 客户端 SDK (`github.com/octelium/octelium/octelium-go`)
- 新增设备令牌数据模型，关联用户与 octelium auth-token
- 新增设备令牌 CRUD API 端点
- 新增前端"设备令牌管理"卡片区域，包含添加/删除功能

## Capabilities

### New Capabilities

- `device-token-management`: 设备令牌管理功能，包括：
  - 调用 octelium-go 客户端生成 auth-token
  - 设备令牌与用户关联存储
  - 设备令牌列表展示
  - 设备令牌删除

### Modified Capabilities

- None (这是新增功能，不修改现有规格)

## Impact

### Frontend
- `web/src/pages/Token/index.jsx` - 新增设备令牌管理卡片区域
- `web/src/components/DeviceTokenCard/` - 新增设备令牌管理组件
- `web/src/api/` - 新增设备令牌 API 调用

### Backend
- `model/device_token.go` - 新增设备令牌数据模型
- `controller/device_token.go` - 新增设备令牌控制器
- `router/api-router.go` - 注册设备令牌 API 路由
- `go.mod` - 添加 octelium-go 依赖

### Database
- 新增 `device_tokens` 表

### External Dependencies
- `github.com/octelium/octelium/octelium-go` - Octelium Go SDK