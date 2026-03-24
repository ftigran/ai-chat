import { NextRequest, NextResponse } from "next/server";
import { createMcpClient } from "@/lib/mcp";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  let client: Client | null = null;
  try {
    client = await createMcpClient(url);
    const { tools } = await client.listTools();
    return NextResponse.json({
      count: tools.length,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
