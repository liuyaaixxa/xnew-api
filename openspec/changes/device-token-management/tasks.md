# Device Token Management - Implementation Tasks

## 1. 后端基础设施

- [ ] 1.1 添加 octelium-go 依赖到 go.mod
- [ ] 1.2 创建 DeviceToken 数据模型 (model/device_token.go)
- [ ] 1.3 创建数据库迁移逻辑
- [ ] 1.4 添加 octelium 环境变量配置 (.env, common/env.go)

## 2. 后端服务层

- [ ] 2.1 创建 OcteliumService 服务 (service/octelium_service.go)
- [ ] 2.2 实现 GenerateAuthToken 方法
- [ ] 2.3 实现 RevokeAuthToken 方法 (可选)
- [ ] 2.4 添加错误处理和日志记录

## 3. 后端控制器与路由

- [ ] 3.1 创建 DeviceTokenController (controller/device_token.go)
- [ ] 3.2 实现 GetDeviceTokens 列表接口
- [ ] 3.3 实现 CreateDeviceToken 创建接口
- [ ] 3.4 实现 DeleteDeviceToken 删除接口
- [ ] 3.5 注册 API 路由 (router/api-router.go)
- [ ] 3.6 添加 API 权限验证中间件

## 4. 前端 API 层

- [ ] 4.1 创建设备令牌 API 服务 (web/src/api/deviceToken.js)
- [ ] 4.2 实现 getDeviceTokens 方法
- [ ] 4.3 实现 createDeviceToken 方法
- [ ] 4.4 实现 deleteDeviceToken 方法

## 5. 前端组件开发

- [ ] 5.1 创建 DeviceTokenCard 组件目录结构
- [ ] 5.2 实现 DeviceTokenCard 主组件 (web/src/components/DeviceTokenCard/index.jsx)
- [ ] 5.3 实现令牌列表表格
- [ ] 5.4 实现 AddDeviceTokenModal 添加弹窗
- [ ] 5.5 实现删除确认对话框
- [ ] 5.6 添加组件样式 (style.scss)

## 6. 前端页面集成

- [ ] 6.1 修改 Token 管理页面 (web/src/pages/Token/index.jsx)
- [ ] 6.2 添加"设备令牌管理"卡片区域
- [ ] 6.3 确保布局与"令牌管理"一致

## 7. 国际化

- [ ] 7.1 添加中文翻译 (web/src/i18n/locales/zh-CN.json)
- [ ] 7.2 添加英文翻译 (web/src/i18n/locales/en.json)
- [ ] 7.3 后端 i18n 翻译 (i18n/locales/zh.yaml, en.yaml)

## 8. 测试与验证

- [ ] 8.1 后端单元测试 (service/octelium_service_test.go)
- [ ] 8.2 后端集成测试 (controller/device_token_test.go)
- [ ] 8.3 前端组件测试 (可选)
- [ ] 8.4 端到端功能验证
- [ ] 8.5 API 文档更新

## 9. 文档与交付

- [ ] 9.1 更新 README.md (如有必要)
- [ ] 9.2 添加 API 使用说明
- [ ] 9.3 代码审查与清理