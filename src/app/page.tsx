"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AGENTS, getAgentById, DEFAULT_AGENT_ID } from "@/lib/agents";
import { saveTicket } from "@/lib/ticket-store";
import type { Classification, Ticket } from "@/lib/types";

const MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "Groq", mcpDisabled: true },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B", provider: "Groq", mcpDisabled: true },
  { id: "qwen/qwen3-32b", label: "Qwen 3 32B", provider: "Groq", mcpDisabled: false },
];

type McpServer = { id: string; name: string; url: string; enabled: boolean };

type MessagePart =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string }
  | { type: "mcp_error"; message: string };

type Message = { role: "user" | "assistant"; parts: MessagePart[] };

function parseMessageParts(raw: string): MessagePart[] {
  const parts: MessagePart[] = [];
  const regex = /\[(tool|mcp_error):([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: raw.slice(lastIndex, match.index) });
    }
    if (match[1] === "tool") {
      parts.push({ type: "tool_call", name: match[2] });
    } else {
      parts.push({ type: "mcp_error", message: match[2] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    parts.push({ type: "text", content: raw.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: raw }];
}

function textOf(msg: Message): string {
  return msg.parts
    .filter((p): p is { type: "text"; content: string } => p.type === "text")
    .map((p) => p.content)
    .join("");
}

function MessageContent({ parts, streaming }: { parts: MessagePart[]; streaming?: boolean }) {
  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === "tool_call") {
          return (
            <div key={i} className="inline-flex items-center gap-1.5 bg-emerald-900/40 border border-emerald-700/50 text-emerald-400 text-xs px-2 py-1 rounded-md my-1 mr-1">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {part.name}
            </div>
          );
        }
        if (part.type === "mcp_error") {
          return (
            <div key={i} className="inline-flex items-center gap-1.5 bg-red-900/40 border border-red-700/50 text-red-400 text-xs px-2 py-1 rounded-md my-1 mr-1">
              {part.message}
            </div>
          );
        }
        const isLast = i === parts.length - 1;
        return (
          <span key={i} className="whitespace-pre-wrap leading-relaxed">
            {part.content}
            {isLast && streaming && (
              <span className="inline-block w-1.5 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
            )}
          </span>
        );
      })}
    </div>
  );
}

function McpSettings({
  servers,
  onChange,
  onClose,
}: {
  servers: McpServer[];
  onChange: (servers: McpServer[]) => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  function add() {
    if (!newUrl.trim()) return;
    const server: McpServer = {
      id: crypto.randomUUID(),
      name: newName.trim() || new URL(newUrl.trim()).hostname,
      url: newUrl.trim(),
      enabled: true,
    };
    onChange([...servers, server]);
    setNewName("");
    setNewUrl("");
  }

  function toggle(id: string) {
    onChange(servers.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }

  function remove(id: string) {
    onChange(servers.filter((s) => s.id !== id));
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-[420px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 z-50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-100">MCP Серверы</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Добавьте любые MCP серверы. ЛЛМ получит доступ к их инструментам.
      </p>

      {/* Server list */}
      {servers.length > 0 && (
        <div className="space-y-2 mb-3">
          {servers.map((s) => (
            <div key={s.id} className={`flex items-center gap-2 p-2 rounded-lg border ${s.enabled ? "border-gray-600 bg-gray-800" : "border-gray-700 bg-gray-850 opacity-60"}`}>
              <button
                onClick={() => toggle(s.id)}
                className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 ${s.enabled ? "bg-emerald-600" : "bg-gray-600"}`}
              >
                <span className={`block w-3 h-3 rounded-full bg-white mx-auto transition-transform ${s.enabled ? "translate-x-1" : "-translate-x-1"}`} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-200 truncate">{s.name}</div>
                <div className="text-xs text-gray-500 truncate">{s.url}</div>
              </div>
              <button onClick={() => remove(s.id)} className="text-gray-600 hover:text-red-400 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="border-t border-gray-700 pt-3 space-y-2">
        <input
          type="text"
          placeholder="Название (необязательно)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-100"
        />
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://mcp.zapier.com/api/mcp/s/..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="flex-1 bg-gray-800 border border-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-100"
          />
          <button
            onClick={add}
            disabled={!newUrl.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  // Edit & regenerate state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [regenModel, setRegenModel] = useState<Record<number, string>>({});
  // Routing state
  const [routingEnabled, setRoutingEnabled] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classifications, setClassifications] = useState<Record<number, Classification>>({});
  const [conversationId] = useState(() => crypto.randomUUID());

  const bottomRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("mcpServers");
    if (saved) {
      try { setMcpServers(JSON.parse(saved)); } catch {}
    }
  }, []);

  function saveServers(servers: McpServer[]) {
    setMcpServers(servers);
    localStorage.setItem("mcpServers", JSON.stringify(servers));
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettings]);

  const activeServers = mcpServers.filter((s) => s.enabled);

  async function callAPI(
    msgsToSend: Message[],
    assistantIndex: number,
    modelOverride?: string,
    systemPrompt?: string
  ): Promise<void> {
    try {
      const apiMessages = msgsToSend.map((m) => ({
        role: m.role,
        content: m.parts
          .filter((p): p is { type: "text"; content: string } => p.type === "text")
          .map((p) => p.content)
          .join(""),
      }));

      const effectiveModel = modelOverride ?? model;
      const effectiveModelDef = MODELS.find((m) => m.id === effectiveModel);
      const mcpDisabled = effectiveModelDef?.mcpDisabled ?? false;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          model: effectiveModel,
          mcpServers: mcpDisabled ? [] : activeServers.map((s) => ({ url: s.url })),
          ...(systemPrompt && { systemPrompt }),
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

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setTranscribing(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", blob, "audio.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = await res.json();
          if (data.text) setInput((prev) => prev + (prev ? " " : "") + data.text);
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      alert("Не удалось получить доступ к микрофону");
    }
  }

  async function speakMessage(index: number, parts: MessagePart[]) {
    if (speakingIndex === index) {
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
      setSpeakingIndex(null);
      return;
    }

    const text = parts
      .filter((p): p is { type: "text"; content: string } => p.type === "text")
      .map((p) => p.content)
      .join("")
      .trim();

    if (!text) return;

    setSpeakingIndex(index);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const msg = res.status === 402
          ? "Озвучка недоступна: требуется платный план ElevenLabs"
          : `Ошибка озвучки (${res.status})`;
        setTtsError(msg);
        setTimeout(() => setTtsError(null), 4000);
        setSpeakingIndex(null);
        return;
      }
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      currentAudioRef.current = audio;
      audio.onended = () => setSpeakingIndex(null);
      audio.onerror = () => setSpeakingIndex(null);
      audio.play();
    } catch {
      setTtsError("Не удалось подключиться к сервису озвучки");
      setTimeout(() => setTtsError(null), 4000);
      setSpeakingIndex(null);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", parts: [{ type: "text", content: text }] };
    const newMessages = [...messages, userMsg];
    const userMsgIndex = newMessages.length - 1;
    setMessages([...newMessages, { role: "assistant", parts: [{ type: "text", content: "" }] }]);
    setInput("");
    setLoading(true);

    let agentSystemPrompt: string | undefined;
    let agentModelId: string | undefined;
    let resolvedClassification: Classification | undefined;
    const startTime = Date.now();

    if (routingEnabled) {
      setClassifying(true);
      try {
        const classifyRes = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        resolvedClassification = (await classifyRes.json()) as Classification;
        setClassifications((prev) => ({ ...prev, [userMsgIndex]: resolvedClassification! }));

        const agent = getAgentById(resolvedClassification.category);
        if (agent) {
          agentSystemPrompt = agent.systemPrompt;
          agentModelId = agent.modelId;
        }
      } catch {
        // Classification failed — continue without routing
      } finally {
        setClassifying(false);
      }
    }

    await callAPI(newMessages, newMessages.length, agentModelId, agentSystemPrompt);

    // Save ticket after response completes
    if (routingEnabled && resolvedClassification) {
      const agent = getAgentById(resolvedClassification.category);
      const ticket: Ticket = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        userMessage: text,
        classification: resolvedClassification,
        agentId: resolvedClassification.category,
        agentName: agent?.name ?? "FAQ",
        responsePreview: "",
        responseTime: Date.now() - startTime,
        conversationId,
      };
      saveTicket(ticket);
    }
  }

  async function saveEdit(index: number, newText: string) {
    if (!newText.trim() || loading) return;

    const truncated = messages.slice(0, index);
    const editedMsg: Message = { role: "user", parts: [{ type: "text", content: newText.trim() }] };
    const newMessages = [...truncated, editedMsg];
    setMessages([...newMessages, { role: "assistant", parts: [{ type: "text", content: "" }] }]);
    setEditingIndex(null);
    setLoading(true);

    await callAPI(newMessages, newMessages.length);
  }

  async function regenerate(assistantIdx: number) {
    if (loading) return;

    const msgsToSend = messages.slice(0, assistantIdx);
    setMessages((prev) => {
      const updated = [...prev];
      updated[assistantIdx] = { role: "assistant", parts: [{ type: "text", content: "" }] };
      return updated;
    });
    setLoading(true);

    await callAPI(msgsToSend, assistantIdx, regenModel[assistantIdx]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const selectedModel = MODELS.find((m) => m.id === model)!;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-lg font-semibold hover:text-blue-400 transition-colors" title="Дашборд">AI Chat</Link>
          {activeServers.length > 0 && (
            selectedModel.mcpDisabled ? (
              <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                MCP OFF
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-800 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {activeServers.length} MCP
              </span>
            )
          )}
          <button
            onClick={() => setRoutingEnabled((v) => !v)}
            className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border transition-colors ${
              routingEnabled
                ? "text-violet-400 bg-violet-900/30 border-violet-800"
                : "text-gray-500 bg-gray-800/50 border-gray-700 hover:text-gray-300"
            }`}
            title="Автомаршрутизация агентов"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {routingEnabled ? "Routing ON" : "Routing"}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{selectedModel.provider}</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings((v) => !v)}
              className={`p-1.5 rounded-lg transition-colors ${showSettings ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
              title="MCP Серверы"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {showSettings && (
              <McpSettings
                servers={mcpServers}
                onChange={saveServers}
                onClose={() => setShowSettings(false)}
              />
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
            <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm">Начните разговор</p>
            {activeServers.length > 0 && (
              <p className="text-xs text-emerald-500">{activeServers.length} MCP сервер(а) подключено</p>
            )}
          </div>
        )}
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "user" ? (
                <div className="group relative flex justify-end items-start gap-2 max-w-[80%]">
                  {/* Pencil button — visible on hover, hidden while loading or in edit mode */}
                  {editingIndex !== i && !loading && (
                    <button
                      onClick={() => { setEditingIndex(i); setEditingText(textOf(msg)); }}
                      className="opacity-0 group-hover:opacity-100 mt-2 text-gray-500 hover:text-gray-300 transition-opacity flex-shrink-0"
                      title="Редактировать"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}

                  {editingIndex === i ? (
                    <div className="flex flex-col gap-2 w-full">
                      <textarea
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(i, editingText); }
                          if (e.key === "Escape") setEditingIndex(null);
                        }}
                        rows={3}
                        className="bg-blue-700 text-white rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => saveEdit(i, editingText)}
                          disabled={loading || !editingText.trim()}
                          className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Отправить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      {classifications[i] && (() => {
                        const agent = getAgentById(classifications[i].category);
                        if (!agent) return null;
                        const colorMap: Record<string, string> = {
                          emerald: "text-emerald-400 bg-emerald-900/40 border-emerald-700/50",
                          blue: "text-blue-400 bg-blue-900/40 border-blue-700/50",
                          amber: "text-amber-400 bg-amber-900/40 border-amber-700/50",
                          red: "text-red-400 bg-red-900/40 border-red-700/50",
                        };
                        return (
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${colorMap[agent.color] ?? colorMap.blue}`}>
                            {agent.name}
                          </span>
                        );
                      })()}
                      <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm">
                        <MessageContent parts={msg.parts} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-[80%] bg-gray-800 text-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm">
                  <MessageContent
                    parts={msg.parts}
                    streaming={loading && i === messages.length - 1}
                  />
                  {!(loading && i === messages.length - 1) && (
                    <div className="mt-2 flex items-center gap-2">
                      {/* TTS button */}
                      <button
                        onClick={() => speakMessage(i, msg.parts)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          speakingIndex === i ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
                        }`}
                        title={speakingIndex === i ? "Остановить" : "Озвучить"}
                      >
                        {speakingIndex === i ? (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M9 9v6l4-3-4-3z" />
                          </svg>
                        )}
                      </button>

                      {/* Divider */}
                      <span className="w-px h-3 bg-gray-600" />

                      {/* Regenerate button */}
                      <button
                        onClick={() => regenerate(i)}
                        disabled={loading}
                        className="text-gray-500 hover:text-gray-300 disabled:opacity-40 transition-colors"
                        title="Повторить запрос"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>

                      {/* Per-message model selector */}
                      <select
                        value={regenModel[i] ?? model}
                        onChange={(e) => setRegenModel((prev) => ({ ...prev, [i]: e.target.value }))}
                        className="bg-gray-700 border border-gray-600 text-xs text-gray-300 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {MODELS.map((m) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {classifying && (
            <div className="flex justify-start">
              <div className="bg-violet-900/30 border border-violet-700/50 text-violet-300 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Классификация...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* TTS error toast */}
      {ttsError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          {ttsError}
        </div>
      )}

      {/* Input */}
      <footer className="border-t border-gray-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeServers.length > 0
                ? `Напишите сообщение... MCP инструменты доступны (${activeServers.map((s) => s.name).join(", ")})`
                : "Напишите сообщение... (Enter — отправить, Shift+Enter — новая строка)"
            }
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-40 overflow-y-auto"
          />
          <button
            onClick={toggleRecording}
            disabled={transcribing || loading}
            title={recording ? "Остановить запись" : "Голосовой ввод"}
            className={`rounded-xl px-4 py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              recording
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            }`}
          >
            {transcribing ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : recording ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}
