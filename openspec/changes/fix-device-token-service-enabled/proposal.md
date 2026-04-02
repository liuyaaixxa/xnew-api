## Why

设备令牌管理页面点击"添加设备令牌"→"创建"时报错 "Device token service is not enabled"。根因是 `OcteliumService` 初始化时依赖环境变量 `OCTELIUM_AUTH_TOKEN`，但该环境变量未在 `.env.example` 中正确文档化，且本地开发/部署时容易遗漏配置。

此外，当 `OCTELIUM_AUTH_TOKEN` 已配置但 gRPC 初始化失败（如 DNS 解析失败）时，`enabled` 被静默设为 false，没有给用户明确的错误提示，导致难以排查。

## What Changes

- 更新 `.env.example`，添加 `OCTELIUM_AUTH_TOKEN` 配置项说明
- 改进 `OcteliumService` 初始化日志，明确输出 enabled/disabled 状态及原因
- 改进 `AddDeviceToken` 控制器的错误消息，使用 i18n 并提示用户检查配置

## Capabilities

### New Capabilities
- `device-token-service-init`: 改进 Octelium 服务初始化的可观测性和错误提示

### Modified Capabilities

## Impact

- `service/octelium_service.go` — 改进初始化日志
- `controller/device_token.go` — 改进错误消息
- `.env.example` — 添加 `OCTELIUM_AUTH_TOKEN` 文档
