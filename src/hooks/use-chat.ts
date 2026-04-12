"use client";

import { useState, useRef, useEffect } from "react";
import type { Message, McpServer } from "@/types/chat";
import { parseMessageParts } from "@/lib/parse-message";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function callAPI(
    msgsToSend: Message[],
    assistantIndex: number,
    model: string,
    activeServers: McpServer[],
    options?: {
      modelOverride?: string;
      systemPrompt?: string;
      ragEnabled?: boolean;
      mcpDisabled?: boolean;
    },
  ): Promise<void> {
    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const apiMessages = msgsToSend.map((m) => ({
        role: m.role,
        content: m.parts
          .filter((p): p is { type: "text"; content: string } => p.type === "text")
          .map((p) => p.content)
          .join(""),
      }));

      const effectiveModel = options?.modelOverride ?? model;
      const mcpDisabled = options?.mcpDisabled ?? false;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          model: effectiveModel,
          mcpServers: mcpDisabled ? [] : activeServers.map((s) => ({ url: s.url })),
          ...(options?.systemPrompt && { systemPrompt: options.systemPrompt }),
          ragEnabled: options?.ragEnabled ?? false,
        }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIndex] = { role: "assistant", parts: parseMessageParts(raw) };
          return updated;
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Error";
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIndex] = {
          role: "assistant",
          parts: [{ type: "text", content: `Error: ${msg}` }],
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  async function send(
    model: string,
    activeServers: McpServer[],
    options?: {
      systemPrompt?: string;
      modelOverride?: string;
      ragEnabled?: boolean;
      mcpDisabled?: boolean;
    },
  ) {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", parts: [{ type: "text", content: text }] };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "assistant", parts: [{ type: "text", content: "" }] }]);
    setInput("");
    setLoading(true);

    const assistantIndex = newMessages.length;
    await callAPI(newMessages, assistantIndex, model, activeServers, options);

    return { userMsgIndex: newMessages.length - 1, assistantMsgIndex: assistantIndex, newMessages };
  }

  async function saveEdit(
    index: number,
    newText: string,
    model: string,
    activeServers: McpServer[],
    options?: { systemPrompt?: string; ragEnabled?: boolean; mcpDisabled?: boolean },
  ) {
    if (!newText.trim() || loading) return;

    const truncated = messages.slice(0, index);
    const editedMsg: Message = { role: "user", parts: [{ type: "text", content: newText.trim() }] };
    const newMessages = [...truncated, editedMsg];
    setMessages([...newMessages, { role: "assistant", parts: [{ type: "text", content: "" }] }]);
    setLoading(true);

    await callAPI(newMessages, newMessages.length, model, activeServers, options);
  }

  async function regenerate(
    assistantIdx: number,
    model: string,
    activeServers: McpServer[],
    options?: {
      modelOverride?: string;
      systemPrompt?: string;
      ragEnabled?: boolean;
      mcpDisabled?: boolean;
    },
  ) {
    if (loading) return;

    const msgsToSend = messages.slice(0, assistantIdx);
    setMessages((prev) => {
      const updated = [...prev];
      updated[assistantIdx] = { role: "assistant", parts: [{ type: "text", content: "" }] };
      return updated;
    });
    setLoading(true);

    await callAPI(msgsToSend, assistantIdx, model, activeServers, options);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, onSend: () => void) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return {
    messages,
    setMessages,
    input,
    setInput,
    loading,
    send,
    saveEdit,
    regenerate,
    handleKeyDown,
  };
}
