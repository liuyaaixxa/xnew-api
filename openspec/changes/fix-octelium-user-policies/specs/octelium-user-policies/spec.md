## ADDED Requirements

### Requirement: 创建 Octelium 用户时须附加授权策略
系统在调用 Octelium `CreateUser` 接口时 SHALL 在 `User_Spec.Authorization.Policies` 中设置策略列表。

#### Scenario: 使用默认策略创建用户
- **WHEN** 环境变量 `OCTELIUM_USER_POLICIES` 未设置
- **THEN** 创建用户时使用默认策略 `["allow-all"]`

#### Scenario: 使用自定义策略创建用户
- **WHEN** 环境变量 `OCTELIUM_USER_POLICIES` 设置为 `policy-a,policy-b`
- **THEN** 创建用户时使用策略 `["policy-a", "policy-b"]`

### Requirement: 策略配置须通过环境变量可配置
系统 SHALL 支持通过 `OCTELIUM_USER_POLICIES` 环境变量配置默认用户策略列表，使用逗号分隔。

#### Scenario: 启动日志输出策略配置
- **WHEN** Octelium 服务启用
- **THEN** 启动日志中输出当前配置的用户策略列表
