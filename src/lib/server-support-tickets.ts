import fs from "fs";
import path from "path";
import type { SupportTicket } from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "support-tickets.json");

declare global {
  var __supportTickets: SupportTicket[] | undefined;
}

function load(): SupportTicket[] {
  if (globalThis.__supportTickets) return globalThis.__supportTickets;
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    const tickets = JSON.parse(raw) as SupportTicket[];
    globalThis.__supportTickets = tickets;
    return tickets;
  } catch {
    globalThis.__supportTickets = [];
    return [];
  }
}

function persist(tickets: SupportTicket[]): void {
  globalThis.__supportTickets = tickets;
  fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(tickets, null, 2));
}

export function getSupportTickets(): SupportTicket[] {
  return [...load()];
}

export function addSupportTicket(ticket: SupportTicket): void {
  const tickets = load();
  tickets.push(ticket);
  persist(tickets);
}

export function updateSupportTicket(
  id: string,
  updates: Partial<Pick<SupportTicket, "status">>,
): SupportTicket | null {
  const tickets = load();
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  Object.assign(tickets[idx], updates);
  persist(tickets);
  return tickets[idx];
}

export function deleteSupportTicket(id: string): boolean {
  const tickets = load();
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  tickets.splice(idx, 1);
  persist(tickets);
  return true;
}
