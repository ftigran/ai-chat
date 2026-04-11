"use client";

import { useState } from "react";
import type { Message } from "@/types/chat";
import type { Classification } from "@/lib/types";
import { MODELS } from "@/constants/models";
import { MessageContent } from "./message-content";
import { getAgentById } from "@/lib/agents";
import { textOf } from "@/lib/parse-message";

const COLOR_MAP: Record<string, string> = {
  emerald: "text-emerald-400 bg-emerald-900/40 border-emerald-700/50",
  blue: "text-blue-400 bg-blue-900/40 border-blue-700/50",
  amber: "text-amber-400 bg-amber-900/40 border-amber-700/50",
  red: "text-red-400 bg-red-900/40 border-red-700/50",
};

export function MessageBubble({
  message,
  index,
  isStreaming,
  isLoading,
  speakingIndex,
  onSpeak,
  onEdit,
  onRegenerate,
  onFeedback,
  onRegenModelChange,
  feedback,
  regenModel,
  currentModel,
  classification,
}: {
  message: Message;
  index: number;
  isStreaming: boolean;
  isLoading: boolean;
  speakingIndex: number | null;
  onSpeak: (index: number) => void;
  onEdit: (index: number, newText: string) => void;
  onRegenerate: (index: number) => void;
  onFeedback: (index: number, feedback: "like" | "dislike") => void;
  onRegenModelChange: (index: number, model: string) => void;
  feedback?: "like" | "dislike";
  regenModel?: string;
  currentModel: string;
  classification?: Classification;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="group relative flex justify-end items-start gap-2 max-w-[80%]">
          {!editing && !isLoading && (
            <button
              onClick={() => { setEditing(true); setEditText(textOf(message)); }}
              className="opacity-0 group-hover:opacity-100 mt-2 text-gray-500 hover:text-gray-300 transition-opacity flex-shrink-0"
              title="Редактировать"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {editing ? (
            <div className="flex flex-col gap-2 w-full">
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEdit(index, editText); setEditing(false); }
                  if (e.key === "Escape") setEditing(false);
                }}
                rows={3}
                className="bg-blue-700 text-white rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
                  Отмена
                </button>
                <button
                  onClick={() => { onEdit(index, editText); setEditing(false); }}
                  disabled={isLoading || !editText.trim()}
                  className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Отправить
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1">
              {classification && (() => {
                const agent = getAgentById(classification.category);
                if (!agent) return null;
                return (
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${COLOR_MAP[agent.color] ?? COLOR_MAP.blue}`}>
                    {agent.name}
                  </span>
                );
              })()}
              <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm">
                <MessageContent parts={message.parts} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] bg-gray-800 text-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm">
        <MessageContent parts={message.parts} streaming={isStreaming} />
        {!isStreaming && (
          <div className="mt-2 flex items-center gap-2">
            {/* TTS */}
            <button
              onClick={() => onSpeak(index)}
              className={`flex items-center gap-1 text-xs transition-colors ${speakingIndex === index ? "text-blue-400" : "text-gray-500 hover:text-gray-300"}`}
              title={speakingIndex === index ? "Остановить" : "Озвучить"}
            >
              {speakingIndex === index ? (
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

            <span className="w-px h-3 bg-gray-600" />

            {/* Like/Dislike */}
            <button
              onClick={() => onFeedback(index, "like")}
              className={`transition-colors ${feedback === "like" ? "text-green-400" : "text-gray-500 hover:text-gray-300"}`}
              title="Полезный ответ"
            >
              <svg className="w-3.5 h-3.5" fill={feedback === "like" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </button>
            <button
              onClick={() => onFeedback(index, "dislike")}
              className={`transition-colors ${feedback === "dislike" ? "text-red-400" : "text-gray-500 hover:text-gray-300"}`}
              title="Плохой ответ"
            >
              <svg className="w-3.5 h-3.5" fill={feedback === "dislike" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
            </button>

            <span className="w-px h-3 bg-gray-600" />

            {/* Regenerate */}
            <button
              onClick={() => onRegenerate(index)}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-300 disabled:opacity-40 transition-colors"
              title="Повторить запрос"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Per-message model selector */}
            <select
              value={regenModel ?? currentModel}
              onChange={(e) => onRegenModelChange(index, e.target.value)}
              className="bg-gray-700 border border-gray-600 text-xs text-gray-300 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
