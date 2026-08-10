import { useState } from "react";
import { CloudUpload, Check, ArrowRight, FileText } from "lucide-react";
import { documentsApi } from "../api";
import { documentAccept, validateDocumentFile } from "../api/files";
import type { Document } from "../api/types";
import {
  Button,
  ErrorState,
  Field,
  PageHeader,
  message,
} from "../components/ui";
import { SplitForm } from "./SplitForm";
export default function Upload() {
  const [file, setFile] = useState<File>();
  const [doc, setDoc] = useState<Document>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    try {
      validateDocumentFile(file);
    } catch (e) {
      setError(message(e));
      return;
    }
    setError("");
    setBusy(true);
    const data = new FormData(e.currentTarget);
    data.set("file", file);
    try {
      setDoc(await documentsApi.upload(data));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="BUILD YOUR KNOWLEDGE"
        title="让知识，准备就绪"
        description="上传文档，选择适合的切分策略，将内容加入可检索的知识库。"
      />
      <div className="steps">
        <span className="active">
          <i>{doc ? <Check size={15} /> : 1}</i>上传与转换
        </span>
        <ArrowRight size={16} />
        <span className={doc ? "active" : ""}>
          <i>2</i>切分与索引
        </span>
        <ArrowRight size={16} />
        <span>
          <i>3</i>开始探索
        </span>
      </div>
      <div className="upload-layout">
        <section className="panel">
          <div className="panel-heading">
            <h2>{doc ? "02 / 切分与索引" : "01 / 上传文档"}</h2>
            <span className="muted">
              {doc ? "转换完成后手动触发切分" : "文件会保存到知识库"}
            </span>
          </div>
          {!doc ? (
            <form onSubmit={upload}>
              <label
                className={`dropzone ${file ? "selected" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setFile(e.dataTransfer.files[0]);
                }}
              >
                <input
                  type="file"
                  accept={documentAccept}
                  name="file"
                  required={!file}
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
                <div className="upload-icon">
                  <CloudUpload size={30} />
                </div>
                <strong>
                  {file ? file.name : "点击选择，或将文件拖到这里"}
                </strong>
                <span>
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB · 点击重新选择`
                    : "PDF / Word / Excel / Markdown / TXT / CSV · 最大 100MB"}
                </span>
              </label>
              <div className="form-grid">
                <Field label="文档标题">
                  <input
                    name="title"
                    required
                    maxLength={200}
                    placeholder="给文档起一个容易找到的名字"
                    defaultValue={file?.name}
                  />
                </Field>
                <Field label="初始版本">
                  <input
                    name="version"
                    required
                    defaultValue="1.0.0"
                    pattern="\d+\.\d+\.\d+"
                  />
                </Field>
              </div>
              <Field label="文档描述">
                <textarea
                  name="description"
                  required
                  rows={3}
                  placeholder="这份文档包含什么内容？"
                />
              </Field>
              <Field label="上传人（可选）">
                <input name="uploadUser" placeholder="留空使用系统默认用户" />
              </Field>
              {error && <ErrorState error={error} />}
              <div className="actions">
                <Button variant="primary" disabled={busy || !file}>
                  <CloudUpload size={17} />
                  {busy ? "上传并转换中…" : "上传并转换"}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <SplitForm document={doc} onUpdate={setDoc} />
              <div className="actions">
                <Button
                  onClick={() => {
                    setDoc(undefined);
                    setFile(undefined);
                  }}
                >
                  继续上传
                </Button>
                <a className="button primary" href="#/documents">
                  前往知识库
                  <ArrowRight size={16} />
                </a>
              </div>
            </>
          )}
        </section>
        <aside className="guide panel">
          <div className="guide-icon">
            <FileText size={24} />
          </div>
          <h2>好的知识，始于好的整理</h2>
          <p>清晰的标题与结构，让每一次检索更准确。</p>
          <ol>
            <li>
              <strong>准备文档</strong>
              <p>移除重复内容，保留完整的标题与上下文。</p>
            </li>
            <li>
              <strong>选择切分方式</strong>
              <p>结构清晰的内容可按标题切分，通用文档可先尝试智能切分。</p>
            </li>
            <li>
              <strong>等待索引完成</strong>
              <p>文档显示「可检索」后，即可在 AI 对话中引用。</p>
            </li>
          </ol>
          <div className="tip">
            上传成功后会完成转换；切分和向量化是后续独立步骤。
          </div>
        </aside>
      </div>
    </div>
  );
}
