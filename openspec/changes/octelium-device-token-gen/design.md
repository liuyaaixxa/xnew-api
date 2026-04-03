## Context

现有 `OcteliumService` 是占位实现，使用 mock token。需要集成 Octelium Go SDK (`github.com/octelium/octelium/octelium-go`)，通过 gRPC 与 Octelium 云通信。

SDK 架构：
- `octelium.NewClient(ctx, &ClientConfig{Domain, AuthenticationToken})` 创建客户端
- `client.GRPC().GetConn(ctx)` 获取 gRPC 连接
- `corev1.NewMainServiceClient(grpcConn)` 创建管理客户端
- 用户管理：`CreateUser`, `GetUser`, `ListUser`
- 凭证管理：`CreateCredential`, `GenerateCredentialToken`

## Goals / Non-Goals

**Goals:**
- 使用 Octelium SDK 替换占位实现
- 创建设备令牌时自动检查/创建 Octelium 用户
- 通过 Credential + GenerateCredentialToken 生成真实 auth-token
- 保持现有接口不变（`OcteliumServiceInterface`）

**Non-Goals:**
- 不修改前端代码
- 不修改 controller 层逻辑
- 不实现 Octelium 用户删除/同步

## Decisions

1. **SDK 客户端生命周期**：在 `GetOcteliumService()` 初始化时创建 `octelium.Client`，作为长连接复用。
   - 备选：每次请求创建新客户端 → 不采用，gRPC 连接建立开销大

2. **用户命名策略**：使用系统用户的 username 作为 Octelium 用户名，格式 `newapi-{username}`。
   - 备选：使用 user ID → 不采用，可读性差

3. **Credential 命名策略**：`{octelium-username}-{device-name}` 格式，确保唯一性。

4. **环境变量**：
   - `OCTELIUM_AUTH_TOKEN` — 管理员 auth-token（替代 `OCTELIUM_API_KEY`）
   - `OCTELIUM_DEFAULT_DOMAIN` — 默认域名（fallback: `teniuapi.cloud`）

## Risks / Trade-offs

- [SDK 依赖较重] → octelium-go 依赖 gRPC + protobuf，会增加二进制大小
- [网络依赖] → Octelium 云不可用时创建令牌会失败 → 已有 `IsEnabled()` 检查，服务未配置时跳过
- [用户名冲突] → 加 `newapi-` 前缀避免与 Octelium 原生用户冲突
