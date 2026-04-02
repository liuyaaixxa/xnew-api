## Context

`OcteliumService` 是设备令牌功能的核心依赖，通过 gRPC 连接 Octelium 云端生成 auth token。当前初始化逻辑（`GetOcteliumService()`）：
1. 读取 `OCTELIUM_AUTH_TOKEN` 环境变量
2. 如果为空，`enabled=false`，静默跳过
3. 如果非空，尝试 gRPC 连接，失败则 `enabled=false`

问题：当服务未启用时，`AddDeviceToken` 返回硬编码英文错误 "Device token service is not enabled"，用户无法理解原因。

## Goals / Non-Goals

**Goals:**
- 让用户在创建设备令牌失败时获得清晰的错误提示
- 让运维人员通过启动日志快速判断 Octelium 服务状态
- 确保 `.env.example` 包含完整的 Octelium 配置说明

**Non-Goals:**
- 不修改 Octelium gRPC 连接逻辑本身
- 不实现自动重连机制

## Decisions

1. **改进启动日志**：在 `GetOcteliumService()` 中，无论 enabled 还是 disabled 都输出明确日志，包含原因
2. **i18n 错误消息**：将 "Device token service is not enabled" 替换为 i18n key，中英文都有友好提示
3. **更新 .env.example**：添加 `OCTELIUM_AUTH_TOKEN` 配置项

## Risks / Trade-offs

- [日志信息泄露] → 不在日志中输出 auth token 值，仅输出是否已配置
