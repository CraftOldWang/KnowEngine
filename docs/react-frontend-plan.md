# React 前端改造

## 已选方向

- 分支：`feat/react-frontend`。
- 用户选择 A：浅色知识工作台。暖白背景、白色内容区、深墨色文字、克制的蓝绿强调色、细分隔线。
- React + TypeScript + Vite；源码放 `frontend/`。保留原静态页面以便对照。
- 以现有 Spring Boot API 为事实来源；不新增后端尚未提供的产品能力。

## 页面与组件

| 路由（建议 Hash 路由，避免与后端 /chat 冲突） | 页面 | 核心交互 |
| --- | --- | --- |
| /#/documents | 知识库 | 筛选、分页、查看详情、编辑、删除、查看分段、版本管理 |
| /#/upload | 上传与切分 | 上传文件、填写信息、选择切分策略、触发切分、查看实际处理状态 |
| /#/chat | AI 对话 | 新建/切换/删除会话、流式回答、进度、停止接收、引用侧栏 |
| /#/evaluations | 评测中心 | 上传 JSONL、启动评测、历史记录、报告、两次运行对比、CSV 导出 |

全局 AppShell 提供导航；页面复用 Button、Input、Select、Dialog/Drawer、StatusBadge、Pagination、EmptyState、ErrorState、LoadingState。宽屏聊天采用会话列表、正文、引用三栏；窄屏将导航和引用折叠为抽屉。渲染 Markdown 时不执行原始 HTML。删除和版本切换提供明确确认。

## 前端层次与接口抽象

```text
frontend/src/
  app/           路由、布局、全局样式
  api/           HTTP 请求、响应适配、SSE 解析、DTO
  features/
    documents/   文档与分段、版本、上传切分
    chat/        会话、消息、引用、流状态
    evaluations/ 评测提交、报告、比较
  components/    可复用基础组件
```

组件通过 documentsApi、chatApi、evaluationsApi 调用后端，避免各页面重复拼 URL 和处理错误。按 Controller/entity 精确声明 DTO；ID 类型检查 Java 序列化方式，避免大整数精度丢失。

- documentsApi：`list/get/create/update/remove/removeBatch/upload/split/versions/uploadVersion/switchVersion/activateVersion/deactivateVersion`。
- segmentsApi：`list/count/get/update/remove`；父分段不可直接修改；更新携带实际版本字段。
- chatApi：`listConversations/listMessages/deleteConversation/streamAnswer`。
- evaluationsApi：`uploadDataset/run/listRuns/report/compare/exportCsvUrl`。

现有接口：文档与分段返回实体、布尔值或 MyBatis Page；聊天历史与评测采用 `Result<T>` 包装。适配层分别处理 HTTP 错误、业务失败、空结果，不能把空响应或 false 当作成功。请求取消使用 AbortController。

## 关键后端约束

- `/api/document/upload`、`upload-version` 使用 multipart；`split/{id}` 和版本操作使用请求参数。上传完成仅表示转换完成，切分成功后异步向量化，UI 需刷新真实状态。
- `/api/document/page` 使用 current/size；`/eval/runs` 使用 page/size。
- `/chat/send` 是 POST + query 参数 + SSE，不能直接套原生 EventSource。
- 流式事件包含文本 token、`[PROGRESS]:`、`[REFERENCE]:`、`[WARN]:`、`[CARD]:`、`[DONE]:conversationId`。解析器支持跨网络块分帧、CRLF、多行 data 和 UTF-8 流式解码；切换会话/卸载时清理请求，防止旧流写入新会话。
- `/eval/run` 为长请求直接返回报告；当前无逐题进度 API。展示等待状态，不编造进度百分比，也不要在网络错误后自动重复启动。
- 概念图中的附件入口和“相关内容”属于视觉示意；聊天只实现已有文本问答与真实引用。
- 真实接口模式默认；后端不可用展示可读错误。如提供演示模式，必须显式标注，并与真实请求隔离。

## 实现与验收

由 gpt-6.1-sol 实现。提交按前端基础、文档、聊天、评测等功能组织。

1. 建立前端工程、统一布局和 API 层；配置开发代理转发 /api、/chat、/eval 至 8009。
2. 完成文档与上传切分、对话与引用、评测与比较，逐项对照旧页面功能。
3. 提供生产构建接入说明；不让构建清空原 static 目录。
4. 验证 TypeScript、生产构建及关键 SSE 分帧/错误处理测试；浏览器检查宽屏/窄屏、加载/空/错误状态。
5. 联调依赖不足时明确列出未验证部分；禁止把 mock 响应描述成后端已联调。

## 本轮验收结果

- 四个页面已实现，默认连接真实接口。
- TypeScript、生产构建与 12 项自动测试通过。
- 浏览器已检查桌面布局、390px 窄屏上传/聊天、导航和引用抽屉、快捷提问及接口失败反馈。
- 本机后端与依赖服务未启动，真实上传、向量化、模型流式输出和完整评测运行尚待联调。
- 未添加演示模式；原静态页面保留。

参考：[React 官方现有项目迁移说明](https://react.dev/learn/add-react-to-an-existing-project)。
