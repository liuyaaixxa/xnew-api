## Overview

更新 Docker 配置，将镜像目标从 `calciumion/new-api` 改为 `liuyaaixx/xnew-api`，本地构建验证后推送到 Docker Hub。

## Approach

### 1. 更新 docker-compose.yml
将 `image: calciumion/new-api:latest` 改为 `image: liuyaaixx/xnew-api:latest`。

### 2. 更新 CI workflow
更新 `.github/workflows/docker-image-alpha.yml` 中所有 `calciumion/new-api` 引用为 `liuyaaixx/xnew-api`。

### 3. 本地构建
使用现有 Dockerfile（多阶段构建：bun 前端 → Go 后端 → debian runtime），构建镜像并 tag 为 `liuyaaixx/xnew-api:latest`。

### 4. 本地验证
启动容器，验证 3000 端口可访问，首页正常渲染。

### 5. 推送
使用 `docker push liuyaaixx/xnew-api:latest` 推送到 Docker Hub。

## Risks

- Dockerfile 无需修改，已经是多阶段构建，支持 amd64/arm64
- 需要确保 Docker Hub PAT 有 push 权限
