## ADDED Requirements

### Requirement: 复制按钮须复制明文令牌
设备令牌管理表格中的复制按钮 SHALL 通过 API 获取明文令牌后复制到剪贴板，而非复制掩码值。

#### Scenario: 成功复制明文令牌
- **WHEN** 用户点击设备令牌表格行中的复制按钮
- **THEN** 系统调用 `GET /api/device-token/{id}/key` 获取明文令牌，并将明文令牌复制到剪贴板，显示"已复制到剪贴板"提示

#### Scenario: API 请求失败时提示错误
- **WHEN** 用户点击复制按钮且 API 请求失败（网络错误或权限不足）
- **THEN** 系统显示错误提示，不修改剪贴板内容

### Requirement: 复制过程须有 loading 状态
复制按钮在 API 请求进行中 SHALL 显示加载状态，防止用户重复点击。

#### Scenario: 复制请求进行中显示 loading
- **WHEN** 用户点击复制按钮后 API 请求尚未返回
- **THEN** 该行的复制按钮显示加载状态（loading），用户无法重复触发复制

#### Scenario: 复制完成后恢复正常状态
- **WHEN** API 请求完成（成功或失败）
- **THEN** 复制按钮恢复为正常可点击状态
