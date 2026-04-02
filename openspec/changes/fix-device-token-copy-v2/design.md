## Context

设备令牌管理页面 (`DeviceTokenCard/index.jsx`) 的表格中有一个令牌复制按钮。当前点击该按钮时，`handleCopyToken(text)` 直接复制 `token_mask`（掩码值），而非调用 API 获取明文令牌。

后端已有 `GET /api/device-token/{id}/key` 接口返回明文令牌，前端 API 层已有 `getDeviceTokenKey(id)` 封装。`AddTokenModal.jsx` 中已有正确的复制逻辑作为参考。

## Goals / Non-Goals

**Goals:**
- 修复复制按钮，使其通过 API 获取并复制明文令牌
- 复制过程中提供 loading 反馈

**Non-Goals:**
- 不修改后端 API
- 不修改令牌显示格式（掩码展示逻辑保持不变）

## Decisions

1. **调用已有 API 获取明文令牌**：复用 `getDeviceTokenKey(id)` 而非新增接口。理由：后端已有完善的权限校验和接口实现。

2. **使用 record.id 而非 text 传参**：修改 onClick 回调传入 `record`（包含 id），而非 `text`（token_mask）。这样可通过 `record.id` 调用 API。

3. **增加 loading 状态**：在 API 请求期间禁用按钮或显示加载指示，防止重复点击。使用 React state 跟踪当前正在复制的 token id。

## Risks / Trade-offs

- [API 调用延迟] → 用户点击后需等待网络请求，通过 loading 状态缓解
- [API 权限不足] → 接口已有 userId 校验，仅允许用户获取自己的令牌
