# new-api-custom 开发部署手册

## 项目简介
new-api 是一个 OpenAI API 管理和分发平台（基于 calciumion/new-api v0.11.9-alpha.1）。
本仓库是定制版，通过 GitHub Actions CI 自动编译 Docker 镜像并部署到服务器。

技术栈：
- 后端：Go (Gin 框架 + GORM)
- 前端：React + Vite + Semi UI（嵌入 Go 二进制，`go:embed web/dist`）
- 数据库：PostgreSQL 15 + Redis 7
- 反代：Caddy 2

## 服务器信息
- IP：43.153.173.195
- 连接：`ssh root@43.153.173.195`
- 源码目录：`/opt/new-api-src/`
- 部署目录：`/opt/new-api/`（docker-compose.yml）
- 访问地址：https://code.viwo50when4.xyz

## 项目结构（关键目录）
```
/opt/new-api-src/
├── main.go                  # 入口，go:embed 前端
├── Dockerfile               # 多阶段编译（bun→Go→debian）
├── controller/              # API 控制器
│   ├── user.go              # 用户管理
│   ├── log.go               # 日志查询
│   └── channel.go           # 渠道管理
├── model/                   # 数据模型（GORM）
│   ├── user.go
│   ├── log.go               # Log 结构体，含 Ip 字段
│   └── ...
├── router/
│   ├── api-router.go        # 所有 API 路由定义
│   └── web-router.go        # 前端静态文件服务
├── web/                     # 前端源码
│   ├── src/pages/           # 页面组件
│   ├── src/components/      # 公共组件
│   ├── package.json
│   └── bun.lock
└── .github/workflows/
    └── build-deploy.yml     # CI/CD 流水线
```

## 修改代码 & 部署

### 1. 连接服务器，进入源码目录
```bash
ssh root@43.153.173.195
cd /opt/new-api-src
```

### 2. 修改代码
- 改后端：编辑 `controller/`、`model/`、`router/` 下的 .go 文件
- 改前端：编辑 `web/src/` 下的 .jsx/.js 文件

### 3. 提交并推送（自动触发 CI）
```bash
git add -A
git commit -m "feat: 改动描述"
git push origin master:main
```
注意：本地分支是 master，远程分支是 main，推送时要写 `master:main`

### 4. 等待 CI 完成（约 3-5 分钟）
CI 会自动：编译前端 → 编译后端 → 打 Docker 镜像 → 推到 GHCR → SSH 部署到服务器

查看 CI 状态：
```bash
bash /tmp/check_ci.sh
```
或直接访问：https://github.com/zuiho-kai/new-api-custom/actions

### 5. 验证部署
```bash
docker ps | grep new-api
# 应该看到 ghcr.io/zuiho-kai/new-api-custom:latest 且 Up 时间很短
```

## 回滚到官方版本
```bash
cd /opt/new-api
sed -i s
