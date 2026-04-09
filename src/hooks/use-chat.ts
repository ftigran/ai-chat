"use client";

import { useState } from "react";
import type { Message, McpServer } from "@/types/chat";
import { parseMessageParts } from "@/lib/parse-message";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(model: string, activeServers: McpServer[]) {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", parts: [{ type: "text", content: text }] };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const assistantIndex = newMessages.length;
    setMessages((prev) => [...prev, { role: "assistant", parts: [{ type: "text", content: "" }] }]);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.parts
          .filter((p): p is { type: "text"; content: string } => p.type === "text")
          .map((p) => p.content)
          .join(""),
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          model,
          mcpServers: activeServers.map((s) => ({ url: s.url })),
        }),
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
      const msg = err instanceof Error ? err.message : "Error";
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIndex] = { role: "assistant", parts: [{ type: "text", content: `Error: ${msg}` }] };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, model: string, activeServers: McpServer[]) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(model, activeServers);
    }
  }

  return { messages, input, setInput, loading, send, handleKeyDown };
}
