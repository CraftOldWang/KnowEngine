import JSONbig from "json-bigint";
const parser = JSONbig({ storeAsString: true });
export function parseJson(text: string): unknown {
  return parser.parse(text);
}
export function query(values: Record<string, unknown>) {
  const p = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  });
  return p.toString();
}
export async function request<T>(
  path: string,
  init: RequestInit = {},
  options: { wrapped?: boolean; empty?: boolean } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new Error("无法连接服务，请确认后端已在 8009 端口启动。");
  }
  const raw = await response.text();
  let body: unknown;
  try {
    body = raw ? parseJson(raw) : undefined;
  } catch {
    body = raw;
  }
  if (!response.ok)
    throw new Error(
      typeof body === "string" && body.trim()
        ? body.slice(0, 400)
        : `请求失败（HTTP ${response.status}），请检查后端服务。`,
    );
  if (options.wrapped) {
    const result = body as
      { success?: boolean; message?: string; data?: T } | undefined;
    if (!result || result.success !== true)
      throw new Error(result?.message || "服务返回了无效结果");
    if ((result.data === undefined || result.data === null) && !options.empty)
      throw new Error("服务返回了空数据");
    return result.data as T;
  }
  if (body === false)
    throw new Error("操作未成功，数据可能已更新，请刷新后重试。");
  if ((body === undefined || body === null) && !options.empty)
    throw new Error("服务返回了空数据");
  return body as T;
}
export const json = (body: unknown, method = "POST"): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
export const safeUrl = (value?: string) => {
  try {
    const u = new URL(value || "", location.origin);
    return ["http:", "https:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
};
