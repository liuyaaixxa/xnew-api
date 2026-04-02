## Why

设备令牌管理页面中，表格行的令牌复制按钮点击后复制的是 `token_mask`（掩码值，如 `sk-****...****`），而非实际可用的明文令牌。用户无法通过复制按钮获取可用的令牌值，需要修复此 bug。

## What Changes

- 修改设备令牌表格中复制按钮的处理逻辑，改为通过 API (`GET /api/device-token/{id}/key`) 获取明文令牌后复制到剪贴板
- 复制过程中增加 loading 状态提示，避免用户重复点击
- 复用已有的 `getDeviceTokenKey` API 封装

## Capabilities

### New Capabilities
- `device-token-plaintext-copy`: 修复设备令牌复制按钮，使其复制明文令牌而非掩码值

### Modified Capabilities

## Impact

- 前端组件：`web/src/components/DeviceTokenCard/index.jsx` — 修改 `handleCopyToken` 函数和复制按钮的 onClick 事件
- 后端 API：无需修改，已有 `GET /api/device-token/{id}/key` 接口
- 前端 API 层：无需修改，已有 `getDeviceTokenKey(id)` 封装
