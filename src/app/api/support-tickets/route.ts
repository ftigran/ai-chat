import { NextResponse } from "next/server";
import { getSupportTickets, addSupportTicket } from "@/lib/server-support-tickets";
import type { SupportTicket } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ tickets: getSupportTickets() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, description, category, priority } = body as {
    title?: string;
    description?: string;
    category?: SupportTicket["category"];
    priority?: SupportTicket["priority"];
  };

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 });
  }

  const ticket: SupportTicket = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    title: title.trim(),
    description: description.trim(),
    category: category ?? "bug",
    priority: priority ?? "medium",
    status: "open",
  };

  addSupportTicket(ticket);
  return NextResponse.json({ ticket }, { status: 201 });
}
