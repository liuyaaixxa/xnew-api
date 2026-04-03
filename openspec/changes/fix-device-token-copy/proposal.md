## Why

设备令牌创建后，用户点击"复制"按钮时，剪贴板中得到的是密文格式（如 `dt-t****7000`），而非明文 token。这导致用户无法正确使用复制的令牌进行设备配置。根因是后端创建接口返回的 token 字段被 `json:"-"` 标记排除，前端只能拿到 `token_mask` 字段。

## What Changes

- 前端 `AddTokenModal` 组件：创建成功后，调用专用的 `GetDeviceTokenKey` 接口获取明文 token 用于复制
- 前端 API 层 (`deviceToken.js`)：新增调用 `GetDeviceTokenKey` 端点的函数
- 复制逻辑：确保剪贴板写入明文 token，UI 显示仍使用密文 `token_mask`

## Capabilities

### New Capabilities
- `device-token-plaintext-copy`: 创建设备令牌后，通过专用 API 获取明文 token 并复制到剪贴板

### Modified Capabilities

## Impact

- `web/src/components/DeviceTokenCard/AddTokenModal.jsx` — 修改复制逻辑
- `web/src/helpers/api/deviceToken.js` — 新增 getDeviceTokenKey API 函数
- `controller/device_token.go` — 确认 GetDeviceTokenKey 端点已存在
