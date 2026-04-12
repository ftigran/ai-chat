import fs from "fs/promises";
import path from "path";
import type { SupportTicket } from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "support-tickets.json");

declare global {
  var __supportTickets: SupportTicket[] | undefined;
}

async function load(): Promise<SupportTicket[]> {
  if (globalThis.__supportTickets) return globalThis.__supportTickets;
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    const tickets = JSON.parse(raw) as SupportTicket[];
    globalThis.__supportTickets = tickets;
    return tickets;
  } catch {
    globalThis.__supportTickets = [];
    return [];
  }
}

async function persist(tickets: SupportTicket[]): Promise<void> {
  globalThis.__supportTickets = tickets;
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(tickets, null, 2));
}

export async function getSupportTickets(): Promise<SupportTicket[]> {
  return [...(await load())];
}

export async function addSupportTicket(ticket: SupportTicket): Promise<void> {
  const tickets = await load();
  tickets.push(ticket);
  await persist(tickets);
}

export async function updateSupportTicket(
  id: string,
  updates: Partial<Pick<SupportTicket, "status">>,
): Promise<SupportTicket | null> {
  const tickets = await load();
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  Object.assign(tickets[idx], updates);
  await persist(tickets);
  return tickets[idx];
}

export async function deleteSupportTicket(id: string): Promise<boolean> {
  const tickets = await load();
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  tickets.splice(idx, 1);
  await persist(tickets);
  return true;
}
