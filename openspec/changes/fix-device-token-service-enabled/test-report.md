# 设备令牌服务未启用修复 — 测试报告

## 测试日期
2026-04-03

## 修复内容
创建设备令牌时报错 "Device token service is not enabled"，根因是 `OCTELIUM_AUTH_TOKEN` 环境变量未设置。修复包括：
1. 改进 `OcteliumService` 初始化日志，明确输出 enabled/disabled 状态
2. 将硬编码英文错误消息替换为 i18n 国际化消息
3. 更新 `.env.example` 添加 `OCTELIUM_AUTH_TOKEN` 配置说明

## 修改文件
- `service/octelium_service.go` — 改进 `GetOcteliumService()` 启动日志
- `controller/device_token.go` — 使用 `i18n.MsgDeviceTokenServiceNotEnabled` 替代硬编码消息
- `i18n/keys.go` — 新增 `MsgDeviceTokenServiceNotEnabled` 常量
- `i18n/locales/en.yaml` — 英文翻译
- `i18n/locales/zh-CN.yaml` — 简体中文翻译
- `i18n/locales/zh-TW.yaml` — 繁体中文翻译
- `.env.example` — 添加 `OCTELIUM_AUTH_TOKEN` 配置项

## 测试环境
- 后端：localhost:3000（Go binary）
- 测试工具：curl + cookie-based auth

## 测试用例

### 第一轮测试：OCTELIUM_AUTH_TOKEN 已配置

启动命令：`OCTELIUM_AUTH_TOKEN=<token> ./new-api`

| # | 操作 | 预期结果 | 实际结果 | 状态 |
|---|------|---------|---------|------|
| 1 | 检查启动日志 | 输出 "Octelium service enabled" | `Octelium gRPC connected to octelium-api.teniuapi.cloud:443` + `Octelium service enabled, connected to teniuapi.cloud` | PASS |
| 2 | POST /api/device-token/ 创建令牌 | 返回 success:true | `{"data":{"id":8,"name":"test-prd9","token_mask":"AQpA****_vTI",...},"success":true}` | PASS |

### 第二轮测试：OCTELIUM_AUTH_TOKEN 未配置

启动命令：`./new-api`（不设置环境变量）

| # | 操作 | 预期结果 | 实际结果 | 状态 |
|---|------|---------|---------|------|
| 1 | 检查启动日志 | 输出 "Octelium service disabled" | `Octelium service disabled: OCTELIUM_AUTH_TOKEN not set` | PASS |
| 2 | POST /api/device-token/ (Accept-Language: en) | 英文错误消息 | `Device token service is not enabled. Please ask the administrator to configure OCTELIUM_AUTH_TOKEN` | PASS |
| 3 | POST /api/device-token/ (Accept-Language: zh-CN) | 中文错误消息 | `设备令牌服务未启用，请联系管理员配置 OCTELIUM_AUTH_TOKEN` | PASS |

## 测试结论
**全部通过** — 两轮测试共 5 个用例均通过。服务启用时创建令牌成功，服务未启用时返回友好的 i18n 错误提示。
