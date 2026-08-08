import { afterEach, describe, it, expect, vi } from "vitest";
import { request, parseJson } from "./http";
afterEach(() => vi.unstubAllGlobals());
describe("HTTP response adaptation", () => {
  it("rejects successful wrappers with null data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"success":true,"data":null}')),
    );
    await expect(request("/test", {}, { wrapped: true })).rejects.toThrow(
      "空数据",
    );
  });
  it("rejects Result business failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"success":false,"message":"failed"}'),
        ),
    );
    await expect(request("/test", {}, { wrapped: true })).rejects.toThrow(
      "failed",
    );
  });
  it("rejects false mutations", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("false")));
    await expect(request("/test")).rejects.toThrow("操作未成功");
  });
  it("accepts void 204 only for explicit empty endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(new Response(null, { status: 204 })),
        ),
    );
    await expect(
      request("/test", {}, { empty: true }),
    ).resolves.toBeUndefined();
    await expect(request("/test")).rejects.toThrow("空数据");
  });
  it("keeps large Java Long IDs as strings without losing precision", () => {
    expect(parseJson('{"id":9223372036854775807,"count":10}')).toEqual({
      id: "9223372036854775807",
      count: 10,
    });
  });
  it("does not retry network failures", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("network"));
    vi.stubGlobal("fetch", fetch);
    await expect(request("/eval/run")).rejects.toThrow("无法连接");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
