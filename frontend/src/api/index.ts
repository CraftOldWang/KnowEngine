import { request, json, query } from "./http";
import { consumeSse } from "./sse";
import type {
  Id,
  Document,
  Version,
  Segment,
  Page,
  Conversation,
  Message,
  EvalRun,
  Report,
  Comparison,
  EvalConfig,
} from "./types";
const d = "/api/document",
  s = "/api/segment";
export const documentsApi = {
  list: (current = 1, docTitle = "", status = "") =>
    request<Page<Document>>(
      `${d}/page?${query({ current, size: 10, docTitle, status })}`,
    ),
  get: (id: Id) => request<Document>(`${d}/${id}`),
  create: (doc: Partial<Document>) => request<boolean>(d, json(doc)),
  update: (doc: Document) => request<boolean>(d, json(doc, "PUT")),
  remove: (id: Id) => request<boolean>(`${d}/${id}`, { method: "DELETE" }),
  removeBatch: (ids: Id[]) =>
    request<boolean>(`${d}/batch?${query({ ids: ids.join(",") })}`, {
      method: "DELETE",
    }),
  upload: (form: FormData) =>
    request<Document>(`${d}/upload`, { method: "POST", body: form }),
  split: (id: Id, params: Record<string, unknown>) =>
    request<number>(`${d}/split/${id}?${query(params)}`, { method: "POST" }),
  versions: (id: Id) => request<Version[]>(`${d}/versions/${id}`),
  uploadVersion: (form: FormData) =>
    request<Document>(`${d}/upload-version`, { method: "POST", body: form }),
  switchVersion: (docId: Id, versionId: Id) =>
    request<Document>(`${d}/switch-version?${query({ docId, versionId })}`, {
      method: "POST",
    }),
  activateVersion: (versionId: Id) =>
    request<void>(
      `${d}/activate-version?${query({ versionId })}`,
      { method: "POST" },
      { empty: true },
    ),
  deactivateVersion: (versionId: Id) =>
    request<void>(
      `${d}/deactivate-version?${query({ versionId })}`,
      { method: "POST" },
      { empty: true },
    ),
};
export const segmentsApi = {
  list: (documentId: Id, current = 1, documentVersion?: Id) =>
    request<Page<Segment>>(
      `${s}/page-by-document?${query({ documentId, current, size: 10, documentVersion })}`,
    ),
  count: (documentId: Id, documentVersion?: Id) =>
    request<number>(
      `${s}/count-by-document?${query({ documentId, documentVersion })}`,
    ),
  get: (id: Id) => request<Segment>(`${s}/${id}`),
  update: (segment: Segment) => request<boolean>(s, json(segment, "PUT")),
  remove: (id: Id) => request<boolean>(`${s}/${id}`, { method: "DELETE" }),
};
export const chatApi = {
  listConversations: () =>
    request<Conversation[]>("/chat/conversation/list", {}, { wrapped: true }),
  listMessages: (conversationId: string, signal?: AbortSignal) =>
    request<Message[]>(
      `/chat/message/list?${query({ conversationId })}`,
      { signal },
      { wrapped: true },
    ),
  deleteConversation: (conversationId: string) =>
    request<void>(
      `/chat/conversation/delete?${query({ conversationId })}`,
      { method: "DELETE" },
      { wrapped: true, empty: true },
    ),
  streamAnswer: async (
    content: string,
    conversationId: string | undefined,
    signal: AbortSignal,
    onData: (data: string) => void,
  ) => {
    let response: Response;
    try {
      response = await fetch(
        `/chat/send?${query({ content, conversationId })}`,
        { method: "POST", signal },
      );
    } catch (e) {
      if (signal.aborted) throw e;
      throw new Error("无法连接对话服务，请确认后端已在 8009 端口启动。");
    }
    await consumeSse(response, onData, signal);
  },
};
export const evaluationsApi = {
  uploadDataset: (file: File) => {
    const form = new FormData();
    form.set("file", file);
    return request<{ datasetPath: string }>(
      "/eval/dataset/upload",
      { method: "POST", body: form },
      { wrapped: true },
    );
  },
  run: (datasetPath: string, config: EvalConfig) =>
    request<Report>("/eval/run", json({ datasetPath, config }), {
      wrapped: true,
    }),
  listRuns: (page = 1) =>
    request<Page<EvalRun>>(
      `/eval/runs?${query({ page, size: 10 })}`,
      {},
      { wrapped: true },
    ),
  report: (id: string) =>
    request<Report>(
      `/eval/report/${encodeURIComponent(id)}`,
      {},
      { wrapped: true },
    ),
  compare: (baseline: string, candidate: string) =>
    request<Comparison>(
      `/eval/compare?${query({ baseline, candidate })}`,
      {},
      { wrapped: true },
    ),
  exportCsvUrl: (id: string) =>
    `/eval/report/${encodeURIComponent(id)}/export.csv`,
};
