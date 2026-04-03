# xnew-api 产品功能分析报告

**分析角色**: 产品经理
**分析日期**: 2026-04-01

---

## 一、产品定位

**产品名称**: New API
**定位**: Next-Generation LLM Gateway and AI Asset Management System
**核心价值**: 将 50+ 上游 AI 提供商聚合在统一 API 后面

---

## 二、核心功能清单

### 1. AI API 网关/代理能力

#### 支持的 Provider（50+）

| 类别 | Provider |
|------|----------|
| **国际主流** | OpenAI, Azure, Anthropic (Claude), Google Gemini, AWS Bedrock, Mistral, Cohere, Perplexity, OpenRouter, xAI |
| **国内厂商** | 阿里(通义千问), 百度(文心一言), 智谱AI, 讯飞(星火), 腾讯(混元), 月之暗面, DeepSeek, MiniMax, 字节火山引擎 |
| **开源/本地** | Ollama, Xinference |
| **多媒体生成** | Midjourney, Suno, Kling, Jimeng, Vidu, Sora |
| **专业服务** | Jina (Rerank), Replicate, SiliconFlow, Cloudflare, VertexAI, Dify, Coze |

#### API 格式转换能力
- OpenAI Compatible Chat Completions
- OpenAI Responses API
- OpenAI Realtime API
- Claude Messages 格式
- Google Gemini 格式
- Rerank Models (Cohere, Jina)
- Thinking-to-content 功能

---

### 2. 用户管理功能

#### 用户模型
- 基础信息: Id, Username, Password, DisplayName, Email
- 角色权限: Role (Root/Admin/Common), Status
- OAuth 绑定: GitHub, Discord, OIDC, WeChat, Telegram, LinuxDO
- 配额管理: Quota, UsedQuota, RequestCount
- 邀请系统: AffCode, AffCount, AffQuota

#### 认证方式
- ✅ 用户名/密码登录
- ✅ GitHub OAuth
- ✅ Discord OAuth
- ✅ OIDC 统一认证
- ✅ WeChat OAuth
- ✅ Telegram OAuth
- ✅ **WebAuthn/Passkeys** (现代无密码认证)
- ✅ **2FA 双因素认证**

---

### 3. 计费与配额管理

#### Token 管理
- 令牌配额: RemainQuota, UnlimitedQuota
- 模型限制: ModelLimitsEnabled, ModelLimits
- IP 限制: AllowIps
- 分组管理: Group, CrossGroupRetry
- 过期控制: ExpiredTime

#### 计费系统
- 预扣费机制: PreConsumeBilling
- 结算机制: SettleBilling
- 多计费源: Wallet (钱包), Subscription (订阅)
- 额度通知: 自动预警

#### 定价系统
- 模型定价: ModelPrice, ModelRatio, CompletionRatio
- 缓存计费: CacheRatio, CreateCacheRatio
- 多媒体计费: ImageRatio, AudioRatio

---

### 4. 订阅系统

#### 订阅计划
- 时长单位: year, month, day, hour, custom
- 配额重置: never, daily, weekly, monthly
- 用户分组升级: UpgradeGroup
- 购买限制: MaxPurchasePerUser

#### 用户订阅
- 配额追踪: AmountTotal, AmountUsed
- 状态管理: active, expired, cancelled
- 自动过期和配额重置

---

### 5. 支付集成

- EPay 支付
- Stripe 支付
- Creem 支付
- Waffo 支付

---

### 6. Admin Dashboard 功能

#### 用户管理 API
- 用户 CRUD
- OAuth 绑定管理
- 2FA 管理
- Passkey 管理

#### 渠道管理 API
- 渠道 CRUD
- 测试功能
- 模型同步
- 批量操作
- Ollama 集成

#### 其他管理 API
- 令牌管理
- 兑换码管理
- 日志查询
- 数据统计
- 供应商管理

---

### 7. 多语言支持 (i18n)

#### 后端
- 库: nicksnyder/go-i18n/v2
- 语言: zh-CN, zh-TW, en

#### 前端
- 库: i18next + react-i18next
- 语言: zh-CN, en, fr, ru, ja, vi, zh-TW
- **7 种语言翻译文件**

---

## 三、业务价值分析

### 市场定位对比

| 维度 | xnew-api | OpenAI 官方 | Azure OpenAI |
|------|----------|-------------|--------------|
| Provider 数量 | **50+** | 1 | 1 |
| API 统一性 | ✅ 完全统一 | 原生 | 基本 |
| 多用户管理 | ✅ 完整支持 | 无 | 企业级 |
| 计费灵活性 | ✅ 高度灵活 | 按量付费 | 企业协议 |
| 私有部署 | ✅ 支持 | ❌ | ❌ |
| 开源 | ✅ AGPLv3 | ❌ | ❌ |

### 统一 API 格式的价值

1. **开发效率提升**
   - 一次集成，访问 50+ Provider
   - 无需学习各厂商 API 差异
   - 标准 OpenAI 格式输出

2. **成本优化**
   - 智能路由: Channel 加权随机
   - 自动重试: 失败自动切换
   - 缓存计费: 支持多厂商缓存计费

### 计费系统商业价值

1. **SaaS 商业模式支持**
   - 按量计费
   - 订阅制
   - 充值系统

2. **企业级功能**
   - 用户分组
   - Token 管理
   - 配额预警

---

## 四、技术亮点

### 架构优势
- 分层架构: Router -> Controller -> Service -> Model
- Adapter 模式: 统一的 Provider 适配器
- 缓存策略: Redis + Memory 双层

### 安全特性
- WebAuthn/Passkeys: 无密码认证
- 2FA: 双因素认证
- IP 白名单: Token 级别限制

### 高可用设计
- 多 Key 轮询
- 批量更新优化
- 事务保护

---

## 五、目标客户

1. **AI 应用开发者** - 简化多模型集成
2. **企业 IT 部门** - 统一 AI 资产管理
3. **AI 服务代理商** - 构建自有 AI 平台
4. **研究机构** - 成本控制和用量追踪

---

## 六、竞争优势

1. **Provider 覆盖广** - 50+ 上游提供商
2. **开源免费** - AGPLv3 许可证
3. **功能完整** - 用户管理、计费、监控一站式
4. **部署灵活** - 多数据库、Docker 部署

---

## 七、潜在挑战

1. 上游 API 变更的及时适配
2. 大规模并发的性能优化
3. 企业级 SLA 保障
