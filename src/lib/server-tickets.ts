import type { Ticket } from "@/lib/types";

declare global {
  var __serverTickets: Ticket[] | undefined;
}

function getStore(): Ticket[] {
  if (!globalThis.__serverTickets) {
    globalThis.__serverTickets = [];
  }
  return globalThis.__serverTickets;
}

export function addServerTicket(ticket: Ticket): void {
  getStore().push(ticket);
}

export function getServerTickets(): Ticket[] {
  return [...getStore()];
}
