# Device Token Management Specification

## Overview

管理用户设备令牌（用于 octelium 网络打通设备云端服务）。

用户通过此功能可以：
1. 为设备生成一个 auth-token
2. 将设备令牌与用户账户关联
3. 在页面上查看和管理设备令牌
4. 执行删除操作

## Added Requirements

### REQ-1: 用户认证
**Given:** 用户必须已登录
**When:** 用户请求需包含有效的用户认证 token

**Then:**
- 系统验证请求头中的 `Authorization` header
- 从 token 获取用户 ID
- 验证用户状态（仅限管理员）

### REQ-2: 列表设备令牌
**Given:** 用户请求设备令牌列表
**When:** 用户请求设备令牌列表
**Then:**
- 验证用户认证
- 查询用户所属的设备令牌
- 检查分页参数
- 返回分页数据（id, name, token_mask, domain, status, created_time）

**Status Code:** 200 成功, 404 无效 token
**返回示例:**
```json
{
  "success": true,
  "message": "获取成功"
}
```

### Req-3: 创建设备令牌
**Given:** 用户请求创建新的设备令牌
**When:** 用户请求包含：
- 设备名称 (1-64字符)
- octelium domain (可选，默认从环境变量读取)
- 验证名称不为空
- 验证名称长度 ≤ 64 字符
- 调用 octelium-go 宣户端生成 auth-token
- 验证生成的 auth-token 不为空
- 保存 auth-token 到数据库
- 返回创建结果（包含 id, name, token_mask, domain, status, created_time）

**Then:**
- 验证请求参数
- 调用 octelium-go 客户端
- 保存设备令牌到数据库
- 返回成功响应

**返回示例:**
```json
{
  "success": true,
  "message": "创建成功",
}
```

### Req-4: 删除设备令牌
**Given:** 用户请求删除设备令牌
**When:** 用户请求删除设备令牌
- 验证用户认证
- 验证用户是否有权限删除该令牌（只能删除自己的令牌）
- 验证令牌 ID 存在
- 调用 octelium-go 客户端撤销 token（可选）
- 从数据库删除记录
- 返回成功响应

**返回示例:**
```json
{
  "success": true,
  "message": "删除成功"
}
```

## Dependencies

- proposal.md
