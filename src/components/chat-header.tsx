"use client";

import { useRef, useCallback } from "react";
import Link from "next/link";
import { MODELS } from "@/constants/models";
import type { McpServer } from "@/types/chat";
import { McpSettings } from "./mcp-settings";
import { useClickOutside } from "@/hooks/use-click-outside";

export function ChatHeader({
  model,
  onModelChange,
  activeServers,
  mcpServers,
  onServersChange,
  showSettings,
  onToggleSettings,
  routingEnabled,
  onToggleRouting,
  ragEnabled,
  ragFileReady,
  onToggleRag,
  showRagSettings,
  onToggleRagSettings,
  ragUploading,
  ragUploadStatus,
  onRagUpload,
}: {
  model: string;
  onModelChange: (model: string) => void;
  activeServers: McpServer[];
  mcpServers: McpServer[];
  onServersChange: (servers: McpServer[]) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
  routingEnabled: boolean;
  onToggleRouting: () => void;
  ragEnabled: boolean;
  ragFileReady: boolean;
  onToggleRag: () => void;
  showRagSettings: boolean;
  onToggleRagSettings: () => void;
  ragUploading: boolean;
  ragUploadStatus: string | null;
  onRagUpload: (file: File) => void;
}) {
  const settingsRef = useRef<HTMLDivElement>(null);
  const ragSettingsRef = useRef<HTMLDivElement>(null);
  const closeSettings = useCallback(() => { if (showSettings) onToggleSettings(); }, [showSettings, onToggleSettings]);
  const closeRagSettings = useCallback(() => { if (showRagSettings) onToggleRagSettings(); }, [showRagSettings, onToggleRagSettings]);
  useClickOutside(settingsRef, closeSettings);
  useClickOutside(ragSettingsRef, closeRagSettings);

  const selectedModel = MODELS.find((m) => m.id === model)!;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-lg font-semibold hover:text-blue-400 transition-colors" title="Дашборд">AI Chat</Link>
        <Link
          href="/support"
          className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800/50 border border-gray-700 rounded-full px-2.5 py-1 hover:text-orange-400 hover:border-orange-700 transition-colors"
          title="Поддержка — сообщить о баге"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Поддержка
        </Link>
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
          onClick={onToggleRouting}
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
        <button
          onClick={onToggleRag}
          disabled={!ragFileReady}
          className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border transition-colors ${
            !ragFileReady
              ? "text-gray-600 bg-gray-800/30 border-gray-800 cursor-not-allowed opacity-50"
              : ragEnabled
                ? "text-teal-400 bg-teal-900/30 border-teal-800"
                : "text-gray-500 bg-gray-800/50 border-gray-700 hover:text-gray-300"
          }`}
          title={!ragFileReady ? "Сначала загрузите и проиндексируйте PDF-документ" : "Retrieval-Augmented Generation — поиск по базе знаний"}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          {ragEnabled ? "RAG ON" : "RAG"}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">{selectedModel.provider}</span>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>

        <div className="relative" ref={ragSettingsRef}>
          <button
            onClick={onToggleRagSettings}
            className={`p-1.5 rounded-lg transition-colors ${showRagSettings ? "bg-gray-700 text-teal-400" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
            title="База знаний (RAG)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>
          {showRagSettings && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-100">База знаний (RAG)</h2>
                <button onClick={onToggleRagSettings} className="text-gray-500 hover:text-gray-300">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Загрузите PDF-документ. Агенты будут использовать его как базу знаний при ответах.
              </p>
              <label className={`flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-dashed text-sm cursor-pointer transition-colors ${ragUploading ? "border-gray-700 text-gray-600" : "border-gray-600 text-gray-300 hover:border-teal-600 hover:text-teal-300"}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {ragUploading ? "Загрузка..." : "Выбрать PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={ragUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onRagUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {ragUploadStatus && (
                <p className={`mt-2 text-xs ${ragUploadStatus.startsWith("Ошибка") ? "text-red-400" : "text-teal-400"}`}>
                  {ragUploadStatus}
                </p>
              )}
              <p className="mt-3 text-xs text-gray-600">
                Индексация 500 стр. занимает ~1–2 мин. Включите RAG в шапке, чтобы использовать базу знаний.
              </p>
            </div>
          )}
        </div>

        <div className="relative" ref={settingsRef}>
          <button
            onClick={onToggleSettings}
            className={`p-1.5 rounded-lg transition-colors ${showSettings ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
            title="MCP Серверы"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {showSettings && (
            <McpSettings servers={mcpServers} onChange={onServersChange} onClose={onToggleSettings} />
          )}
        </div>
      </div>
    </header>
  );
}
