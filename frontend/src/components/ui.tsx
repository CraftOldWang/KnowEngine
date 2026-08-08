import { useEffect, useRef, type ReactNode } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  LoaderCircle,
  X,
} from "lucide-react";
export function Button({
  children,
  variant = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return (
    <button {...props} className={`button ${variant} ${props.className || ""}`}>
      {children}
    </button>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  return (
    <div className="error" role="alert">
      <AlertCircle size={19} />
      <div>
        <strong>暂时无法完成请求</strong>
        <p>{error}</p>
        {retry && <Button onClick={retry}>重新加载</Button>}
      </div>
    </div>
  );
}
export function EmptyState({
  title = "这里还没有内容",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <FileSearch size={27} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} />
      正在加载…
    </div>
  );
}
export const statusNames: Record<string, string> = {
  INIT: "待处理",
  UPLOADED: "已上传",
  CONVERTING: "转换中",
  CONVERTED: "待切分",
  CHUNKED: "已切分",
  VECTOR_STORED: "可检索",
  STORED: "已停用",
};
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status === "VECTOR_STORED" ? "success" : ""}`}>
      {statusNames[status] || status}
    </span>
  );
}
export function Pagination({
  page,
  total,
  size = 10,
  onChange,
}: {
  page: number;
  total: number;
  size?: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        共 {total} 条 · 第 {page} / {Math.max(1, Math.ceil(total / size))} 页
      </span>
      <Button
        aria-label="上一页"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} />
      </Button>
      <Button
        aria-label="下一页"
        disabled={page * size >= total}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={wide ? "wide" : ""}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <Button aria-label="关闭" variant="icon" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export const date = (value?: string) =>
  value
    ? new Date(value).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export const message = (error: unknown) =>
  error instanceof Error ? error.message : "请求失败，请稍后重试。";
