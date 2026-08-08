/** Incremental SSE decoder: retain incomplete lines, normalize CRLF, join multiple data fields. */
export class SseParser {
  private buffer = "";
  private data: string[] = [];
  constructor(private emit: (data: string) => void) {}
  push(chunk: string) {
    this.buffer += chunk;
    let index: number;
    while ((index = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, index).replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      this.line(line);
    }
  }
  private line(line: string) {
    if (line === "") {
      if (this.data.length) this.emit(this.data.join("\n"));
      this.data = [];
    } else if (line === "data" || line.startsWith("data:"))
      this.data.push(line === "data" ? "" : line.slice(5).replace(/^ /, ""));
  }
  finish() {
    if (this.buffer) this.line(this.buffer.replace(/\r$/, ""));
    this.buffer = "";
    this.line("");
  }
}
export async function consumeSse(
  response: Response,
  onData: (data: string) => void,
  signal: AbortSignal,
) {
  if (!response.ok) throw new Error(`对话请求失败（HTTP ${response.status}）`);
  if (!response.headers.get("content-type")?.includes("text/event-stream"))
    throw new Error("服务未返回对话流，请检查后端服务。");
  if (!response.body) throw new Error("服务返回了空对话流");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser(onData);
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.finish();
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
