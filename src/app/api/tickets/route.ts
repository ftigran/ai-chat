import { NextResponse } from "next/server";
import { getServerTickets } from "@/lib/server-tickets";

export async function GET() {
  return NextResponse.json({ tickets: getServerTickets() });
}
