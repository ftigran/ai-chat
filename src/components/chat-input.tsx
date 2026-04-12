"use client";

import type { McpServer } from "@/types/chat";

export function ChatInput({
  input,
  onInputChange,
  onKeyDown,
  onSend,
  onToggleRecording,
  recording,
  transcribing,
  loading,
  activeServers,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onToggleRecording: () => void;
  recording: boolean;
  transcribing: boolean;
  loading: boolean;
  activeServers: McpServer[];
}) {
  return (
    <footer className="border-t border-gray-800 px-4 py-4">
      <div className="max-w-3xl mx-auto flex gap-3 items-end">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            activeServers.length > 0
              ? `Напишите сообщение... MCP инструменты доступны (${activeServers.map((s) => s.name).join(", ")})`
              : "Напишите сообщение... (Enter — отправить, Shift+Enter — новая строка)"
          }
          rows={1}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-40 overflow-y-auto"
        />
        <button
          onClick={onToggleRecording}
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
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : recording ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>
        <button
          onClick={onSend}
          disabled={!input.trim() || loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </footer>
  );
}
