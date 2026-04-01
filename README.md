<div align="center">

![Teniu Cloud](/web/public/logo.png)

# Teniu Cloud

**统一的大模型接口网关 · Unified LLM API Gateway**

<p align="center">
  <a href="https://github.com/liuyaaixxa/xnew-api">
    <img src="https://img.shields.io/badge/GitHub-Teniu%20Cloud-blue?logo=github" alt="GitHub">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/github/license/liuyaaixxa/xnew-api?color=brightgreen" alt="license">
  </a>
</p>

</div>

## 项目简介

Teniu Cloud 是一个统一的大模型 API 网关，聚合 40+ 上游 AI 供应商（OpenAI、Claude、Gemini、Azure、AWS Bedrock 等），提供统一的 API 接口、用户管理、计费、限流和管理后台。

### 核心能力

- **多供应商聚合** — 40+ AI 供应商统一接入，一个 API 地址访问所有模型
- **格式自动转换** — OpenAI ⇄ Claude Messages ⇄ Google Gemini 格式互转
- **智能路由** — 渠道加权随机、失败自动重试、用户级模型限流
- **设备令牌管理** — 集成 Octelium SDK，生成真实设备 auth-token，支持家庭节点连接
- **完整的管理后台** — 数据看板、令牌管理、渠道管理、用户管理、计费系统

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Go 1.25+, Gin, GORM v2 |
| 前端 | React 18, Vite, Semi Design |
| 数据库 | SQLite / MySQL / PostgreSQL |
| 缓存 | Redis + 内存缓存 |
| 认证 | JWT, WebAuthn/Passkeys, OAuth |
| 设备集成 | Octelium gRPC SDK |

## 最近开发的功能

| 版本 | 功能 | 说明 |
|------|------|------|
| PRD1 | 设备令牌管理 | 完整的设备令牌 CRUD，支持创建、查看、复制、删除 |
| PRD2 | 令牌管理 Tab 布局 | Token 页面使用 Tab 分离 LLM 令牌和设备令牌管理 |
| PRD3 | 修复令牌复制 | 复制按钮返回明文 token，UI 显示 masked 版本 |
| PRD4 | Octelium SDK 集成 | 通过 gRPC 直连 Octelium 云端生成真实设备 auth-token |

## 快速开始

```bash
# 克隆项目
git clone https://github.com/liuyaaixxa/xnew-api.git
cd xnew-api

# Docker Compose 启动
docker-compose up -d

# 访问
open http://localhost:3000
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SQL_DSN` | 数据库连接字符串 | SQLite |
| `REDIS_CONN_STRING` | Redis 连接 | - |
| `SESSION_SECRET` | 会话密钥 | - |
| `OCTELIUM_AUTH_TOKEN` | Octelium 管理员 auth-token | - |
| `OCTELIUM_DEFAULT_DOMAIN` | Octelium 默认域名 | `teniuapi.cloud` |

## 致谢

本项目基于 [New API](https://github.com/Calcium-Ion/new-api)（由 [QuantumNous](https://github.com/QuantumNous) 维护）二次开发，原项目基于 [One API](https://github.com/songquanpeng/one-api)（MIT License）。

感谢 New API / One API 社区的开源贡献，为本项目提供了坚实的基础架构和丰富的供应商适配器实现。本项目在此基础上扩展了设备令牌管理、Octelium 云端集成等功能。

## 许可证

本项目遵循 [GNU Affero General Public License v3.0 (AGPLv3)](./LICENSE)。

---

<div align="center">
<sub>Built by Teniu Cloud Team</sub>
</div>
