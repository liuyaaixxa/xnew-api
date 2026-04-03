## 1. 更新配置文件

- [x] 1.1 更新 `docker-compose.yml` 镜像名为 `liuyaaixx/xnew-api:latest`
- [x] 1.2 更新 `.github/workflows/docker-image-alpha.yml` 中 Docker Hub 镜像名为 `liuyaaixx/xnew-api`

## 2. 本地构建与验证

- [x] 2.1 本地执行 `docker build -t liuyaaixx/xnew-api:latest .` 构建镜像
- [x] 2.2 启动容器验证服务正常运行

## 3. 推送到 Docker Hub

- [x] 3.1 登录 Docker Hub (`docker login -u liuyaaixx`)
- [x] 3.2 推送镜像 `docker push liuyaaixx/xnew-api:latest`
- [x] 3.3 验证 Docker Hub 上镜像可用
