# 本机运行：Compose 依赖 + Java + React

## 推荐：整套容器一键运行

Docker Desktop 启动后，在项目根目录运行 `./start.ps1`，等待健康检查完成，再打开 http://127.0.0.1:18080 。前端通过 Nginx 访问容器内 Java，Java 连接本项目四项依赖。

首次启动会下载镜像并在构建容器里安装 Maven/npm 依赖；本机无需运行 Java、Maven 或 Node。后续启动复用构建缓存。停止使用 `./stop.ps1`，数据卷保留。查看日志使用 `docker compose --profile app logs --tail 100 backend`。

模型 Key 可填入被忽略的 `application-local.yml`；也可在根目录 `.env` 填 `DASHSCOPE_API_KEY=...`（使用环境变量时删除 local 文件中的占位覆盖项）。BGE 两个模型文件仍需放在原模型目录，由容器只读挂载。两者都不会进入镜像或 Git。

容器构建配置：根目录 `Dockerfile`、`frontend/Dockerfile`、`deploy/nginx.conf`。`app` profile 启用前后端；不加 profile 时保留下面的“仅依赖 + 本机调试”用法。

PDF/Word 解析服务仍待兼容版本接入；当前基础 Compose 不包含 MinerU。先用 TXT 跑通上传、切分及问答；AI 功能需要有效模型 Key。

## 1. 启动依赖

在项目根目录运行：

```powershell
docker compose up -d --wait
docker compose ps
```

| 服务 | 本机地址 | 本地开发账号 |
| --- | --- | --- |
| MySQL 8.4 | 127.0.0.1:13306 / know_engine | know_engine / know-engine-local |
| Redis 7.4.11 | 127.0.0.1:16380 | 无密码，限本机 |
| Elasticsearch 8.15.3 | http://127.0.0.1:19200 | 限本机 |
| MinIO S3 API | http://127.0.0.1:19090 | knowengine / know-engine-local |
| MinIO 控制台 | http://127.0.0.1:19000 | 同上 |

独立项目名 `know-engine`，独立命名数据卷，与其他项目现有容器隔离。MySQL 首次创建空数据卷时自动执行 `schema.sql`，只初始化表结构。不会导入原 SQL 转储中的会话、评测或旧分段 ID。MinIO bucket 由应用首次上传时创建。

这些配置用于本机开发。默认密码和无鉴权 ES 不适用于公网部署，端口仅绑定 127.0.0.1。

## 2. 配置模型并启动后端

JDK 21、Maven 和本地 BGE 的 ONNX/tokenizer 文件需已就绪。模型文件路径见主 README。

可通过环境变量设置 `DASHSCOPE_API_KEY`；也可在被 Git 忽略的 `src/main/resources/application-local.yml` 中填写：

```yaml
dashscope:
  api-key: 你的实际Key
```

如果 local 文件已有占位值，需替换或删除该覆盖项才能使用环境变量。模型名称还需与账号实际可用的模型一致；当前源码中普通模型来自 `application.yml`，RAG/标题专用模型来自 `AiModelConfig`。

```powershell
./scripts/start-backend.ps1
```

脚本启用 `compose,local`，使用 Compose 映射地址。Windows 下指定短的 Unix-domain socket 临时目录，避免本机 JDK NIO 的 `Unable to establish loopback connection` 启动错误。IDEA 可设置相同 Active profiles，并在 VM options 中加入 `-Djdk.net.unixdomain.tmpdir=项目绝对路径/.runtime/sockets`（先创建该目录）。

后端地址：http://127.0.0.1:8009 。缺少有效模型 Key 时可验证列表与纯文本上传，但向量化、问答和模型评测需配置完成。

## 3. 启动 React

```powershell
cd frontend
npm ci
npm run dev
```

前端：http://127.0.0.1:5173 ，开发代理连接 8009。

## 4. 文档解析服务

当前项目按旧接口调用 `POST /file_parse`，multipart 参数含 `backend=pipeline`、`response_format_zip=true`、`return_images=true`，期待 ZIP 中的 Markdown 和图片。

解析服务未打包在本仓库，尚未加入本轮 Compose。先用 TXT 验证基础链路。PDF/Word 等复杂文档需提供匹配接口的服务，并配置 `file.parse.api.url`。最新 MinerU V1 API 使用不同的路径和请求协议，接入前需确定兼容版本或实现适配，不能直接将最新版镜像当作现有接口的替代。

资料：[MinerU 官方 V1 HTTP API](https://opendatalab.github.io/MinerU/usage/http_api/)、[官方仓库旧接口讨论](https://github.com/opendatalab/MinerU/discussions/3562)。

## 5. 日常启停

```powershell
docker compose stop          # 停止依赖，保留容器和数据
docker compose start         # 启动已有容器
docker compose logs --tail 100 mysql
docker compose down          # 移除本项目容器和网络，保留命名数据卷
```

Java/React 在各自终端用 Ctrl+C 停止。日常操作不要加 `down -v`，该选项会删除数据卷。

## 本轮验证

- 整套容器版：Java 与 React 镜像构建通过，后端 BGE 模型加载成功；18080 页面与代理接口返回正常，TXT 上传及 MinIO 下载通过。

- 四个 Compose 服务健康检查通过，MySQL 七张表自动初始化完成。
- Java 后端已在 8009 启动，React 已在 5173 运行。
- TXT 测试文件上传成功，文档状态为 CONVERTED；MySQL 记录可查询，MinIO 文件可下载。
- 会话列表与评测列表接口正常返回。
- 模型 Key 尚待本机配置，向量化、生成回答和评测执行尚未验证。
- MinerU 兼容服务尚未接入，复杂文档解析尚未验证。
