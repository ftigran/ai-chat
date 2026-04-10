"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AGENTS, getAgentById } from "@/lib/agents";
import { loadTickets, clearTickets, computeMetrics } from "@/lib/ticket-store";
import type { Ticket, DashboardMetrics } from "@/lib/types";

const COLOR_MAP: Record<string, { text: string; bg: string; border: string; bar: string }> = {
  emerald: { text: "text-emerald-400", bg: "bg-emerald-900/40", border: "border-emerald-700/50", bar: "bg-emerald-500" },
  blue: { text: "text-blue-400", bg: "bg-blue-900/40", border: "border-blue-700/50", bar: "bg-blue-500" },
  amber: { text: "text-amber-400", bg: "bg-amber-900/40", border: "border-amber-700/50", bar: "bg-amber-500" },
  red: { text: "text-red-400", bg: "bg-red-900/40", border: "border-red-700/50", bar: "bg-red-500" },
};

const CHANNEL_STYLE: Record<string, { label: string; className: string }> = {
  web: { label: "Web", className: "bg-gray-700/50 text-gray-400 border border-gray-600/50" },
  telegram: { label: "TG", className: "bg-sky-900/40 text-sky-400 border border-sky-700/50" },
  email: { label: "Email", className: "bg-violet-900/40 text-violet-400 border border-violet-700/50" },
};

function getColors(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP.blue;
}

function mergeTickets(local: Ticket[], server: Ticket[]): Ticket[] {
  const seen = new Set(local.map((t) => t.id));
  const merged = [...local];
  for (const t of server) {
    if (!seen.has(t.id)) merged.push(t);
  }
  return merged.sort((a, b) => a.timestamp - b.timestamp);
}

export default function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({ totalTickets: 0, byCategory: {}, avgResponseTime: 0 });

  useEffect(() => {
    async function load() {
      const local = loadTickets();
      let server: Ticket[] = [];
      try {
        const res = await fetch("/api/tickets");
        const data = await res.json();
        server = data.tickets ?? [];
      } catch {
        // server tickets unavailable
      }
      const merged = mergeTickets(local, server);
      setTickets(merged);
      setMetrics(computeMetrics(merged));
    }
    load();
  }, []);

  function handleClear() {
    clearTickets();
    setTickets([]);
    setMetrics({ totalTickets: 0, byCategory: {}, avgResponseTime: 0 });
  }

  // Find the most common category
  const topCategory = Object.entries(metrics.byCategory).sort((a, b) => b[1] - a[1])[0];
  const topAgent = topCategory ? getAgentById(topCategory[0]) : undefined;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors" title="Back to chat">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
        <button
          onClick={handleClear}
          disabled={tickets.length === 0}
          className="text-xs text-gray-400 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-3 py-1.5 border border-gray-700 hover:border-red-700 rounded-lg"
        >
          Очистить историю
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Всего тикетов</div>
              <div className="text-2xl font-bold">{metrics.totalTickets}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Среднее время ответа</div>
              <div className="text-2xl font-bold">
                {metrics.avgResponseTime > 0 ? `${(metrics.avgResponseTime / 1000).toFixed(1)}s` : "—"}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Самая частая категория</div>
              <div className="text-2xl font-bold">
                {topAgent ? (
                  <span className={getColors(topAgent.color).text}>{topAgent.name}</span>
                ) : "—"}
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">Разбивка по категориям</h2>
            {metrics.totalTickets === 0 ? (
              <p className="text-xs text-gray-500">Нет данных. Включите маршрутизацию в чате и отправьте сообщения.</p>
            ) : (
              <div className="space-y-2">
                {AGENTS.map((agent) => {
                  const count = metrics.byCategory[agent.id] ?? 0;
                  const pct = metrics.totalTickets > 0 ? (count / metrics.totalTickets) * 100 : 0;
                  const colors = getColors(agent.color);
                  return (
                    <div key={agent.id} className="flex items-center gap-3">
                      <span className={`text-xs w-28 truncate ${colors.text}`}>{agent.name}</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${colors.bar} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ticket Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold">История тикетов</h2>
            </div>
            {tickets.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-500">
                Тикеты появятся после отправки сообщений с включённой маршрутизацией.
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {[...tickets].reverse().map((ticket) => {
                  const agent = getAgentById(ticket.agentId);
                  const colors = agent ? getColors(agent.color) : getColors("blue");
                  const channel = CHANNEL_STYLE[ticket.channel ?? "web"];
                  return (
                    <div key={ticket.id} className="px-4 py-3 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                      <div className="text-xs text-gray-500 w-16 flex-shrink-0">
                        {new Date(ticket.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{ticket.userMessage}</div>
                      </div>
                      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${channel.className}`}>
                        {channel.label}
                      </span>
                      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${colors.text} ${colors.bg} ${colors.border}`}>
                        {ticket.agentName}
                      </span>
                      <div className="text-xs text-gray-500 w-12 text-right flex-shrink-0">
                        {(ticket.responseTime / 1000).toFixed(1)}s
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
