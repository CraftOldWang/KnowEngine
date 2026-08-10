import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Layers,
  Scissors,
  History,
  ArrowUpRight,
  Pencil,
} from "lucide-react";
import { documentsApi, segmentsApi } from "../api";
import type { Document, Page, Segment, Version, Id } from "../api/types";
import { safeUrl } from "../api/http";
import { documentAccept, validateDocumentFile } from "../api/files";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  PageHeader,
  Pagination,
  date,
  message,
  statusNames,
} from "../components/ui";
import { SplitForm } from "./SplitForm";
export default function Documents() {
  const [data, setData] = useState<Page<Document>>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ search: "", status: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Id[]>([]);
  const [dialog, setDialog] = useState<{ kind: string; doc?: Document }>();
  const [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await documentsApi.list(page, filter.search, filter.status));
      setSelected([]);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [page, filter]);
  async function remove(ids: Id[]) {
    if (
      !confirm(`删除 ${ids.length} 份文档及其全部分段和向量？此操作无法撤销。`)
    )
      return;
    setBusy(true);
    try {
      if (ids.length === 1) await documentsApi.remove(ids[0]);
      else await documentsApi.removeBatch(ids);
      if (data && data.records.length === ids.length && page > 1)
        setPage(page - 1);
      else await load();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="YOUR KNOWLEDGE, CONNECTED"
        title="知识库"
        description="把分散的信息，整理成随时可用的知识。"
        action={
          <a href="#/upload" className="button primary">
            <Plus size={18} />
            上传文档
          </a>
        }
      />
      <div className="stats-strip">
        <div>
          <span className="stat-icon">
            <FileText size={21} />
          </span>
          <div>
            <strong>{data?.total ?? "—"}</strong>
            <span>文档总数</span>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <Layers size={21} />
          </span>
          <div>
            <strong>版本与分段</strong>
            <span>让内容持续更新</span>
          </div>
        </div>
        <div className="stat-note">
          <span className="dot" />
          以真实索引状态为准
        </div>
      </div>
      <section className="panel document-panel">
        <div className="toolbar">
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setFilter({ ...filter, search });
            }}
          >
            <Search size={18} />
            <input
              aria-label="搜索文档"
              placeholder="搜索文档标题…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="quiet" type="submit">
              搜索
            </Button>
          </form>
          <select
            aria-label="文档状态"
            value={filter.status}
            onChange={(e) => {
              setPage(1);
              setFilter({ ...filter, status: e.target.value });
            }}
          >
            <option value="">全部状态</option>
            {Object.entries(statusNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Button aria-label="刷新文档" onClick={() => void load()}>
            <RefreshCw size={16} />
          </Button>
          <Button onClick={() => setDialog({ kind: "create" })}>
            <Plus size={16} />
            新建记录
          </Button>
        </div>
        {selected.length > 0 && (
          <div className="selection-bar">
            已选择 {selected.length} 份文档
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void remove(selected)}
            >
              <Trash2 size={15} />
              批量删除
            </Button>
          </div>
        )}
        {error ? (
          <ErrorState error={error} retry={() => void load()} />
        ) : loading ? (
          <Loading />
        ) : !data?.records.length ? (
          <EmptyState
            title="知识，从第一份文档开始"
            description="上传你的资料，让 AI 从可靠的内容中找到答案。"
            action={
              <a className="button primary" href="#/upload">
                <Plus size={16} />
                上传文档
              </a>
            }
          />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th className="checkbox-cell">
                      <input
                        type="checkbox"
                        aria-label="选择本页全部文档"
                        checked={selected.length === data.records.length}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? data.records.map((d) => d.docId)
                              : [],
                          )
                        }
                      />
                    </th>
                    <th>文档名称</th>
                    <th>索引状态</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((doc) => (
                    <tr key={doc.docId}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`选择 ${doc.docTitle}`}
                          checked={selected.includes(doc.docId)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, doc.docId]
                                : selected.filter((id) => id !== doc.docId),
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="doc-title"
                          onClick={() => setDialog({ kind: "detail", doc })}
                        >
                          <span className="file-icon">
                            <FileText size={20} />
                          </span>
                          <span>
                            <strong>{doc.docTitle}</strong>
                            <small>
                              {doc.description || `文档 #${doc.docId}`}
                            </small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <Badge status={doc.status} />
                      </td>
                      <td className="muted nowrap">
                        {date(doc.updatedAt || doc.createdAt)}
                      </td>
                      <td>
                        <div className="row-actions">
                          <Button
                            variant="icon"
                            title="查看分段"
                            aria-label={`查看 ${doc.docTitle} 分段`}
                            onClick={() => setDialog({ kind: "segments", doc })}
                          >
                            <Layers size={16} />
                          </Button>
                          <Button
                            variant="icon"
                            title="版本管理"
                            aria-label={`管理 ${doc.docTitle} 版本`}
                            onClick={() => setDialog({ kind: "versions", doc })}
                          >
                            <History size={16} />
                          </Button>
                          <Button
                            variant="icon"
                            title="切分文档"
                            aria-label={`切分 ${doc.docTitle}`}
                            onClick={() => setDialog({ kind: "split", doc })}
                          >
                            <Scissors size={16} />
                          </Button>
                          <Button
                            variant="icon danger-text"
                            title="删除文档"
                            aria-label={`删除 ${doc.docTitle}`}
                            disabled={busy}
                            onClick={() => void remove([doc.docId])}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={data.total} onChange={setPage} />
          </>
        )}
      </section>
      {dialog && (
        <Dialog
          title={
            dialog.kind === "create"
              ? "新建文档记录"
              : `${({ detail: "文档详情", segments: "文档分段", versions: "版本管理", split: "切分文档" } as Record<string, string>)[dialog.kind]} · ${dialog.doc?.docTitle}`
          }
          wide={dialog.kind !== "create"}
          onClose={() => setDialog(undefined)}
        >
          {dialog.kind === "create" || dialog.kind === "detail" ? (
            <DocumentEditor
              doc={dialog.doc}
              onSaved={() => {
                setDialog(undefined);
                void load();
              }}
            />
          ) : dialog.kind === "split" ? (
            <SplitForm
              document={dialog.doc!}
              onUpdate={(doc) => {
                setDialog({ ...dialog, doc });
                void load();
              }}
            />
          ) : dialog.kind === "segments" ? (
            <Segments doc={dialog.doc!} />
          ) : (
            <Versions doc={dialog.doc!} onChanged={() => void load()} />
          )}
        </Dialog>
      )}
    </div>
  );
}
function DocumentEditor({
  doc,
  onSaved,
}: {
  doc?: Document;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const values = {
        docTitle: String(f.get("title")),
        description: String(f.get("description")),
        status: String(f.get("status")),
        extension: String(f.get("extension") || ""),
      };
      if (doc) {
        const latest = await documentsApi.get(doc.docId);
        if (latest.lockVersion !== doc.lockVersion)
          throw new Error("文档已被更新，请关闭后重新打开以获取最新版本。");
        await documentsApi.update({ ...latest, ...values });
      } else await documentsApi.create(values);
      onSaved();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save}>
      {doc && (
        <div className="metadata">
          <span>ID {doc.docId}</span>
          <span>创建于 {date(doc.createdAt)}</span>
          <span>锁版本 {doc.lockVersion ?? "—"}</span>
        </div>
      )}
      <Field label="文档标题">
        <input name="title" required defaultValue={doc?.docTitle} />
      </Field>
      <Field label="描述">
        <textarea name="description" rows={4} defaultValue={doc?.description} />
      </Field>
      <Field label="状态">
        <select name="status" defaultValue={doc?.status || "INIT"}>
          {Object.entries(statusNames).map(([k, v]) => (
            <option value={k} key={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="扩展信息（JSON）">
        <textarea name="extension" rows={3} defaultValue={doc?.extension} />
      </Field>
      {error && <ErrorState error={error} />}
      <div className="actions">
        <Button variant="primary" disabled={busy}>
          <Pencil size={16} />
          {busy ? "保存中…" : "保存记录"}
        </Button>
      </div>
    </form>
  );
}
function Segments({ doc }: { doc: Document }) {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(String(doc.currentVersionId || ""));
  const [versions, setVersions] = useState<Version[]>([]);
  const [data, setData] = useState<Page<Segment>>();
  const [count, setCount] = useState<number>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Segment>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    documentsApi
      .versions(doc.docId)
      .then(setVersions)
      .catch((e) => setError(message(e)));
  }, [doc.docId]);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [records, total] = await Promise.all([
        segmentsApi.list(doc.docId, page, version || undefined),
        segmentsApi.count(doc.docId, version || undefined),
      ]);
      setData(records);
      setCount(total);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [page, version]);
  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      await segmentsApi.update(editing);
      setEditing(undefined);
      await load();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="toolbar">
        <select
          aria-label="分段版本"
          value={version}
          onChange={(e) => {
            setVersion(e.target.value);
            setPage(1);
          }}
        >
          <option value="">所有版本</option>
          {versions.map((v) => (
            <option key={v.versionId} value={String(v.versionId)}>
              v{v.version}
            </option>
          ))}
        </select>
        <span className="muted">共 {count ?? "—"} 个分段</span>
        <Button onClick={() => void load()}>
          <RefreshCw size={15} />
          刷新
        </Button>
      </div>
      {error && <ErrorState error={error} />}{" "}
      {loading ? (
        <Loading />
      ) : data?.records.length ? (
        <>
          <div className="segment-list">
            {data.records.map((seg) => (
              <article className="segment" key={seg.id}>
                <div className="inline between">
                  <strong>
                    #{seg.chunkOrder}{" "}
                    <small className="muted">{seg.chunkId}</small>
                  </strong>
                  <Badge status={seg.status} />
                </div>
                {editing?.id === seg.id ? (
                  <textarea
                    aria-label="分段内容"
                    rows={8}
                    value={editing.text}
                    onChange={(e) =>
                      setEditing({ ...editing, text: e.target.value })
                    }
                  />
                ) : (
                  <pre>{seg.text}</pre>
                )}
                <div className="inline between">
                  <small className="muted">
                    {seg.skipEmbedding === 1
                      ? "父分段 · 内容随子分段同步"
                      : `版本 ${seg.documentVersion} · ${seg.text.length} 字符`}
                  </small>
                  <div className="row-actions">
                    {editing?.id === seg.id ? (
                      <>
                        <Button
                          disabled={busy}
                          onClick={() => setEditing(undefined)}
                        >
                          取消
                        </Button>
                        <Button
                          variant="primary"
                          disabled={busy}
                          onClick={() => void save()}
                        >
                          保存
                        </Button>
                      </>
                    ) : (
                      <Button
                        disabled={seg.skipEmbedding === 1}
                        onClick={async () => {
                          try {
                            setEditing(await segmentsApi.get(seg.id));
                          } catch (e) {
                            setError(message(e));
                          }
                        }}
                      >
                        编辑
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={async () => {
                        if (!confirm("删除此分段？")) return;
                        try {
                          await segmentsApi.remove(seg.id);
                          if (data.records.length === 1 && page > 1)
                            setPage(page - 1);
                          else await load();
                        } catch (e) {
                          setError(message(e));
                        }
                      }}
                    >
                      删除
                    </Button>
                  </div>
                </div>
                <details>
                  <summary>元数据</summary>
                  <pre>{seg.metadata || "无元数据"}</pre>
                </details>
              </article>
            ))}
          </div>
          <Pagination page={page} total={data.total} onChange={setPage} />
        </>
      ) : (
        <EmptyState
          title="此版本还没有分段"
          description="完成文档切分后，分段会显示在这里。"
        />
      )}
    </>
  );
}
function Versions({
  doc,
  onChanged,
}: {
  doc: Document;
  onChanged: () => void;
}) {
  const [versions, setVersions] = useState<Version[]>();
  const [current, setCurrent] = useState(doc.currentVersionId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      setVersions(await documentsApi.versions(doc.docId));
      setCurrent((await documentsApi.get(doc.docId)).currentVersionId);
    } catch (e) {
      setError(message(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function action(fn: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await fn();
      await load();
      onChanged();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && <ErrorState error={error} />}{" "}
      {!versions ? (
        <Loading />
      ) : versions.length ? (
        <div className="version-list">
          {versions.map((v) => (
            <article className="segment" key={v.versionId}>
              <div className="inline between">
                <h3>
                  v{v.version}{" "}
                  {String(current) === String(v.versionId) && (
                    <span className="badge success">当前版本</span>
                  )}
                </h3>
                <Badge status={v.status} />
              </div>
              <p>{v.changelog || "暂无版本说明"}</p>
              <div className="metadata">
                <span>{date(v.createdAt)}</span>
                <span>{v.uploadUser || "默认用户"}</span>
              </div>
              <div className="actions">
                {safeUrl(v.docUrl) && (
                  <a
                    className="button"
                    href={safeUrl(v.docUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    原始文件
                    <ArrowUpRight size={14} />
                  </a>
                )}
                {safeUrl(v.convertedDocUrl) && (
                  <a
                    className="button"
                    href={safeUrl(v.convertedDocUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    转换文件
                    <ArrowUpRight size={14} />
                  </a>
                )}
                {String(current) !== String(v.versionId) && (
                  <Button
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          "切换版本将清理当前分段和向量，切换后需要重新切分。继续？",
                        )
                      )
                        void action(() =>
                          documentsApi.switchVersion(doc.docId, v.versionId),
                        );
                    }}
                  >
                    切换到此版本
                  </Button>
                )}
                <Button
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        v.status === "VECTOR_STORED"
                          ? "停用此版本的检索向量？"
                          : "重新向量化此版本？",
                      )
                    )
                      void action(() =>
                        v.status === "VECTOR_STORED"
                          ? documentsApi.deactivateVersion(v.versionId)
                          : documentsApi.activateVersion(v.versionId),
                      );
                  }}
                >
                  {v.status === "VECTOR_STORED" ? "停用检索" : "启用检索"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无版本" />
      )}
      <h3 className="section-title">上传新版本</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          f.set("docId", String(doc.docId));
          try {
            validateDocumentFile(f.get("file") as File);
          } catch (e) {
            setError(message(e));
            return;
          }
          void action(() => documentsApi.uploadVersion(f));
        }}
      >
        <div className="form-grid">
          <Field label="版本号（须高于最新版本）">
            <input
              name="version"
              required
              placeholder="2.0.0"
              pattern="\d+\.\d+\.\d+"
            />
          </Field>
          <Field label="上传人（可选）">
            <input name="uploadUser" />
          </Field>
        </div>
        <Field label="版本文件">
          <input type="file" accept={documentAccept} name="file" required />
        </Field>
        <Field label="变更说明">
          <textarea name="changelog" rows={2} />
        </Field>
        <div className="actions">
          <Button variant="primary" disabled={busy}>
            {busy ? "处理中…" : "上传新版本"}
          </Button>
        </div>
      </form>
    </>
  );
}
