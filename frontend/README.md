# Know Engine React 工作台

React + TypeScript + Vite，使用现有 Spring Boot API。四个 Hash 页面：知识库、上传与切分、AI 对话、评测中心。

## 本地开发

```powershell
cd frontend
npm ci
npm run dev
```

打开 http://127.0.0.1:5173 。Vite 将 `/api`、`/chat`、`/eval` 原样代理到 http://127.0.0.1:8009 。后端及数据库、Redis、Elasticsearch、文档转换服务需要按主项目说明启动；后端不可达时页面显示错误并提供手动刷新。

```powershell
npm test
npm run build
```

`build` 先做 TypeScript 检查，然后输出至独立的 `frontend/dist/`，不会清空或改写原有 `src/main/resources/static/`。锁文件已纳入版本管理。Node.js 需要满足 Vite 7 的要求（20.19+ 或 22.12+）。

## 生产接入

可将 `dist` 作为独立静态站点部署，同域反向代理以上三个 API 前缀到 Spring Boot。也可在构建后将产物复制到 Spring Boot 的独立子目录，例如：

```powershell
# 在仓库根目录运行，保留旧静态页面
New-Item -ItemType Directory -Force src/main/resources/static/workbench
Copy-Item -Path frontend/dist/* -Destination src/main/resources/static/workbench -Recurse -Force
```

重新打包后从 `/workbench/index.html#/documents` 进入。相对静态资源路径适配该子目录；API 使用同域根路径。不要将 Vite 的 `outDir` 设置为整个 `static`。生产反向代理应关闭 SSE 响应缓冲，并允许长时间评测请求。

## 实现约定

- `src/api` 集中定义 DTO、响应适配及 SSE。大整数 JSON 用 `json-bigint` 保留为字符串，避免 Java Long ID 丢失精度。
- 实体、Page、布尔操作结果及 `Result<T>` 分别校验。业务失败、HTTP 失败、异常空结果均显示错误；版本启停接口允许成功空响应。
- 对话使用 POST SSE、流式 UTF-8 解码、多行 data、跨块 CRLF 分帧。切会话、新建会话与卸载取消旧请求；序号隔离防止旧消息写入新会话。停止仅停止前端接收，后端的模型调用是否继续由服务端决定。
- Markdown 默认不执行原始 HTML；外链仅接受 HTTP(S)。文档编辑和分段更新携带实际乐观锁版本；父分段禁止直接编辑。
- 上传仅完成转换；切分后异步向量化，需要刷新查看实际状态。上传支持 PDF、Word、Excel、Markdown、TXT、CSV，前端限制 100MB，后端配置仍是最终约束。
- 评测启动不会自动重试。网络中断时请先刷新运行记录，避免重复模型调用。服务端尚无逐题进度接口。
- `npm test` 覆盖 SSE 分帧、UTF-8 解码、错误响应、204、布尔失败、大整数与会话切换竞争。测试临时文件放在被忽略的 `frontend/.tmp/`，适配受限 Windows 环境。页面联调需要真实后端；测试不替代真实模型、数据库及索引联调。

当前默认连接真实 API，没有隐式演示数据。
