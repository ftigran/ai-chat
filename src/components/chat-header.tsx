"use client";

import { useRef, useCallback } from "react";
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
}: {
  model: string;
  onModelChange: (model: string) => void;
  activeServers: McpServer[];
  mcpServers: McpServer[];
  onServersChange: (servers: McpServer[]) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
}) {
  const settingsRef = useRef<HTMLDivElement>(null);
  const closeSettings = useCallback(() => {
    if (showSettings) onToggleSettings();
  }, [showSettings, onToggleSettings]);
  useClickOutside(settingsRef, closeSettings);

  const selectedModel = MODELS.find((m) => m.id === model)!;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">AI Chat</h1>
        {activeServers.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-800 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            {activeServers.length} MCP
          </span>
        )}
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
            <McpSettings
              servers={mcpServers}
              onChange={onServersChange}
              onClose={onToggleSettings}
            />
          )}
        </div>
      </div>
    </header>
  );
}
