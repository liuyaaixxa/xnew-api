## Why

创建设备令牌后生成的 auth-token 可以登录 Octelium 集群，但无法访问服务，报错 `gRPC error PermissionDenied: Octelium: Unauthorized`。根因是 `ensureOcteliumUser` 创建用户时未设置 `Authorization.Policies`，导致用户没有任何权限策略。

## What Changes

- 修改 `ensureOcteliumUser` 方法，在创建 Octelium 用户时设置 `Authorization.Policies`
- 新增环境变量 `OCTELIUM_USER_POLICIES` 用于配置默认策略列表，默认值为 `allow-all`
- 将策略配置存储在 `OcteliumService` 结构体中，初始化时从环境变量读取

## Capabilities

### New Capabilities
- `octelium-user-policies`: 创建 Octelium 用户时附加授权策略，支持环境变量配置

### Modified Capabilities

## Impact

- `service/octelium_service.go` — 修改 `OcteliumService` 结构体、`GetOcteliumService()` 初始化、`ensureOcteliumUser` 方法
- `.env.example` — 添加 `OCTELIUM_USER_POLICIES` 配置项
