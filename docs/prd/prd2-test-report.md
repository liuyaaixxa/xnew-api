# PRD2 测试报告 — 令牌管理页面 Tab 布局

## 需求概述

将"令牌管理"页面从垂直排列布局改为 Tab 页面布局：
- Tab 1: "LLM令牌管理" — 原有 LLM 令牌表格
- Tab 2: "设备令牌管理" — 设备令牌管理卡片

## 修改文件

| 文件 | 改动说明 |
|------|----------|
| `web/src/pages/Token/index.jsx` | 使用 Semi Design Tabs 组件重构页面布局 |
| `web/src/i18n/locales/zh-CN.json` | 添加 "LLM令牌管理" 翻译 |
| `web/src/i18n/locales/en.json` | 添加 "LLM Token Management" 翻译 |
| `web/src/i18n/locales/ja.json` | 添加 "LLMトークン管理" 翻译 |
| `web/src/i18n/locales/fr.json` | 添加 "Gestion des jetons LLM" 翻译 |
| `web/src/i18n/locales/ru.json` | 添加 "Управление LLM токенами" 翻译 |
| `web/src/i18n/locales/vi.json` | 添加 "Quản lý token LLM" 翻译 |
| `web/src/i18n/locales/zh-TW.json` | 添加 "LLM令牌管理" 翻译 |

## 测试用例

### 1. Tab 页面渲染
- [x] 页面加载后显示两个 Tab: "LLM令牌管理" 和 "设备令牌管理"
- [x] 默认选中第一个 Tab "LLM令牌管理"
- [x] Tab 带有对应图标 (KeyRound / Smartphone)

### 2. Tab 切换
- [x] 点击 "设备令牌管理" Tab 切换到设备令牌页面
- [x] 点击 "LLM令牌管理" Tab 切换回 LLM 令牌页面
- [x] 切换时 URL query param 同步更新 (?tab=llm / ?tab=device)

### 3. URL 持久化
- [x] 直接访问 `?tab=device` 可以直接打开设备令牌 Tab
- [x] 浏览器后退/前进按钮正确切换 Tab 状态

### 4. 懒渲染
- [x] 仅当前激活的 Tab 内容被渲染，未激活的 Tab 不会触发 API 请求

### 5. 功能完整性
- [x] LLM 令牌管理功能正常（增删改查）
- [x] 设备令牌管理功能正常（增删查）

### 6. i18n 国际化
- [x] 中文 (zh-CN): "LLM令牌管理"
- [x] 英文 (en): "LLM Token Management"
- [x] 日文 (ja): "LLMトークン管理"
- [x] 法文 (fr): "Gestion des jetons LLM"
- [x] 俄文 (ru): "Управление LLM токенами"
- [x] 越南文 (vi): "Quản lý token LLM"
- [x] 繁体中文 (zh-TW): "LLM令牌管理"

## 测试结果

全部测试通过。
