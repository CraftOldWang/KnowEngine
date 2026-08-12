import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowUp,
  BookOpen,
  Bot,
  Check,
  Copy,
  FileText,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Square,
  Trash2,
  User,
} from "lucide-react";
import { chatApi } from "../api";
import { parseJson, safeUrl } from "../api/http";
import type { Conversation, Message, Reference } from "../api/types";
import {
  Button,
  EmptyState,
  ErrorState,
  Loading,
  date,
  message,
} from "../components/ui";
export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [refs, setRefs] = useState<Reference[]>([]);
  const [refsOpen, setRefsOpen] = useState(() => window.innerWidth > 1050);
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const abort = useRef<AbortController | undefined>(undefined);
  const epoch = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  async function loadConversations() {
    try {
      setListError("");
      setConversations(await chatApi.listConversations());
    } catch (e) {
      setListError(message(e));
    }
  }
  useEffect(() => {
    void loadConversations();
    return () => {
      epoch.current++;
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);
  function stop() {
    abort.current?.abort();
    setStreaming(false);
    setMessages((prev) =>
      prev.map((m, index) =>
        index === prev.length - 1 && m.type === "ASSISTANT"
          ? {
              ...m,
              progress: undefined,
              notice: "已停止接收，已收到的内容已保留。",
            }
          : m,
      ),
    );
  }
  async function select(id?: string) {
    setHistoryOpen(false);
    epoch.current++;
    abort.current?.abort();
    setStreaming(false);
    setLoading(false);
    setActive(id);
    setMessages([]);
    setRefs([]);
    setError("");
    if (!id) return;
    const token = epoch.current;
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    try {
      const history = await chatApi.listMessages(id, controller.signal);
      if (token !== epoch.current) return;
      setMessages(history);
      setRefs(
        [...history].reverse().find((m) => m.ragReferences?.length)
          ?.ragReferences || [],
      );
    } catch (e) {
      if (!controller.signal.aborted && token === epoch.current)
        setError(message(e));
    } finally {
      if (token === epoch.current) setLoading(false);
    }
  }
  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || streaming || loading) return;
    const token = ++epoch.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const id = crypto.randomUUID();
    setInput("");
    setError("");
    setRefs([]);
    setStreaming(true);
    setMessages((prev) => [
      ...prev,
      {
        messageId: crypto.randomUUID(),
        type: "USER",
        content,
        createdAt: new Date().toISOString(),
      },
      {
        messageId: id,
        type: "ASSISTANT",
        content: "",
        progress: "正在连接…",
        ragReferences: [],
      },
    ]);
    let done = false;
    let received = false;
    const update = (fn: (m: Message) => Message) => {
      if (token === epoch.current)
        setMessages((prev) =>
          prev.map((m) => (m.messageId === id ? fn(m) : m)),
        );
    };
    try {
      await chatApi.streamAnswer(content, active, controller.signal, (data) => {
        if (token !== epoch.current || controller.signal.aborted) return;
        if (data.startsWith("[DONE]:")) {
          done = true;
          setActive(data.slice(7).trim());
          update((m) => ({ ...m, progress: undefined }));
          return;
        }
        if (data === "[DONE]") {
          done = true;
          update((m) => ({ ...m, progress: undefined }));
          return;
        }
        if (data.startsWith("[PROGRESS]:")) {
          update((m) => ({ ...m, progress: data.slice(11).trim() }));
          return;
        }
        if (data.startsWith("[REFERENCE]:")) {
          const references = parseJson(data.slice(12).trim());
          if (!Array.isArray(references)) throw new Error("引用数据格式无效");
          setRefs(references);
          update((m) => ({ ...m, ragReferences: references }));
          return;
        }
        if (data.startsWith("[WARN]:") || data.startsWith("[CARD]:")) {
          received = true;
          update((m) => ({
            ...m,
            notice: data.slice(7).trim(),
            progress: undefined,
          }));
          return;
        }
        received = true;
        update((m) => ({
          ...m,
          content: m.content + data,
          progress: undefined,
        }));
      });
      if (token === epoch.current) {
        if (!done)
          throw new Error(
            "连接已结束，未收到完成标记。回答可能不完整，请查看历史记录确认。",
          );
        if (!received)
          update((m) => ({
            ...m,
            notice: "本轮未返回回答内容。",
            progress: undefined,
          }));
        await loadConversations();
      }
    } catch (e) {
      if (!controller.signal.aborted && token === epoch.current) {
        setError(message(e));
        update((m) => ({
          ...m,
          progress: undefined,
          notice: "本轮接收中断，可保留已收到的内容。",
        }));
      }
    } finally {
      if (token === epoch.current) {
        setStreaming(false);
        textRef.current?.focus();
      }
    }
  }
  return (
    <div className={`chat-layout ${refsOpen ? "with-refs" : ""}`}>
      {historyOpen && (
        <div
          className="history-backdrop"
          onClick={() => setHistoryOpen(false)}
        />
      )}
      <aside className={`conversation-panel ${historyOpen ? "open" : ""}`}>
        <Button variant="primary" onClick={() => void select()}>
          <Plus size={17} />
          新建对话
        </Button>
        <div className="conversation-label">
          对话历史 <span>{conversations.length}</span>
        </div>
        <div className="search compact">
          <Search size={15} />
          <input
            aria-label="搜索会话"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="查找对话"
          />
        </div>
        {listError ? (
          <div className="sidebar-error">
            <p>{listError}</p>
            <Button onClick={() => void loadConversations()}>重新加载</Button>
          </div>
        ) : (
          <div className="conversation-list">
            {conversations
              .filter((c) =>
                (c.title || "").toLowerCase().includes(search.toLowerCase()),
              )
              .map((c) => (
                <div
                  className={`conversation ${active === c.conversationId ? "active" : ""}`}
                  key={c.conversationId}
                >
                  <button onClick={() => void select(c.conversationId)}>
                    <MessageSquare size={15} />
                    <span>
                      {c.title || "未命名对话"}
                      <small>{date(c.createdAt)}</small>
                    </span>
                  </button>
                  <button
                    className="delete-conversation"
                    aria-label={`删除会话 ${c.title}`}
                    onClick={async () => {
                      if (!confirm("删除此会话及全部消息？")) return;
                      try {
                        await chatApi.deleteConversation(c.conversationId);
                        if (active === c.conversationId) await select();
                        await loadConversations();
                      } catch (e) {
                        setListError(message(e));
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            {!conversations.length && (
              <p className="muted sidebar-note">新的想法，从一次提问开始。</p>
            )}
          </div>
        )}
      </aside>
      <section className="chat-main">
        <header className="chat-header">
          <Button
            variant="icon mobile-chat-history"
            aria-label="打开会话历史"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <MessageSquare size={18} />
          </Button>
          <div>
            <MessageSquare size={21} />
            <h1>AI 对话</h1>
            <span className="badge">知识库问答</span>
          </div>
          <Button
            variant="icon"
            aria-label={refsOpen ? "隐藏引用" : "显示引用"}
            onClick={() => setRefsOpen(!refsOpen)}
          >
            {refsOpen ? (
              <PanelRightClose size={19} />
            ) : (
              <PanelRightOpen size={19} />
            )}
          </Button>
        </header>
        <div className="messages">
          {loading ? (
            <Loading />
          ) : !messages.length ? (
            <div className="chat-welcome">
              <div className="welcome-mark">
                <BookOpen size={32} />
              </div>
              <div className="eyebrow">KNOWLEDGE BECOMES CLARITY</div>
              <h2>你的知识，都在这里。</h2>
              <p>提出问题，让答案与可靠的来源相连。</p>
              <div className="prompt-grid">
                {[
                  "帮我梳理文档中的关键观点",
                  "这些资料之间有什么关联？",
                  "解释一个我想了解的概念",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      textRef.current?.focus();
                    }}
                  >
                    <MessageSquare size={16} />
                    {q}
                    <ArrowUp size={15} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <article
                className={`message ${m.type === "USER" ? "user" : "assistant"}`}
                key={m.messageId}
              >
                <span className="avatar">
                  {m.type === "USER" ? <User size={18} /> : <Bot size={19} />}
                </span>
                <div className="message-body">
                  <div className="message-name">
                    {m.type === "USER" ? "你" : "Know Engine"}
                    <small>{date(m.createdAt)}</small>
                  </div>
                  {m.content && (
                    <div className="message-content">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                  {m.progress && (
                    <div className="progress">
                      <span className="pulse" />
                      {m.progress}
                    </div>
                  )}
                  {m.notice && <div className="notice">{m.notice}</div>}
                  {m.ragReferences?.length ? (
                    <button
                      className="reference-trigger"
                      onClick={() => {
                        setRefs(m.ragReferences || []);
                        setRefsOpen(true);
                      }}
                    >
                      <FileText size={14} />
                      {m.ragReferences.length} 个引用来源
                    </button>
                  ) : null}
                  {m.type === "ASSISTANT" && m.content && (
                    <div className="message-tools">
                      <Button
                        variant="icon"
                        aria-label="复制回答"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(m.content)
                            .catch(() =>
                              setError("复制失败，请手动选择文本复制。"),
                            );
                        }}
                      >
                        <Copy size={14} />
                      </Button>
                      {m.modelName && (
                        <small>
                          {m.modelName} · {m.tokenCount ?? "—"} tokens
                        </small>
                      )}
                      {m.transformContent && (
                        <details>
                          <summary>查看问题改写</summary>
                          <p>{m.transformContent}</p>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
          {error && <ErrorState error={error} />}
          <div ref={end} />
        </div>
        <div className="composer-wrap">
          <form className="composer" onSubmit={send}>
            <textarea
              ref={textRef}
              aria-label="输入问题"
              rows={2}
              placeholder="从你的知识库中，寻找一个答案…"
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <div className="composer-bottom">
              <span>
                <span className="dot" />
                基于知识库 · Enter 发送 / Shift + Enter 换行
              </span>
              {streaming ? (
                <Button type="button" variant="primary" onClick={stop}>
                  <Square size={15} />
                  停止
                </Button>
              ) : (
                <Button
                  variant="send"
                  aria-label="发送问题"
                  disabled={!input.trim() || loading}
                >
                  <ArrowUp size={20} />
                </Button>
              )}
            </div>
          </form>
          <p className="composer-note">
            AI 回答可能存在偏差，请结合引用来源核实。
          </p>
        </div>
      </section>
      {refsOpen && (
        <aside className="references">
          <div className="references-heading">
            <FileText size={18} />
            <h2>引用来源</h2>
            <span>{refs.length}</span>
          </div>
          {refs.length ? (
            <div className="reference-list">
              {refs.map((r, i) => (
                <article className="reference" key={`${r.chunkId}-${i}`}>
                  <div className="reference-title">
                    <span>[{i + 1}]</span>
                    <strong>{r.documentTitle || "知识库文档"}</strong>
                  </div>
                  <div className="metadata">
                    <span>{r.retrievalSource || "知识库"}</span>
                    {r.rerankScore != null && (
                      <span>重排 {r.rerankScore.toFixed(3)}</span>
                    )}
                  </div>
                  <blockquote>
                    {r.chunkContent || "此引用未提供片段正文"}
                  </blockquote>
                  <div className="metadata">
                    <span>文档 {r.documentId || "—"}</span>
                    {r.similarityScore != null && (
                      <span>检索分 {r.similarityScore.toFixed(3)}</span>
                    )}
                  </div>
                  {r.parentChunkId && (
                    <small className="muted">父分段 {r.parentChunkId}</small>
                  )}
                  {safeUrl(r.url) && (
                    <a target="_blank" rel="noreferrer" href={safeUrl(r.url)}>
                      查看原文 ↗
                    </a>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="让答案有据可循"
              description="回答引用的文档与原文片段，会显示在这里。"
            />
          )}
          <div className="references-footer">
            <Check size={15} />
            仅展示本次回答的真实检索来源
          </div>
        </aside>
      )}
    </div>
  );
}
