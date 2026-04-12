"use client";

import { useState } from "react";
import type { McpServer } from "@/types/chat";

export function McpSettings({
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
      name: newName.trim() || new URL(newUrl).hostname,
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Добавьте любые MCP серверы. ЛЛМ получит доступ к их инструментам.
      </p>

      {servers.length > 0 && (
        <div className="space-y-2 mb-3">
          {servers.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 p-2 rounded-lg border ${s.enabled ? "border-gray-600 bg-gray-800" : "border-gray-700 bg-gray-850 opacity-60"}`}
            >
              <button
                onClick={() => toggle(s.id)}
                className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 ${s.enabled ? "bg-emerald-600" : "bg-gray-600"}`}
              >
                <span
                  className={`block w-3 h-3 rounded-full bg-white mx-auto transition-transform ${s.enabled ? "translate-x-1" : "-translate-x-1"}`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-200 truncate">{s.name}</div>
                <div className="text-xs text-gray-500 truncate">{s.url}</div>
              </div>
              <button
                onClick={() => remove(s.id)}
                className="text-gray-600 hover:text-red-400 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

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
