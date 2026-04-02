## ADDED Requirements

### Requirement: 服务未启用时返回友好错误提示
当 Octelium 服务未启用时，创建设备令牌的 API SHALL 返回 i18n 国际化错误消息，提示用户联系管理员配置 Octelium 服务。

#### Scenario: 服务未启用时创建设备令牌
- **WHEN** 用户调用创建设备令牌 API 且 Octelium 服务未启用
- **THEN** 返回 i18n 错误消息"设备令牌服务未启用，请联系管理员配置 OCTELIUM_AUTH_TOKEN"

### Requirement: 启动日志须输出 Octelium 服务状态
后端启动时 SHALL 在日志中输出 Octelium 服务的启用状态及原因。

#### Scenario: 未配置 auth token
- **WHEN** 环境变量 `OCTELIUM_AUTH_TOKEN` 未设置
- **THEN** 启动日志输出 "Octelium service disabled: OCTELIUM_AUTH_TOKEN not set"

#### Scenario: 配置了 auth token 且 gRPC 连接成功
- **WHEN** 环境变量 `OCTELIUM_AUTH_TOKEN` 已设置且 gRPC 连接成功
- **THEN** 启动日志输出 "Octelium service enabled, connected to {domain}"

### Requirement: .env.example 须包含 OCTELIUM_AUTH_TOKEN
`.env.example` 文件 SHALL 包含 `OCTELIUM_AUTH_TOKEN` 配置项及说明。

#### Scenario: 查看 .env.example
- **WHEN** 开发者查看 `.env.example`
- **THEN** 可以看到 `OCTELIUM_AUTH_TOKEN` 配置项及其用途说明
