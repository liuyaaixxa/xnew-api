# xnew-api 项目架构分析报告

**分析角色**: 架构师
**分析日期**: 2026-04-01

---

## 一、项目概述

xnew-api 是一个 AI API 网关/代理项目，使用 Go 语言开发，基于 Gin Web 框架。项目将 40+ 个上游 AI 提供商（OpenAI、Claude、Gemini、Azure、AWS Bedrock 等）聚合在统一的 API 后面，具有用户管理、计费、限流和管理后台等功能。

---

## 二、分层架构分析

### 2.1 架构层次图

```
┌─────────────────────────────────────────────────────────────────┐
│                        HTTP Request                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Router Layer (router/)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │ api-router   │ │ relay-router │ │ dashboard    │              │
│  │ (管理API)    │ │ (AI中继)     │ │ (监控统计)   │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Middleware Layer (middleware/)                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │ CORS/Gzip    │ │ TokenAuth    │ │ Distribute   │              │
│  │ (跨域/压缩)  │ │ (令牌认证)   │ │ (渠道分发)   │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │ RateLimit    │ │ I18n         │ │ Logger/Stats │              │
│  │ (限流)       │ │ (国际化)     │ │ (日志统计)   │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Controller Layer (controller/)                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │ relay.go     │ │ channel.go   │ │ user.go      │              │
│  │ (中继控制)   │ │ (渠道管理)   │ │ (用户管理)   │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Service Layer (service/)                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │ billing.go   │ │ channel_     │ │ quota.go     │              │
│  │ (计费结算)   │ │ select.go    │ │ (配额计算)   │              │
│  │              │ │ (渠道选择)   │ │              │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Model Layer (model/)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │ channel.go   │ │ user.go      │ │ token.go     │              │
│  │ (渠道模型)   │ │ (用户模型)   │ │ (令牌模型)   │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Database (GORM v2)                         │
│           SQLite / MySQL / PostgreSQL                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 各层职责

| 层级 | 目录 | 职责 |
|------|------|------|
| Router | `router/` | HTTP 路由分发，4个模块 |
| Middleware | `middleware/` | 请求预处理/后处理，22个中间件 |
| Controller | `controller/` | 请求处理，58个文件 |
| Service | `service/` | 业务逻辑，47个文件 |
| Model | `model/` | 数据模型，33个文件 |

---

## 三、Provider Adaptor Pattern（核心设计模式）

### 3.1 接口定义

```go
type Adaptor interface {
    Init(info *relaycommon.RelayInfo)
    GetRequestURL(info *relaycommon.RelayInfo) (string, error)
    SetupRequestHeader(c *gin.Context, req *http.Header, info *relaycommon.RelayInfo) error
    ConvertOpenAIRequest(c *gin.Context, info *relaycommon.RelayInfo, request *dto.GeneralOpenAIRequest) (any, error)
    ConvertClaudeRequest(c *gin.Context, info *relaycommon.RelayInfo, request *dto.ClaudeRequest) (any, error)
    ConvertGeminiRequest(c *gin.Context, info *relaycommon.RelayInfo, request *dto.GeminiChatRequest) (any, error)
    DoRequest(c *gin.Context, info *relaycommon.RelayInfo, requestBody io.Reader) (any, error)
    DoResponse(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (usage any, err *types.NewAPIError)
    GetModelList() []string
    GetChannelName() string
}
```

### 3.2 已实现的适配器（31个）

| 提供商 | 适配器路径 |
|--------|-----------|
| OpenAI | `relay/channel/openai/` |
| Anthropic (Claude) | `relay/channel/claude/` |
| Google Gemini | `relay/channel/gemini/` |
| AWS Bedrock | `relay/channel/aws/` |
| Alibaba (通义) | `relay/channel/ali/` |
| Baidu (文心) | `relay/channel/baidu/` |
| Zhipu (智谱) | `relay/channel/zhipu/` |
| DeepSeek | `relay/channel/deepseek/` |
| xAI (Grok) | `relay/channel/xai/` |
| Ollama | `relay/channel/ollama/` |
| ... | 共31个 |

### 3.3 新增 Provider 步骤

1. 定义渠道类型常量 (`constant/channel.go`)
2. 创建适配器 (`relay/channel/<provider>/adaptor.go`)
3. 注册适配器 (`relay/relay_adaptor.go`)
4. 配置默认 Base URL

**难度**: 低，约 200-500 行代码

---

## 四、请求处理流程

```
Client Request
     │
     ▼
Router (relay-router.go)
     │
     ▼
Middleware Chain
├── CORS
├── TokenAuth (令牌验证)
├── ModelRequestRateLimit (限流)
└── Distribute (渠道分发)
     │
     ▼
Controller (relay.go)
├── GetAndValidateRequest
├── GenRelayInfo
├── PreConsumeBilling (预扣费)
└── Retry Loop
     │
     ▼
Relay Handler
├── GetAdaptor (获取适配器)
├── ConvertRequest (格式转换)
├── DoRequest (发送请求)
└── DoResponse (处理响应)
     │
     ▼
Service Layer
├── SettleBilling (结算)
└── LogTaskConsumption (日志)
```

---

## 五、架构评估

### 优点
1. **清晰的分层设计** - 职责分离明确
2. **Provider Adaptor Pattern** - 扩展性强
3. **中间件责任链** - 灵活的请求处理
4. **数据库兼容** - 支持3种数据库
5. **完善的计费系统** - 预扣费/结算机制

### 改进建议
1. 使用依赖注入容器（wire/fx）
2. 统一配置管理，支持热加载
3. 定义标准错误码体系
4. 增加测试覆盖率
5. 集成 OpenTelemetry 分布式追踪
6. 添加 OpenAPI/Swagger 文档

---

## 六、关键数据

| 指标 | 数值 |
|------|------|
| Router 模块 | 4 个 |
| Middleware | 22 个 |
| Controller | 58 个文件 |
| Service | 47 个文件 |
| Model | 33 个文件 |
| Provider Adaptor | 31 个 |
| 支持数据库 | 3 种 |
| 支持语言 | 5 种 |
