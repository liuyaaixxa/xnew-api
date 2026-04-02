## 1. 改进错误提示和日志

- [x] 1.1 在 `service/octelium_service.go` 的 `GetOcteliumService()` 中添加启动日志，输出服务启用/禁用状态
- [x] 1.2 在 `controller/device_token.go` 中将 "Device token service is not enabled" 替换为 i18n 消息
- [x] 1.3 添加 i18n 翻译 key（后端 en/zh/zh-TW）

## 2. 更新配置文档

- [x] 2.1 在 `.env.example` 中添加 `OCTELIUM_AUTH_TOKEN` 配置项

## 3. 验证修复

- [x] 3.1 第一轮测试：设置 OCTELIUM_AUTH_TOKEN 环境变量后重启后端，验证创建设备令牌成功
- [x] 3.2 第二轮测试：不设置环境变量重启后端，验证错误提示为中文友好消息
