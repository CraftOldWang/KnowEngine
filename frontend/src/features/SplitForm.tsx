import { useState } from "react";
import { Scissors, RefreshCw } from "lucide-react";
import { documentsApi } from "../api";
import type { Document } from "../api/types";
import { Badge, Button, ErrorState, Field, message } from "../components/ui";
export function SplitForm({
  document,
  onUpdate,
}: {
  document: Document;
  onUpdate: (doc: Document) => void;
}) {
  const [type, setType] = useState("SMART");
  const [size, setSize] = useState(800);
  const [overlap, setOverlap] = useState(100);
  const [level, setLevel] = useState(2);
  const [regex, setRegex] = useState("");
  const [separator, setSeparator] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<string>("");
  async function split(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult("");
    try {
      const count = await documentsApi.split(document.docId, {
        splitType: type,
        chunkSize: size,
        ...(type === "LENGTH" || type === "SMART" ? { overlap } : {}),
        ...(type === "TITLE" ? { titleLevel: level } : {}),
        ...(type === "REGEX" ? { regex } : {}),
        ...(type === "SEPARATOR" ? { separator } : {}),
      });
      setResult(
        `已生成 ${count} 个分段。向量化在后台继续，请刷新查看实际状态。`,
      );
      onUpdate(await documentsApi.get(document.docId));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={split}>
      <div className="inline between">
        <div>
          <strong>{document.docTitle}</strong>
          <p className="muted">文档 #{document.docId}</p>
        </div>
        <Badge status={document.status} />
      </div>
      <div className="form-grid">
        <Field label="切分策略">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="SMART">智能切分</option>
            <option value="LENGTH">按长度切分</option>
            <option value="TITLE">按标题切分</option>
            <option value="REGEX">正则表达式</option>
            <option value="SEPARATOR">指定分隔符</option>
          </select>
        </Field>
        <Field label="分段长度">
          <input
            type="number"
            min={1}
            max={100000}
            value={size}
            required
            onChange={(e) => setSize(+e.target.value)}
          />
        </Field>
        {["SMART", "LENGTH"].includes(type) && (
          <Field label="重叠长度">
            <input
              type="number"
              min={0}
              max={size - 1}
              required
              value={overlap}
              onChange={(e) => setOverlap(+e.target.value)}
            />
          </Field>
        )}
        {type === "TITLE" && (
          <Field label="标题层级">
            <input
              type="number"
              min={1}
              max={6}
              required
              value={level}
              onChange={(e) => setLevel(+e.target.value)}
            />
          </Field>
        )}
        {type === "REGEX" && (
          <Field label="正则表达式">
            <input
              value={regex}
              required
              onChange={(e) => setRegex(e.target.value)}
              placeholder="例如：\n\n+"
            />
          </Field>
        )}
        {type === "SEPARATOR" && (
          <Field label="分隔符">
            <input
              value={separator}
              required
              onChange={(e) => setSeparator(e.target.value)}
              placeholder="输入实际分隔字符"
            />
          </Field>
        )}
      </div>
      {error && <ErrorState error={error} />}{" "}
      {result && <div className="notice">{result}</div>}
      <div className="actions">
        <Button
          type="button"
          disabled={busy}
          onClick={async () => {
            setError("");
            try {
              onUpdate(await documentsApi.get(document.docId));
            } catch (e) {
              setError(message(e));
            }
          }}
        >
          <RefreshCw size={16} />
          刷新状态
        </Button>
        <Button variant="primary" disabled={busy} type="submit">
          <Scissors size={16} />
          {busy ? "正在切分…" : "开始切分"}
        </Button>
      </div>
    </form>
  );
}
