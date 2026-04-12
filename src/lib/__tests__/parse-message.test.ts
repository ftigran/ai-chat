import { describe, it, expect } from "vitest";
import { parseMessageParts, textOf } from "@/lib/parse-message";
import type { Message } from "@/types/chat";

describe("parseMessageParts", () => {
  it("returns plain text for simple string", () => {
    const parts = parseMessageParts("Hello world");
    expect(parts).toEqual([{ type: "text", content: "Hello world" }]);
  });

  it("returns text part for empty string", () => {
    const parts = parseMessageParts("");
    expect(parts).toEqual([{ type: "text", content: "" }]);
  });

  it("parses a single tool marker", () => {
    const parts = parseMessageParts("[tool:search_google]");
    expect(parts).toEqual([{ type: "tool_call", name: "search_google" }]);
  });

  it("parses a single mcp_error marker", () => {
    const parts = parseMessageParts("[mcp_error:Connection failed]");
    expect(parts).toEqual([{ type: "mcp_error", message: "Connection failed" }]);
  });

  it("parses text with tool markers interspersed", () => {
    const input = "Looking up data[tool:fetch_data]Here are results[tool:format_output]Done";
    const parts = parseMessageParts(input);
    expect(parts).toEqual([
      { type: "text", content: "Looking up data" },
      { type: "tool_call", name: "fetch_data" },
      { type: "text", content: "Here are results" },
      { type: "tool_call", name: "format_output" },
      { type: "text", content: "Done" },
    ]);
  });

  it("parses mixed tool and error markers", () => {
    const input = "[tool:search][mcp_error:Timeout][tool:retry]";
    const parts = parseMessageParts(input);
    expect(parts).toEqual([
      { type: "tool_call", name: "search" },
      { type: "mcp_error", message: "Timeout" },
      { type: "tool_call", name: "retry" },
    ]);
  });

  it("handles text before and after markers", () => {
    const input = "Начало [tool:test] Конец";
    const parts = parseMessageParts(input);
    expect(parts).toEqual([
      { type: "text", content: "Начало " },
      { type: "tool_call", name: "test" },
      { type: "text", content: " Конец" },
    ]);
  });

  it("handles RAG error format", () => {
    const input = "[mcp_error:RAG: Превышен лимит OpenAI API]Some text";
    const parts = parseMessageParts(input);
    expect(parts).toEqual([
      { type: "mcp_error", message: "RAG: Превышен лимит OpenAI API" },
      { type: "text", content: "Some text" },
    ]);
  });
});

describe("textOf", () => {
  it("extracts text from message with only text parts", () => {
    const msg: Message = {
      role: "assistant",
      parts: [
        { type: "text", content: "Hello " },
        { type: "text", content: "world" },
      ],
    };
    expect(textOf(msg)).toBe("Hello world");
  });

  it("skips non-text parts", () => {
    const msg: Message = {
      role: "assistant",
      parts: [
        { type: "text", content: "Result: " },
        { type: "tool_call", name: "search" },
        { type: "text", content: "done" },
        { type: "mcp_error", message: "error" },
      ],
    };
    expect(textOf(msg)).toBe("Result: done");
  });

  it("returns empty string for message with no text parts", () => {
    const msg: Message = {
      role: "assistant",
      parts: [{ type: "tool_call", name: "search" }],
    };
    expect(textOf(msg)).toBe("");
  });
});
