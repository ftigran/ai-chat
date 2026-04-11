import type { Ticket, DashboardMetrics } from "./types";

const STORAGE_KEY = "tickets";

export function loadTickets(): Ticket[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    const tickets = JSON.parse(saved) as Ticket[];
    return tickets.map((t) => ({ ...t, channel: (t.channel ?? "web") as Ticket["channel"] }));
  } catch {
    return [];
  }
}

export function saveTicket(ticket: Ticket): void {
  const tickets = loadTickets();
  tickets.push(ticket);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

export function clearTickets(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function computeMetrics(tickets: Ticket[]): DashboardMetrics {
  const byCategory: Record<string, number> = {};
  let totalResponseTime = 0;

  for (const t of tickets) {
    byCategory[t.agentId] = (byCategory[t.agentId] || 0) + 1;
    totalResponseTime += t.responseTime;
  }

  return {
    totalTickets: tickets.length,
    byCategory,
    avgResponseTime: tickets.length > 0 ? Math.round(totalResponseTime / tickets.length) : 0,
  };
}
