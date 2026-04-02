# 设备令牌复制按钮修复 — 测试报告

## 测试日期
2026-04-02

## 修复内容
设备令牌管理页面表格中的复制按钮，修复前复制的是 `token_mask`（掩码值），修复后通过 API `GET /api/device-token/{id}/key` 获取明文令牌后复制到剪贴板。

## 修改文件
- `web/src/components/DeviceTokenCard/index.jsx`
  - 新增 `copyingTokenId` state 追踪 loading 状态
  - `handleCopyToken` 改为接收 `record` 参数，通过 API 获取明文令牌
  - 复制按钮添加 `loading` 属性，防止重复点击

## 测试环境
- 浏览器：Chromium (Playwright)
- 后端：localhost:3000（Go binary with embedded frontend）
- 测试工具：Playwright MCP

## 测试用例

### 第一轮测试

| # | 令牌名称 | ID | 掩码值 | 剪贴板内容 | API 调用 | 结果 |
|---|---------|-----|--------|-----------|---------|------|
| 1 | qqqq | 6 | `AQpA****HhoQ` | `AQpAWZUBRkp9n_6SOk0i_...HhoQ` | `GET /api/device-token/6/key` → 200 | PASS |
| 2 | 方法 | 3 | `dt-t****7000` | `dt-teniuapi.cloud-方法-1775045993372747000` | `GET /api/device-token/3/key` → 200 | PASS |

### 第二轮测试（刷新页面后重新测试）

| # | 令牌名称 | ID | 掩码值 | 剪贴板内容 | API 调用 | 结果 |
|---|---------|-----|--------|-----------|---------|------|
| 1 | qqqq | 6 | `AQpA****HhoQ` | `AQpAWZUBRkp9n_6SOk0i_...HhoQ` | `GET /api/device-token/6/key` → 200 | PASS |
| 2 | 方法 | 3 | `dt-t****7000` | `dt-teniuapi.cloud-方法-1775045993372747000` | `GET /api/device-token/3/key` → 200 | PASS |

## 验证方法
1. 设置剪贴板为 `EMPTY`
2. 点击复制按钮
3. 读取剪贴板内容
4. 确认剪贴板中为明文令牌（非掩码值）

## 测试结论
**全部通过** — 两轮测试共 4 个用例均通过，复制按钮正确获取并复制明文令牌到剪贴板。

## 截图
- `test-round1-before-click.png` — 测试前页面状态
- `test-round1-after-click.png` — 第一轮点击复制后
- `test-round2-final.png` — 第二轮测试完成后
