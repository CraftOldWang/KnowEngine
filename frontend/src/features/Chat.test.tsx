// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import Chat from "./Chat";
import { chatApi } from "../api";
import type { Message } from "../api/types";
vi.mock("../api", () => ({
  chatApi: {
    listConversations: vi.fn(),
    listMessages: vi.fn(),
    streamAnswer: vi.fn(),
    deleteConversation: vi.fn(),
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  vi.mocked(chatApi.listConversations).mockResolvedValue([
    { conversationId: "old", title: "旧会话" },
  ]);
});
afterEach(cleanup);
describe("conversation request isolation", () => {
  it("new conversation resets loading and ignores a late history response", async () => {
    let resolveHistory!: (messages: Message[]) => void;
    vi.mocked(chatApi.listMessages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveHistory = resolve;
        }),
    );
    render(<Chat />);
    fireEvent.click(await screen.findByText("旧会话"));
    const input = screen.getByRole("textbox", {
      name: "输入问题",
    }) as HTMLTextAreaElement;
    expect(input.disabled).toBe(true);
    const signal = vi.mocked(chatApi.listMessages).mock.calls[0][1];
    fireEvent.click(screen.getByRole("button", { name: "新建对话" }));
    expect(signal?.aborted).toBe(true);
    expect(input.disabled).toBe(false);
    await act(async () =>
      resolveHistory([
        { messageId: "late", type: "ASSISTANT", content: "过期回答" },
      ]),
    );
    expect(screen.queryByText("过期回答")).toBeNull();
    expect(input.disabled).toBe(false);
  });
  it("switching conversations aborts the old stream and ignores its tokens", async () => {
    let emit!: (data: string) => void;
    let resolveStream!: () => void;
    vi.mocked(chatApi.streamAnswer).mockImplementation(
      (_content, _id, _signal, onData) => {
        emit = onData;
        return new Promise((resolve) => {
          resolveStream = resolve;
        });
      },
    );
    vi.mocked(chatApi.listMessages).mockResolvedValue([
      { messageId: "history", type: "ASSISTANT", content: "历史回答" },
    ]);
    render(<Chat />);
    await screen.findByText("旧会话");
    fireEvent.change(screen.getByRole("textbox", { name: "输入问题" }), {
      target: { value: "你好" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送问题" }));
    await waitFor(() => expect(chatApi.streamAnswer).toHaveBeenCalledOnce());
    const signal = vi.mocked(chatApi.streamAnswer).mock.calls[0][2];
    fireEvent.click(screen.getByText("旧会话"));
    expect(signal.aborted).toBe(true);
    await screen.findByText("历史回答");
    await act(async () => {
      emit("过期 token");
      resolveStream();
    });
    expect(screen.queryByText("过期 token")).toBeNull();
    expect(screen.getByText("历史回答")).toBeTruthy();
  });
});
