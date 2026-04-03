## Context

`ensureOcteliumUser` 在创建 Octelium 用户时只设置了 `Type: HUMAN`，未设置 `Authorization` 字段。Octelium 的权限模型要求用户绑定策略（policy）才能访问服务。`User_Spec_Authorization` protobuf 类型有 `Policies []string` 字段，可以传入策略名称列表如 `["allow-all"]`。

## Goals / Non-Goals

**Goals:**
- 创建 Octelium 用户时附加授权策略，解决 PermissionDenied 错误
- 通过环境变量 `OCTELIUM_USER_POLICIES` 配置策略列表，默认为 `allow-all`
- 开发调试阶段使用 `allow-all` 默认配置

**Non-Goals:**
- 不实现细粒度的按用户策略分配
- 不修改已存在的 Octelium 用户的策略（仅影响新创建的用户）

## Decisions

1. **环境变量格式**：`OCTELIUM_USER_POLICIES` 使用逗号分隔的策略名称列表（如 `allow-all,read-only`），默认值为 `allow-all`
2. **存储位置**：策略列表存储在 `OcteliumService.userPolicies []string` 字段中
3. **应用时机**：仅在 `CreateUser` 调用时设置，不修改已有用户

## Risks / Trade-offs

- [安全风险] `allow-all` 策略授予完全权限 → 仅作为开发调试默认值，生产环境应通过环境变量配置更细粒度的策略
