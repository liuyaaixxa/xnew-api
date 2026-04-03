# Device Token Management API

## Overview

设备令牌管理 API 用于管理用户的设备令牌（用于 octelium 网络打通设备云端服务）。用户通过此功能可以：

1. 为设备生成一个 auth-token
2. 将设备令牌与用户账户关联
3. 在页面上查看和管理设备令牌
4. 执行删除操作

## API Endpoints

### 1. 获取设备令牌列表

**Endpoint:** `GET /api/device-token/`

**Description:** 获取当前用户的所有设备令牌列表

**Authentication:** Requires valid user authentication token in Authorization header

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| p | int | No | Page number (default: 1) |
| size | int | No | Page size (default: 10, max: 100) |

**Response:**
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "my-device",
        "token_mask": "dt-t****123",
        "domain": "teniuapi.cloud",
        "status": 1,
        "created_time": 1712345678
      }
    ],
    "total": 1
  }
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized (invalid or missing authentication token)

---

### 2. 创建设备令牌

**Endpoint:** `POST /api/device-token/`

**Description:** 为指定设备生成一个新的 auth-token

**Authentication:** Requires valid user authentication token

**Request Body:**
```json
{
  "name": "my-device",
  "domain": "teniuapi.cloud"
}
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | 设备名称 (1-64字符) |
| domain | string | No | octelium domain (可选，默认从环境变量读取) |

**Response:**
```json
{
  "success": true,
  "message": "创建成功",
  "data": {
    "id": 1,
    "name": "my-device",
    "token_mask": "dt-t****123",
    "domain": "teniuapi.cloud",
    "status": 1,
    "created_time": 1712345678
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "设备名称不能为空"
}
```

```json
{
  "success": false,
  "message": "设备名称过长"
}
```

**Status Codes:**
- 200: Success
- 400: Invalid parameters (empty name, name too long)
- 401: Unauthorized
- 500: Failed to generate token (octelium service error)

---

### 3. 删除设备令牌

**Endpoint:** `DELETE /api/device-token/:id`

**Description:** 删除指定的设备令牌

**Authentication:** Requires valid user authentication token

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | int | Yes | 设备令牌 ID |

**Response:**
```json
{
  "success": true,
  "message": "删除成功"
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "设备令牌不存在"
}
```

```json
{
  "success": false,
  "message": "无权操作此设备令牌"
}
```

**Status Codes:**
- 200: Success
- 400: Invalid ID
- 401: Unauthorized
- 403: Forbidden (not owner of token)
- 404: Token not found

---

## Data Model

### DeviceToken

```go
type DeviceToken struct {
    Id          uint   `json:"id"`
    UserId      uint   `json:"user_id"`
    Name        string `json:"name"`           // 设备名称 (max 64 chars)
    Token       string `json:"-"`              // octelium auth-token (不返回)
    TokenMask   string `json:"token_mask"`     // 脱敏显示
    Domain      string `json:"domain"`         // octelium domain
    Status      int    `json:"status"`         // 1:active, 2:disabled
    CreatedTime int64  `json:"created_time"`
    UpdatedTime int64  `json:"updated_time"`
}
```

**Security Note:**
- `Token` 字段使用 `json:"-"` 标签，确保完整的 auth-token 不会在 API 响应中返回
- API 只返回 `TokenMask` 字段（脱敏后的令牌）

---

## Environment Variables

设备令牌管理功能依赖以下环境变量：

| Variable | Description | Required |
|----------|-------------|----------|
| OCTELIUM_API_ENDPOINT | octelium API endpoint URL | Yes (for production) |
| OCTELIUM_API_KEY | octelium API key for authentication | Yes (for production) |
| OCTELIUM_DEFAULT_DOMAIN | 默认 domain (e.g., teniuapi.cloud) | No (default: teniuapi.cloud) |

---

## Error Handling

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "message": "错误描述"
}
```

常见错误类型：

| Error Code | Message | Description |
|------------|---------|-------------|
| 400 | 无效的参数 | 请求参数验证失败 |
| 400 | 设备名称不能为空 | name 参数为空 |
| 400 | 设备名称过长 | name 参数超过64字符 |
| 401 | 未授权 | 缺少或无效的认证令牌 |
| 403 | 无权限 | 尝试操作其他用户的令牌 |
| 404 | 设备令牌不存在 | 指定 ID 的令牌不存在 |
| 500 | 创建设备令牌失败 | octelium 服务调用失败 |

---

## Usage Example

### cURL Examples

**获取设备令牌列表:**
```bash
curl -X GET "https://api.example.com/api/device-token/?p=1&size=10" \
  -H "Authorization: Bearer your-user-token"
```

**创建设备令牌:**
```bash
curl -X POST "https://api.example.com/api/device-token/" \
  -H "Authorization: Bearer your-user-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-home-server", "domain": "teniuapi.cloud"}'
```

**删除设备令牌:**
```bash
curl -X DELETE "https://api.example.com/api/device-token/1" \
  -H "Authorization: Bearer your-user-token"
```

### JavaScript Example

```javascript
// 使用前端 API 服务
import { getDeviceTokens, createDeviceToken, deleteDeviceToken } from '@/api/deviceToken';

// 获取列表
const tokens = await getDeviceTokens({ p: 1, size: 10 });

// 创建令牌
const newToken = await createDeviceToken({
  name: 'my-device',
  domain: 'teniuapi.cloud'
});

// 删除令牌
await deleteDeviceToken(1);
```

---

## Integration Notes

### octelium-go SDK Integration

当前实现使用 placeholder 方法生成令牌。当 octelium-go SDK 可用时，需要：

1. 添加 `github.com/octelium/octelium/octelium-go` 依赖到 go.mod
2. 替换 `GenerateAuthToken` 中的 placeholder 实现
3. 替换 `RevokeAuthToken` 中的 placeholder 实现

### Database Compatibility

设备令牌表兼容 SQLite、MySQL 和 PostgreSQL：

- 使用 GORM AutoMigrate 创建表
- 避免数据库特定的 SQL 语法
- 使用通用的数据类型

---

## Security Considerations

1. **Token 存储:** Auth-token 存储在数据库中，未来可考虑加密存储
2. **Token 返回:** API 响应中不返回完整 token，只返回脱敏的 token_mask
3. **权限控制:** 用户只能查看和操作自己的设备令牌
4. **认证要求:** 所有 API 调用需要有效的用户认证 token

---

## Testing

测试文件位置：
- 后端单元测试: `/service/octelium_service_test.go`
- 后端集成测试: `/controller/device_token_test.go`

运行测试：
```bash
# 运行所有设备令牌相关测试
go test -run TestDeviceToken ./controller/... -v
go test -run TestOctelium ./service/... -v
```