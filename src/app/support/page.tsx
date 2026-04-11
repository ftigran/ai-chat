"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { SupportTicket } from "@/lib/types";

const CATEGORY_OPTIONS: { value: SupportTicket["category"]; label: string }[] = [
  { value: "bug", label: "Баг" },
  { value: "feature", label: "Новая функция" },
  { value: "question", label: "Вопрос" },
  { value: "other", label: "Другое" },
];

const PRIORITY_OPTIONS: { value: SupportTicket["priority"]; label: string }[] = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
];

const CATEGORY_STYLE: Record<string, string> = {
  bug: "bg-red-900/40 text-red-400 border-red-700/50",
  feature: "bg-violet-900/40 text-violet-400 border-violet-700/50",
  question: "bg-blue-900/40 text-blue-400 border-blue-700/50",
  other: "bg-gray-700/50 text-gray-400 border-gray-600/50",
};

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-gray-700/50 text-gray-400 border-gray-600/50",
  medium: "bg-amber-900/40 text-amber-400 border-amber-700/50",
  high: "bg-red-900/40 text-red-400 border-red-700/50",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<SupportTicket["category"]>("bug");
  const [priority, setPriority] = useState<SupportTicket["priority"]>("medium");

  useEffect(() => {
    fetch("/api/support-tickets")
      .then((r) => r.json())
      .then((data) => setTickets(data.tickets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, priority }),
      });
      const data = await res.json();
      if (data.ticket) {
        setTickets((prev) => [...prev, data.ticket]);
        setTitle("");
        setDescription("");
        setCategory("bug");
        setPriority("medium");
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(ticket: SupportTicket) {
    const newStatus = ticket.status === "open" ? "closed" : "open";
    try {
      const res = await fetch(`/api/support-tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.ticket) {
        setTickets((prev) => prev.map((t) => (t.id === ticket.id ? data.ticket : t)));
      }
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/support-tickets/${id}`, { method: "DELETE" });
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors" title="Назад в чат">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold">Поддержка</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Create ticket form */}
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold">Создать тикет</h2>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Заголовок</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Кратко опишите проблему"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Подробно опишите, что произошло и как воспроизвести"
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Категория</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicket["category"])}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Приоритет</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as SupportTicket["priority"])}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !title.trim() || !description.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? "Отправка..." : "Создать тикет"}
            </button>
          </form>

          {/* Ticket list */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold">Тикеты</h2>
            </div>
            {loading ? (
              <div className="px-4 py-8 text-center text-xs text-gray-500">Загрузка...</div>
            ) : tickets.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-500">
                Тикетов пока нет. Создайте первый выше.
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {[...tickets].reverse().map((ticket) => (
                  <div key={ticket.id} className="px-4 py-4 hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${ticket.status === "closed" ? "line-through text-gray-500" : ""}`}>
                            {ticket.title}
                          </span>
                          <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full border ${CATEGORY_STYLE[ticket.category]}`}>
                            {CATEGORY_OPTIONS.find((o) => o.value === ticket.category)?.label}
                          </span>
                          <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLE[ticket.priority]}`}>
                            {PRIORITY_OPTIONS.find((o) => o.value === ticket.priority)?.label}
                          </span>
                          <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full border ${
                            ticket.status === "open"
                              ? "bg-emerald-900/40 text-emerald-400 border-emerald-700/50"
                              : "bg-gray-700/50 text-gray-500 border-gray-600/50"
                          }`}>
                            {ticket.status === "open" ? "Открыт" : "Закрыт"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1 whitespace-pre-wrap">{ticket.description}</p>
                        <span className="text-[10px] text-gray-600">
                          {new Date(ticket.timestamp).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggleStatus(ticket)}
                          className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-700 transition-colors"
                          title={ticket.status === "open" ? "Закрыть" : "Открыть"}
                        >
                          {ticket.status === "open" ? "Закрыть" : "Открыть"}
                        </button>
                        <button
                          onClick={() => handleDelete(ticket.id)}
                          className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-gray-700 transition-colors"
                          title="Удалить"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
