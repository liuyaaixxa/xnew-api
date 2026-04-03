## Context

设备令牌创建流程：前端调用 `POST /api/device-token/` → 后端创建 token 并返回响应。但 `DeviceToken` model 的 `Token` 字段标记为 `json:"-"`，导致创建响应中不包含明文 token。后端已有 `GET /api/device-token/:id/key` 端点（`GetDeviceTokenKey`）专门返回明文 token，但前端未调用。

## Goals / Non-Goals

**Goals:**
- 创建 token 后，复制到剪贴板的是明文 token
- UI 显示仍保持密文格式
- 利用已有的后端 `GetDeviceTokenKey` 端点

**Non-Goals:**
- 不修改后端 API 或 model 结构
- 不改变 token 列表页的显示逻辑

## Decisions

1. **在创建成功后调用 `GetDeviceTokenKey` 获取明文**：创建接口返回 token ID 后，立即调用 `/api/device-token/:id/key` 获取明文 token，存入组件 state 用于复制。
   - 备选方案：修改后端创建接口返回明文 → 不采用，因为会改变现有 API 契约，且明文只应在需要时获取。

2. **前端 state 分离存储**：`newToken` 保存完整响应（含 `token_mask`），另用独立变量存储明文 token 用于复制。
   - 备选方案：将明文直接写入 `newToken.token` → 不采用，避免意外泄露明文到 UI 渲染。

## Risks / Trade-offs

- [额外 API 调用] → 创建后多一次网络请求，但仅在创建时触发，影响可忽略
- [明文 token 在前端内存中短暂存在] → modal 关闭后清除 state，风险可控
