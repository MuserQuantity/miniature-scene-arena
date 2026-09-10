# miniature-scene-arena

微缩场景竞技场，以「隅境」展厅呈现 AI 辅助创作的交互场景。公开网站只负责展示，场景通过 API Key 鉴权接口和 `manage-scenes` skill 管理。

技术栈：Next.js App Router、React、TypeScript、Tailwind CSS、Base UI。场景资料和资源保存到文件存储，不需要额外数据库。

## 功能与边界

- 展厅支持搜索、动态分类、模型/Agent 筛选及布局切换。
- 正式版本不附带演示作品。新数据卷从空展厅开始，只展示通过 API 收录的场景。
- 新增作品使用资源内嵌的单文件 HTML，可通过 API 新建、修改代码、封面和资料。提交成功后刷新页面即可看到，不需要重建镜像。
- 已移除旧工作台、网页编辑器和匿名预览接口，`/admin` 与 `/api/preview` 返回 404。
- HTML 场景在不透明来源 iframe 和响应头 CSP 双重沙箱中运行，不能读取父页面、使用浏览器存储、加载外部脚本或模型、发起网络请求、创建 worker 或嵌套 iframe。
- 不在服务器执行上传的源码、安装依赖或运行构建命令。React 工程和多文件资源包需要先在本地转换成符合要求的单文件 HTML。

## 本地开发

需要 Node.js 22.18+ 和 pnpm 10.9.0。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

默认使用 3000 端口，已占用时运行 `pnpm dev --port 3001`。没有配置 API Key 时仍可浏览展厅，但所有管理接口返回 503，不会允许匿名写入。

## API Key 与调用地址

首次配置时从 `.env.example` 创建私有配置；已有配置不要覆盖：

```sh
cp -n .env.example .env
pnpm scenes init-key
```

`init-key` 生成 256 位随机密钥，只写入私有环境文件，不显示密钥、不覆盖已有密钥，并将文件权限设为仅当前用户可读写。不要把密钥写进 Git、场景文件、请求 URL 或对话。

| 变量 | 用途 |
| --- | --- |
| `SCENE_API_KEY` | 32–128 个英文字母、数字、下划线或中划线；推荐使用初始化命令生成的随机值 |
| `SCENE_API_URL` | skill/CLI 调用的站点源地址，默认引用 `SITE_URL` |
| `SITE_URL` | 公开站点地址，默认 `https://${TRAEFIK_DOMAIN}` |
| `SCENE_DATA_DIR` | 可选的文件存储路径；本地默认 `.scene-data`，Docker 中固定为 `/app/data` |

调用机器和部署机器必须配置同一个 `SCENE_API_KEY`。可以在部署机初始化后安全同步到调用端，也可以将开发机已生成的密钥安全配置到部署机；不要两边各生成一个不同的密钥。服务器只安装 Docker 也可以，CLI 在有 Node.js 的调用机器上运行。

公网管理必须使用 HTTPS。CLI 只允许本机地址使用 HTTP，不接受 URL 中的凭据，不跟随重定向，也不允许关闭 TLS 校验。真实配置文件不会进入镜像。

## 使用 skill 管理场景

skill 位于 `.devin/skills/manage-scenes/SKILL.md`，可以在 Devin 中调用 `/manage-scenes`，或直接要求代理使用该 skill 新增、修改场景。它会先检查文件、读取当前版本、展示变更计划，得到确认后再提交。

配套脚本仅依赖 Node.js 内置模块，可以用 `--config /path/to/.env` 指定其他私有配置文件。接口命令如下：

```sh
pnpm scenes list
pnpm scenes get scene-id
pnpm scenes code scene-id --out current-scene.html
```

准备元数据 JSON，例如：

```json
{
  "title": "林间温室",
  "slug": "forest-greenhouse",
  "category": "建筑与空间",
  "tags": ["自然", "微缩世界"],
  "prompt": "在这里填写实际使用的提示词",
  "promptSource": "原始提示词"
}
```

先预演，再确认发布。封面可选，省略时网站会显示「暂无封面」：

```sh
pnpm scenes create --metadata metadata.json --html scene.html --cover cover.png
pnpm scenes create --metadata metadata.json --html scene.html --cover cover.png --confirm
```

修改前使用 `get` 读取当前版本。补丁 JSON 只放需要修改的字段：

```sh
pnpm scenes update scene-id --version 2 --metadata patch.json --html scene.html
pnpm scenes update scene-id --version 2 --metadata patch.json --html scene.html --confirm
```

`--html`、`--metadata`、`--cover` 可按需组合，`--clear-cover` 用于明确移除封面。不带 `--confirm` 不会执行写请求。下载源码不会覆盖已有文件。服务端会检查版本，发生冲突时需重新读取并合并，不要自动覆盖。

## 管理 API

所有以下接口都要求 `X-API-Key` 请求头，POST/PATCH 使用 `application/json`。

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/api/v1/scenes` | 返回 `{ "scenes": [...] }` |
| POST | `/api/v1/scenes` | 新建并公开场景，返回 201、`scene`、公开 `url`、`Location` 和 `ETag` |
| GET | `/api/v1/scenes/{id}` | 返回当前 `scene`、公开 `url` 和 `ETag` |
| PATCH | `/api/v1/scenes/{id}` | 局部修改，必须携带 GET 返回的 `If-Match`，例如 `"2"` |
| GET | `/api/v1/scenes/{id}/code` | 下载纯文本 HTML 源码及其对应版本 ETag |

新建必填 `title`、`slug`、`html`。可选资料字段为 `subtitle`、`description`、`category`、`tags`、`prompt`、`promptSource`、`model`、`modelVersion`、`thinking`、`agent`、`agentVersion`、`parameters`、`notes`。封面字段 `cover` 接受 PNG/JPEG/WebP base64 data URL，空字符串表示清除封面。

修改可提交上述资料、HTML 和封面的子集；未提交字段保持不变，`parameters` 等对象字段提交后整体替换。ID、slug、renderer、创建时间和版本不可直接修改。所有正式场景统一使用自包含 HTML，代码修改通过 `html` 字段提交。

- HTML 上限：4 MiB 减 16 KiB；必须包含完整 `<html>` 文档。
- 封面上限：2 MiB，尺寸不超过 8192×8192；只接受静态 PNG/JPEG/WebP。服务端完整解码、去除元数据并归一化为 WebP。
- 元数据上限：256 KiB；完整 JSON 请求上限：8 MiB。字段另有长度限制，校验错误会返回具体字段。
- 不支持删除接口。所有写入立即影响公开数据，调用端应在提交前确认内容。

常见状态码：401 密钥不正确；404 场景不存在；409 地址重复或目录容量不足；412 版本冲突；413 请求过大；415 内容类型错误；422 字段或图像校验失败；428 缺少版本条件；500 存储异常；503 密钥未配置或存储忙。

公开路由 `/scenes/{slug}`、`/scenes/{slug}/play`、`/scenes/{slug}/render` 和 `/scenes/{slug}/cover` 不需要密钥。封面字段返回含内容哈希的 URL，应直接使用返回值，不手工拼接；仅修改资料不会改变封面 URL。HTML 只能通过带沙箱策略的渲染路由交付，管理下载接口不作为可执行页面使用。

## Docker Compose 与 Traefik

Compose 只部署应用，复用已有 Traefik。代理需要启用 Docker provider，并连接到同一个外部网络。

| 变量 | 用途 |
| --- | --- |
| `COMPOSE_PROJECT_NAME` | Compose 项目名称 |
| `TRAEFIK_ENABLED` | 是否由 Traefik 发现应用 |
| `TRAEFIK_DOMAIN` | 访问域名，不带协议和路径 |
| `TRAEFIK_NETWORK` | 已有共享网络名称 |
| `TRAEFIK_ROUTER_NAME` | 路由和服务名称，默认随项目名称生成，需在共享代理中唯一 |
| `TRAEFIK_ENTRYPOINTS` | 入口名称，默认 `websecure` |
| `TRAEFIK_TLS` | TLS 开关，公网保持 `true` |
| `TRAEFIK_CERT_RESOLVER` | 已配置的证书解析器名称，不需要时留空 |
| `TRAEFIK_MIDDLEWARES` | 可选中间件列表，以逗号分隔 |

配置真实域名、网络、证书解析器和 API Key 后部署：

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

容器非 root 运行，带健康检查，不映射宿主机端口。密钥仅通过运行时环境传入，不进入构建参数或镜像层。改变程序或公开站点地址需要重建；通过 API 新增或修改场景不需要重建。

场景存储使用 `scene-data` 命名卷，包含 `catalog.json` 和 `assets/`。目录更新采用跨进程锁和原子替换，资源以内容哈希保存，避免并发写入产生半更新记录。旧资源暂时保留，不自动清理；备份和迁移时应保存整个卷。不要执行会删除数据卷的命令，恢复时必须保证容器的 node 用户可读写数据目录。

## 检查与结构

```sh
pnpm check
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm audit
```

浏览器测试使用独立测试数据和测试密钥，启动生产模式服务占用 3100 端口，并使用软件 WebGL；不会向公网服务写入数据。

| 目录 | 职责 |
| --- | --- |
| `app/` | 展厅页面、场景资源路由和管理 API |
| `components/gallery/` | 搜索、筛选和场景卡片 |
| `components/scenes/` | 隔离 HTML 观看器与详情 |
| `components/ui/` | 通用 UI 组件 |
| `lib/scenes/` | 场景模型、校验、鉴权、文件处理、持久化和沙箱策略 |
| `.devin/skills/manage-scenes/` | 场景管理 skill 与安全调用脚本 |
| `public/` | 应用自带的本地字体 |
| `tests/` | 数据、权限、CLI 与浏览器测试 |

`.scene-data`、`.scene-work`、真实环境文件和构建产物均不进入 Git 或 Docker 构建上下文。
