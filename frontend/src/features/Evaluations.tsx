import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Download,
  FlaskConical,
  Play,
  RefreshCw,
  Upload,
} from "lucide-react";
import { evaluationsApi } from "../api";
import type {
  Comparison,
  Delta,
  EvalConfig,
  EvalRun,
  Page,
  Report,
} from "../api/types";
import {
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
} from "../components/ui";
const metricNames: Record<string, string> = {
  hitAtK: "Hit@K",
  mrr: "MRR",
  recallAtK: "Recall@K",
  avgLatencyMs: "平均延迟 (ms)",
  p50LatencyMs: "P50 延迟 (ms)",
  p95LatencyMs: "P95 延迟 (ms)",
  faithfulness: "忠实度",
  relevancy: "相关性",
  answerCorrectness: "答案正确性",
  contextPrecision: "上下文精确率",
  contextRecall: "上下文召回率",
};
const format = (v: unknown) =>
  typeof v === "number"
    ? Number.isInteger(v)
      ? String(v)
      : v.toFixed(4)
    : "—";
export default function Evaluations({ active = true }: { active?: boolean }) {
  const [tab, setTab] = useState("runs");
  const [data, setData] = useState<Page<EvalRun>>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report>();
  const [baseline, setBaseline] = useState("");
  const [candidate, setCandidate] = useState("");
  const [comparison, setComparison] = useState<Comparison>();
  const [path, setPath] = useState("classpath:eval/datasets/eval-test.jsonl");
  const [file, setFile] = useState<File>();
  const [config, setConfig] = useState<EvalConfig>({
    topK: 5,
    concurrency: 1,
    enableLlmJudge: true,
    reviewScoreThreshold: 0.6,
    reviewMrrThreshold: 0.3,
    reviewRecallAtKThreshold: 0.3,
  });
  const [status, setStatus] = useState("");
  const [reportId, setReportId] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await evaluationsApi.listRuns(page));
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [page]);
  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setStatus(file ? "正在上传并校验评测集…" : "正在评测，请等待完整报告…");
    try {
      let datasetPath = path;
      if (file) {
        datasetPath = (await evaluationsApi.uploadDataset(file)).datasetPath;
        setPath(datasetPath);
        setFile(undefined);
      }
      setStatus("正在评测，请等待完整报告。耗时取决于用例数量与模型响应。");
      setReport(await evaluationsApi.run(datasetPath, config));
      setStatus("评测完成");
      void load();
      setTab("runs");
    } catch (e) {
      setError(
        `${message(e)} 若连接中断，后端可能仍在运行，请先刷新历史记录确认，再决定是否重新运行。`,
      );
      setStatus("请求结束，未收到完整报告。");
    } finally {
      setBusy(false);
    }
  }
  async function openReport(id: string) {
    setError("");
    setLoading(true);
    try {
      setReport(await evaluationsApi.report(id));
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="MEASURE. LEARN. IMPROVE."
        title="评测中心"
        description="从检索到生成，用可比较的结果，了解每一次改进。"
        action={
          <Button variant="primary" onClick={() => setTab("new")}>
            <PlusIcon />
            新建评测
          </Button>
        }
      />
      <div className="tabs">
        <button
          className={tab === "runs" ? "active" : ""}
          onClick={() => setTab("runs")}
        >
          运行记录
        </button>
        <button
          className={tab === "new" ? "active" : ""}
          onClick={() => setTab("new")}
        >
          发起评测
        </button>
        <button
          className={tab === "compare" ? "active" : ""}
          onClick={() => setTab("compare")}
        >
          版本对比
        </button>
      </div>
      {error && <ErrorState error={error} />}{" "}
      {busy && (
        <div className="notice eval-running" role="status">
          <span className="pulse" />
          {status}
        </div>
      )}
      {tab === "runs" ? (
        <section className="panel">
          <div className="panel-heading">
            <h2>评测运行</h2>
            <Button disabled={loading} onClick={() => void load()}>
              <RefreshCw size={16} />
              刷新记录
            </Button>
          </div>
          <form
            className="toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              void openReport(reportId.trim());
            }}
          >
            <input
              aria-label="运行 ID"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              placeholder="输入运行 ID 查找报告"
              required
            />
            <Button disabled={loading}>
              查看报告
              <ArrowRight size={15} />
            </Button>
          </form>
          {loading ? (
            <Loading />
          ) : error && !data ? null : !data?.records.length ? (
            <EmptyState
              title="让每次改进，都有迹可循"
              description="使用 JSONL 测试集发起第一次评测，查看检索与生成质量。"
              action={
                <Button onClick={() => setTab("new")} variant="primary">
                  <FlaskConical size={17} />
                  发起评测
                </Button>
              }
            />
          ) : (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>运行 / 数据集</th>
                      <th>用例</th>
                      <th>Hit@K</th>
                      <th>忠实度</th>
                      <th>失败 / 待复核</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map((r) => (
                      <tr key={r.runId}>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => void openReport(r.runId)}
                          >
                            {r.runId}
                          </button>
                          <small
                            className="table-subtitle"
                            title={r.datasetPath}
                          >
                            {r.datasetPath}
                          </small>
                          <small className="muted">{date(r.createdAt)}</small>
                        </td>
                        <td>
                          {r.totalCases}
                          <small className="table-subtitle">
                            已检索评分 {r.evaluatedCases}
                          </small>
                        </td>
                        <td>{format(r.hitAtK)}</td>
                        <td>{format(r.faithfulness)}</td>
                        <td>
                          {r.failedCount ?? 0} / {r.reviewCount ?? 0}
                        </td>
                        <td>
                          <Button onClick={() => void openReport(r.runId)}>
                            报告
                          </Button>
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
      ) : tab === "new" ? (
        <div className="upload-layout">
          <section className="panel">
            <div className="panel-heading">
              <h2>配置评测任务</h2>
              <FlaskConical size={21} />
            </div>
            <form onSubmit={run}>
              <Field
                label="测试集文件（可选）"
                hint="选择 JSONL 后会先上传并校验，然后启动本次评测。"
              >
                <input
                  type="file"
                  accept=".jsonl"
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
              </Field>
              <Field label="或使用服务端数据集路径">
                <input
                  required={!file}
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                />
              </Field>
              <div className="form-grid">
                <Field label="Top K">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={config.topK}
                    onChange={(e) =>
                      setConfig({ ...config, topK: +e.target.value })
                    }
                  />
                </Field>
                <Field label="并发度">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={config.concurrency}
                    onChange={(e) =>
                      setConfig({ ...config, concurrency: +e.target.value })
                    }
                  />
                </Field>
                {(
                  [
                    "reviewScoreThreshold",
                    "reviewMrrThreshold",
                    "reviewRecallAtKThreshold",
                  ] as const
                ).map((key, i) => (
                  <Field
                    key={key}
                    label={
                      ["生成评分复核阈值", "MRR 复核阈值", "Recall@K 复核阈值"][
                        i
                      ]
                    }
                  >
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={config[key]}
                      required
                      onChange={(e) =>
                        setConfig({ ...config, [key]: +e.target.value })
                      }
                    />
                  </Field>
                ))}
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={config.enableLlmJudge}
                  onChange={(e) =>
                    setConfig({ ...config, enableLlmJudge: e.target.checked })
                  }
                />
                启用 LLM Judge 生成质量评分
              </label>
              <div className="notice">
                评测会调用配置的模型服务。运行期间保持页面打开；网络失败后请先检查运行记录。
              </div>
              <div className="actions">
                <Button variant="primary" disabled={busy}>
                  <Play size={16} />
                  {busy ? "评测进行中…" : "启动评测"}
                </Button>
              </div>
            </form>
          </section>
          <aside className="guide panel">
            <div className="guide-icon">
              <BarChart3 size={25} />
            </div>
            <h2>看见答案背后的质量</h2>
            <p>一份测试集，覆盖检索表现、生成质量和上下文有效性。</p>
            <ol>
              <li>
                <strong>检索指标</strong>
                <p>Hit@K、MRR、Recall@K 与检索延迟。</p>
              </li>
              <li>
                <strong>生成指标</strong>
                <p>忠实度、相关性、正确性与上下文质量。</p>
              </li>
              <li>
                <strong>逐题复核</strong>
                <p>查看真实回答、引用和评分理由，定位问题。</p>
              </li>
            </ol>
            <details>
              <summary>JSONL 格式示例</summary>
              <pre>
                {
                  '{"id":"q1","question":"你的问题","groundTruthAnswer":"标准答案","groundTruthDocumentIds":["1"]}'
                }
              </pre>
            </details>
          </aside>
        </div>
      ) : (
        <section className="panel">
          <div className="panel-heading">
            <h2>比较两次运行</h2>
            <BarChart3 size={20} />
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setLoading(true);
              setComparison(undefined);
              try {
                setComparison(
                  await evaluationsApi.compare(baseline, candidate),
                );
              } catch (e) {
                setError(message(e));
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="form-grid">
              <Field label="基线运行 ID">
                <input
                  list="run-ids"
                  required
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                  placeholder="选择或输入运行 ID"
                />
              </Field>
              <Field label="候选运行 ID">
                <input
                  list="run-ids"
                  required
                  value={candidate}
                  onChange={(e) => setCandidate(e.target.value)}
                  placeholder="选择或输入运行 ID"
                />
              </Field>
            </div>
            <datalist id="run-ids">
              {data?.records.map((r) => (
                <option key={r.runId} value={r.runId} />
              ))}
            </datalist>
            <div className="actions">
              <Button
                variant="primary"
                disabled={loading || baseline === candidate}
              >
                开始比较
                <ArrowRight size={16} />
              </Button>
            </div>
          </form>
          {loading ? (
            <Loading />
          ) : comparison ? (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>指标</th>
                      <th>基线</th>
                      <th>候选</th>
                      <th>差值（候选 − 基线）</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(metricNames)
                      .filter(
                        ([k]) =>
                          comparison[k] &&
                          typeof comparison[k] === "object" &&
                          !Array.isArray(comparison[k]),
                      )
                      .map(([k, label]) => {
                        const d = comparison[k] as Delta;
                        return (
                          <tr key={k}>
                            <td>{label}</td>
                            <td>{format(d.baseline)}</td>
                            <td>{format(d.candidate)}</td>
                            <td
                              className={
                                d.delta != null && d.delta !== 0
                                  ? (
                                      k === "avgLatencyMs"
                                        ? d.delta < 0
                                        : d.delta > 0
                                    )
                                    ? "positive"
                                    : "negative"
                                  : ""
                              }
                            >
                              {d.delta != null && d.delta > 0 ? "+" : ""}
                              {format(d.delta)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <div className="comparison-notes">
                <p>提升用例：{comparison.improvedCaseIds.join("、") || "无"}</p>
                <p>
                  回退用例：{comparison.regressedCaseIds.join("、") || "无"}
                </p>
              </div>
            </>
          ) : (
            <EmptyState
              title="每个改变，都值得比较"
              description="选择同一测试集的两次运行，观察指标变化与用例回退。"
            />
          )}
        </section>
      )}
      {report && active && (
        <Dialog
          title={`评测报告 · ${report.runId}`}
          wide
          onClose={() => setReport(undefined)}
        >
          <ReportView report={report} />
        </Dialog>
      )}
    </div>
  );
}
function PlusIcon() {
  return <FlaskConical size={18} />;
}
function ReportView({ report }: { report: Report }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const cases = report.caseResults.filter(
    (c) =>
      (filter === "all" ||
        (filter === "failed" && !c.success) ||
        (filter === "review" && report.reviewCaseIds.includes(c.caseId))) &&
      `${c.caseId} ${c.question}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="inline between">
        <div className="metadata">
          <span>{date(report.createdAt)}</span>
          <span>{report.totalCases} 个用例</span>
          <span>
            检索评分 {report.evaluatedCases} / 生成评分{" "}
            {report.generationEvaluatedCases}
          </span>
        </div>
        <a
          className="button"
          href={evaluationsApi.exportCsvUrl(report.runId)}
          download
        >
          <Download size={16} />
          导出 CSV
        </a>
      </div>
      <p className="muted break">{report.datasetPath}</p>
      {(
        [
          ["检索质量", report.retrieval],
          ["生成质量", report.generation],
          ["上下文质量", report.context],
        ] as const
      ).map(([title, metrics]) => (
        <section key={title}>
          <h3 className="section-title">{title}</h3>
          <div className="metric-grid">
            {Object.entries(metrics || {})
              .filter(([key]) => metricNames[key])
              .map(([key, value]) => (
                <div key={key}>
                  <span>{metricNames[key]}</span>
                  <strong>{format(value)}</strong>
                </div>
              ))}
          </div>
        </section>
      ))}
      <details className="config-details">
        <summary>运行配置</summary>
        <pre>{JSON.stringify(report.config, null, 2)}</pre>
      </details>
      <h3 className="section-title">用例明细</h3>
      <div className="toolbar">
        <input
          placeholder="搜索问题或用例 ID"
          aria-label="搜索评测用例"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="用例筛选"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">全部用例</option>
          <option value="failed">
            执行失败 ({report.failedCaseIds.length})
          </option>
          <option value="review">待复核 ({report.reviewCaseIds.length})</option>
        </select>
      </div>
      {cases.length ? (
        cases.map((c) => (
          <details className="case" key={c.caseId}>
            <summary>
              <span className={`badge ${c.success ? "success" : ""}`}>
                {c.success ? "完成" : "失败"}
              </span>
              <strong>{c.question}</strong>
              <small>
                {c.caseId} · {c.latencyMs} ms
              </small>
            </summary>
            <div className="case-body">
              {c.error && <div className="error">{c.error}</div>}
              {c.transformContent && (
                <p className="muted">改写：{c.transformContent}</p>
              )}
              <h4>模型回答</h4>
              <p className="prewrap">{c.answer || "未返回回答"}</p>
              <h4>检索评分</h4>
              <div className="metadata">
                {Object.entries(c.retrievalScores || {}).map(([k, v]) => (
                  <span key={k}>
                    {metricNames[k] || k}：{String(v)}
                  </span>
                ))}
              </div>
              <h4>生成评分与理由</h4>
              {Object.entries(c.generationScores || {}).map(([k, v]) => (
                <p key={k}>
                  <strong>
                    {metricNames[k] ||
                      (metricNames[k.replace(/Reason$/, "")] &&
                        `${metricNames[k.replace(/Reason$/, "")]}理由`) ||
                      k}
                    ：
                  </strong>
                  {v == null ? "未评分" : String(v)}
                </p>
              ))}
              <details>
                <summary>检索引用 ({c.ragReferences?.length || 0})</summary>
                {c.ragReferences?.map((r, i) => (
                  <blockquote key={i}>
                    <strong>{r.documentTitle}</strong>
                    <p>{r.chunkContent}</p>
                  </blockquote>
                ))}
                <p className="muted">
                  分段：{c.retrievedChunkIds?.join("、") || "无"}
                  <br />
                  文档：{c.retrievedDocumentIds?.join("、") || "无"}
                </p>
              </details>
            </div>
          </details>
        ))
      ) : (
        <EmptyState title="没有符合筛选条件的用例" />
      )}
    </>
  );
}
