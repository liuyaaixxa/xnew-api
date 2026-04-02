## 1. 修复复制按钮逻辑

- [x] 1.1 修改 `handleCopyToken` 函数，改为接收 `record` 参数，通过 `getDeviceTokenKey(record.id)` 获取明文令牌后复制
- [x] 1.2 添加 `copyingTokenId` state 用于跟踪正在复制的令牌 ID，实现 loading 状态
- [x] 1.3 修改复制按钮的 `onClick` 回调，传入 `record` 而非 `text`，并在 loading 时显示加载状态

## 2. 测试验证

- [x] 2.1 第一轮测试：启动前端开发服务器，在设备令牌管理页面验证复制按钮功能
- [x] 2.2 第二轮测试：构建生产版本并验证，导出测试报告
