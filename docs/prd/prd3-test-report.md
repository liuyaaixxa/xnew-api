# PRD3 测试报告 — 设备令牌复制明文修复

## 需求概述

修复设备令牌创建后点击"复制"按钮，剪贴板中得到密文（如 `dt-t****7000`）而非明文的 bug。

## 根因分析

- 后端 `DeviceToken` model 的 `Token` 字段标记为 `json:"-"`，创建接口响应中不包含明文 token
- 前端复制时 fallback 到 `token_mask`（密文），导致复制内容为密文
- 后端已有 `GET /api/device-token/:id/key` 端点返回明文，但前端未调用

## 修复方案

创建成功后，额外调用 `GetDeviceTokenKey` 接口获取明文 token，存入 `plaintext_token` 字段用于复制。UI 显示始终使用 `token_mask`。

## 修改文件

| 文件 | 改动说明 |
|------|----------|
| `web/src/api/deviceToken.js` | 新增 `getDeviceTokenKey(id)` API 函数 |
| `web/src/components/DeviceTokenCard/index.jsx` | `handleAddSuccess` 中调用 `getDeviceTokenKey` 获取明文 |
| `web/src/components/DeviceTokenCard/AddTokenModal.jsx` | 复制按钮使用 `plaintext_token`，显示使用 `token_mask` |

## 测试用例

### 1. 复制明文令牌
- [x] 创建设备令牌后，点击"复制令牌"按钮
- [x] 粘贴到文本编辑器，确认为完整明文 token（如 `dt-xxxxxxxxxxxxxxxx`）

### 2. UI 显示密文
- [x] 创建成功 modal 中，令牌显示为密文格式（如 `dt-t****7000`）
- [x] 令牌列表中，令牌显示为密文格式

### 3. 异常处理
- [x] 若 `getDeviceTokenKey` 请求失败，fallback 到 `token_mask` 复制（降级处理）

### 4. 状态清理
- [x] 关闭 modal 后，`newToken` 状态被清除（`setNewToken(null)`），明文 token 不残留

## 测试结果

全部测试通过。
