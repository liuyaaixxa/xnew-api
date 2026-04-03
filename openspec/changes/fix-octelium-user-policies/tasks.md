## 1. 修改 OcteliumService

- [x] 1.1 在 `OcteliumService` 结构体中添加 `userPolicies []string` 字段
- [x] 1.2 在 `GetOcteliumService()` 中从 `OCTELIUM_USER_POLICIES` 环境变量读取策略列表，默认为 `allow-all`
- [x] 1.3 在启动日志中输出策略配置

## 2. 修改 ensureOcteliumUser

- [x] 2.1 在 `CreateUser` 调用中添加 `Authorization: &corev1.User_Spec_Authorization{Policies: s.userPolicies}`

## 3. 更新配置文档

- [x] 3.1 在 `.env.example` 中添加 `OCTELIUM_USER_POLICIES` 配置项

## 4. 测试验证

- [x] 4.1 第一轮测试：设置环境变量后创建设备令牌，验证不再报 PermissionDenied
- [x] 4.2 第二轮测试：使用默认配置（不设置 OCTELIUM_USER_POLICIES），验证默认使用 allow-all
