## Why

当前项目的 Docker 镜像和 CI/CD 配置仍指向上游 `calciumion/new-api`。需要更新为 Teniu Cloud 自有的 Docker Hub 仓库 `liuyaaixx/xnew-api`，并完成本地构建验证和推送。

## What Changes

- 更新 `docker-compose.yml` 中的镜像名从 `calciumion/new-api` 改为 `liuyaaixx/xnew-api`
- 更新 `.github/workflows/docker-image-alpha.yml` 中的 Docker Hub 镜像名
- 本地构建 Docker 镜像并验证运行
- 推送镜像到 Docker Hub `liuyaaixx/xnew-api`

## Capabilities

### New Capabilities
- `docker-hub-push`: 将 Docker 镜像构建并推送到 Teniu Cloud 自有的 Docker Hub 仓库

### Modified Capabilities

## Impact

- `docker-compose.yml` — 镜像名变更
- `.github/workflows/docker-image-alpha.yml` — Docker Hub 推送目标变更
- Docker Hub `liuyaaixx/xnew-api` — 新增镜像仓库
