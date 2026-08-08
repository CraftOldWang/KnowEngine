import { describe, it, expect } from "vitest";
import { SseParser, consumeSse } from "./sse";
describe("SSE framing", () => {
  it("retains split CRLF frames and joins data lines", () => {
    const values: string[] = [];
    const p = new SseParser((v) => values.push(v));
    [
      ": ping\r\n",
      "data: hel",
      "lo\r",
      "\ndata: world\r\n\r",
      "\ndata: [DONE]:abc\n\n",
    ].forEach((c) => p.push(c));
    p.finish();
    expect(values).toEqual(["hello\nworld", "[DONE]:abc"]);
  });
  it("preserves empty data and whitespace in tokens", () => {
    const values: string[] = [];
    const p = new SseParser((v) => values.push(v));
    p.push("event: message\ndata:  \n\ndata:\n\n");
    p.finish();
    expect(values).toEqual([" ", ""]);
  });
  it("decodes UTF-8 split in the middle of Chinese characters", async () => {
    const bytes = new TextEncoder().encode("data: 你好\n\ndata: [DONE]\n\n");
    const stream = new ReadableStream({
      start(c) {
        for (const byte of bytes) c.enqueue(Uint8Array.of(byte));
        c.close();
      },
    });
    const values: string[] = [];
    await consumeSse(
      new Response(stream, {
        headers: { "Content-Type": "text/event-stream" },
      }),
      (v) => values.push(v),
      new AbortController().signal,
    );
    expect(values).toEqual(["你好", "[DONE]"]);
  });
  it("rejects non-SSE success responses", async () => {
    await expect(
      consumeSse(new Response("ok"), () => {}, new AbortController().signal),
    ).rejects.toThrow("未返回对话流");
  });
});
