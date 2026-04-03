# xnew-api 安全性与性能分析报告

**分析角色**: 安全工程师
**分析日期**: 2026-04-01

---

## 一、安全性分析

### 1. 认证机制分析

#### Session 认证
```go
store := cookie.NewStore([]byte(common.SessionSecret))
store.Options(sessions.Options{
    Path:     "/",
    MaxAge:   2592000, // 30 days
    HttpOnly: true,
    Secure:   false,  // ⚠️ 风险：未强制 HTTPS
    SameSite: http.SameSiteStrictMode,
})
```

**评估**:
- ✅ HttpOnly 防止 XSS 窃取
- ✅ SameSiteStrictMode 防止 CSRF
- ✅ Session secret UUID 随机生成
- ⚠️ Secure: false - HTTP 下可被窃取
- ⚠️ 30天有效期过长

#### Token 认证
- ✅ 支持多种 API Key 格式
- ✅ Token IP 白名单限制
- ✅ Token 状态验证完整
- ✅ 使用 HMAC 哈希后存储

#### OAuth 实现
- ✅ GitHub, Discord, OIDC, LinuxDO 等
- ✅ OAuth state 验证防 CSRF
- ✅ 使用 numeric ID 作为主标识符

#### 2FA/TOTP
- ✅ 完整的 TOTP 实现
- ✅ 备用码 bcrypt 哈希存储
- ✅ 失败尝试次数限制和锁定

---

### 2. 安全中间件分析

#### CORS 配置 ⚠️ 高风险
```go
config.AllowAllOrigins = true
config.AllowCredentials = true
config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
config.AllowHeaders = []string{"*"}
```

**风险**: `AllowAllOrigins = true` 允许任意源访问，可能导致 CSRF 攻击

#### Rate Limiting
- ✅ 支持 Redis 和内存两种模式
- ✅ 全局 API/Web 限流
- ✅ 用户级别搜索限流

#### Turnstile 验证
- ✅ 集成 Cloudflare Turnstile 人机验证

---

### 3. SQL 注入防护

```go
func sanitizeLikePattern(input string) (string, error) {
    input = strings.ReplaceAll(input, "!", "!!")
    input = strings.ReplaceAll(input, `_`, `!_`)
    if strings.Contains(input, "%%") {
        return "", errors.New("搜索模式中不允许包含连续的 % 通配符")
    }
}
```

- ✅ 使用 GORM ORM 参数化查询
- ✅ LIKE 查询严格过滤
- ✅ 限制通配符数量防 DoS

---

### 4. 敏感数据处理

#### 密码处理
```go
func Password2Hash(password string) (string, error) {
    hashedPassword, err := bcrypt.GenerateFromPassword(passwordBytes, bcrypt.DefaultCost)
    return string(hashedPassword), err
}
```
- ✅ bcrypt 哈希

#### Token 脱敏
```go
func MaskTokenKey(key string) string {
    return key[:4] + "**********" + key[len(key)-4:]
}
```
- ✅ Token 在 API 响应中自动脱敏

#### 日志安全
- ✅ 不记录敏感信息

---

### 5. OWASP Top 10 风险评估

| 风险 | 状态 | 说明 |
|------|------|------|
| A01: Broken Access Control | ⚠️ 中等 | CORS 配置过于宽松 |
| A02: Cryptographic Failures | ✅ 低 | 密码 bcrypt，敏感数据有保护 |
| A03: Injection | ✅ 低 | GORM ORM，LIKE 有过滤 |
| A04: Insecure Design | ✅ 低 | 认证设计完善 |
| A05: Security Misconfiguration | ⚠️ 中等 | Session Secure 未启用 |
| A06: Vulnerable Components | ⚠️ 需评估 | 依赖库版本需检查 |
| A07: Auth Failures | ✅ 低 | 完整认证和 2FA |
| A08: Data Integrity | ✅ 低 | HMAC 验证 |
| A09: Logging Failures | ✅ 低 | 日志系统完善 |
| A10: SSRF | ⚠️ 需评估 | 代理转发场景需审查 |

---

## 二、性能分析

### 1. 缓存策略

#### Redis 缓存
- ✅ 连接池配置（默认 10）
- ✅ 事务管道保证原子性
- ✅ Hash 结构存储对象

#### Token 缓存
```go
func cacheSetToken(token Token) error {
    key := common.GenerateHMAC(token.Key)
    token.Clean() // 清除敏感字段
    err := common.RedisHSetObj(fmt.Sprintf("token:%s", key), &token, ...)
}
```
- ✅ HMAC 哈希避免明文存储
- ✅ 异步更新缓存
- ✅ 支持额度增量更新

#### 磁盘缓存
- ✅ 文件权限 0600
- ✅ 自动清理过期文件

### 2. Rate Limit 机制

```lua
-- Lua 脚本令牌桶算法
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
-- ... 原子性操作
```
- ✅ Lua 脚本原子性
- ✅ 脚本预加载
- ✅ 单例模式

### 3. 数据库优化

```go
sqlDB.SetMaxIdleConns(100)
sqlDB.SetMaxOpenConns(1000)
sqlDB.SetConnMaxLifetime(time.Second * 60)
```
- ✅ 连接池配置合理
- ✅ Prepared Statement
- ✅ 批量更新模式

### 4. 并发处理

```go
relayGoPool = gopool.NewPool("gopool.RelayPool", math.MaxInt32, gopool.NewConfig())
relayGoPool.SetPanicHandler(func(ctx context.Context, i interface{}) {
    // panic recovery
})
```
- ✅ 字节跳动 gopool 高性能协程池
- ✅ Panic 恢复机制
- ✅ 上下文传递

---

## 三、安全风险汇总

### 🔴 高风险
1. **CORS 配置过于宽松** - `AllowAllOrigins = true`
2. **Session Cookie Secure 属性未启用**

### 🟡 中等风险
1. Session 有效期过长 (30 天)
2. 验证码存储在内存（重启丢失）
3. 无 CSRF Token 机制

### 🟢 低风险
1. 默认 root 密码需修改
2. pprof 端口暴露

---

## 四、优化建议

### 安全优化
1. **CORS**: 改为显式域名列表
2. **Session Cookie**: 生产环境 `Secure: true`
3. **Session 有效期**: 缩短至 7 天
4. **验证码存储**: 改用 Redis
5. **CSRF Token**: 敏感操作添加
6. **安全头**: X-Content-Type-Options, X-Frame-Options

### 性能优化
1. 缓存预热
2. 连接池调优
3. 监控告警
4. 慢查询优化
