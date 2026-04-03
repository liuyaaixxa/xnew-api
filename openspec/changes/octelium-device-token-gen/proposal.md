## Why

当前设备令牌创建使用占位实现（mock token），需要集成真正的 Octelium Go SDK 来生成可用于连接 Teniu Cloud 的 auth-token。用户创建设备令牌时，系统需要：检查用户是否在 Octelium 云端存在，不存在则创建，然后通过 SDK 生成真实的 authentication token。

## What Changes

- 集成 `github.com/octelium/octelium/octelium-go` SDK 到项目
- 重写 `OcteliumService` 使用真实 SDK 客户端替代占位实现
- 新增 Octelium 用户管理：检查/创建用户（通过 `corev1.MainServiceClient`）
- 新增凭证管理：创建 Credential 并生成 AuthenticationToken
- 环境变量 `OCTELIUM_AUTH_TOKEN` 替代 `OCTELIUM_API_KEY` 用于 SDK 认证

## Capabilities

### New Capabilities
- `octelium-sdk-integration`: 集成 Octelium Go SDK，实现用户检查/创建和 auth-token 生成

### Modified Capabilities

## Impact

- `go.mod` / `go.sum` — 新增 octelium-go SDK 依赖
- `service/octelium_service.go` — 重写为真实 SDK 实现
- `service/octelium_service_test.go` — 更新测试
- 环境变量变更：新增 `OCTELIUM_AUTH_TOKEN`，`OCTELIUM_DEFAULT_DOMAIN`
