# miniature-scene-arena

微缩场景竞技场，目前以「隅境」展厅呈现 AI 辅助创作的交互式 3D 场景，包含作品资料和本地文件工作台。

技术栈：Next.js App Router、React、TypeScript、Tailwind CSS、Base UI、React Three Fiber。

## 当前功能与边界

- 场景展厅支持搜索、筛选和布局切换。
- 内置雨夜便利店提供真实 3D 交互、预设镜头、画质切换和沉浸观看。
- `/admin` 是公开的本地文件工作台，支持资料、封面和 HTML 的导入、预览及 JSON 导出。
- 工作台没有登录、数据库、在线保存或发布功能。关闭页面前必须导出文件，编辑内容不会自动改变公开展厅。
- HTML 预览要求已打包的完整单文件，JS、CSS 和资源需内嵌，不加载外部脚本或模型。

## 本地开发

需要 Node.js 22.18 或更新版本，以及 pnpm 10.9.0。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

默认端口为 3000；端口占用时使用 `pnpm dev --port 3001`。

## 检查与测试

```sh
pnpm check
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm audit
```

`pnpm check` 包含 ESLint、路由类型生成、TypeScript 和单元测试。浏览器测试需先构建，会启动独立的生产服务并占用 3100 端口；测试中使用软件 WebGL。

## Docker Compose 与 Traefik

Compose 只部署应用，复用已有的 Traefik，不启动代理、数据库或其他服务。Traefik 需要启用 Docker provider，并与应用连接到同一外部 Docker 网络。

首次部署先从 `.env.example` 创建 `.env`，已有配置不要覆盖：

```sh
cp -n .env.example .env
```

修改 `.env` 中的部署参数：

| 变量 | 用途 |
| --- | --- |
| `COMPOSE_PROJECT_NAME` | Compose 项目名称 |
| `TRAEFIK_ENABLED` | 是否由 Traefik 发现应用 |
| `TRAEFIK_DOMAIN` | 访问域名，不带协议和路径 |
| `TRAEFIK_NETWORK` | 已有的 Traefik 共享网络名称 |
| `TRAEFIK_ROUTER_NAME` | 路由和服务名称，默认随项目名称生成，需要在共享代理中唯一 |
| `TRAEFIK_ENTRYPOINTS` | 已有入口名称，例如 `websecure` |
| `TRAEFIK_TLS` | 是否启用 TLS，默认 `true` |
| `TRAEFIK_CERT_RESOLVER` | Traefik 中已配置的证书解析器名称，不需要时留空 |
| `TRAEFIK_MIDDLEWARES` | 可选的中间件列表，以逗号分隔，例如 `security@file,auth@docker` |
| `SITE_URL` | 站点公开地址，默认 `https://${TRAEFIK_DOMAIN}` |

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

镜像采用固定版本的 Node.js、多阶段构建、非 root 运行和健康检查。应用只暴露容器内的 3000 端口，不映射宿主机端口；`.env` 不进入 Git 或 Docker 构建上下文。

`SITE_URL` 同时用于构建和运行时。修改域名或协议后，需要重新构建以更新静态页面的分享元信息。使用纯 HTTP 时，将 `TRAEFIK_TLS` 设为 `false`、入口改为 HTTP 入口、清空证书解析器，并将 `SITE_URL` 改为 `http://` 地址。HTTP 到 HTTPS 的跳转由已有 Traefik 负责。

## 项目结构

| 目录 | 职责 |
| --- | --- |
| `app/` | 页面路由、全局布局与临时预览 API |
| `components/gallery/` | 展厅搜索、筛选与场景卡片 |
| `components/scenes/` | 3D 渲染、观看器与作品详情 |
| `components/admin/` | 本地资料编辑、导入导出与 HTML 预览 |
| `components/ui/` | 业务页面复用的基础 UI 组件 |
| `lib/scenes/` | 场景目录、资料校验和文件处理 |
| `public/` | 本地字体与场景图片 |
| `tests/unit/` | 场景数据和预览接口单元测试 |
| `tests/e2e/` | 页面交互与 WebGL 浏览器测试 |

## 添加场景

目前公开场景来自 `lib/scenes/catalog.ts`。要收录新作品，需要增加元数据和封面、接入对应的渲染代码，再重新构建部署。

公开观看器目前只接入雨夜便利店渲染器，因此仅添加一条目录记录或导入 JSON，并不能展示另一个独立场景。工作台导出的 `.scene.json` 用于本地保存和再次导入，不是在线发布文件。
