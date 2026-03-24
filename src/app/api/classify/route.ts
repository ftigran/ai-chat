import { NextRequest, NextResponse } from "next/server";
import { classifyMessage } from "@/lib/classify-message";

export async function POST(req: NextRequest) {
  try {
    const { message } = (await req.json()) as { message: string };
    const result = await classifyMessage(message);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Classification error:", err);
    const { DEFAULT_AGENT_ID } = await import("@/lib/agents");
    return NextResponse.json({ category: DEFAULT_AGENT_ID, confidence: 0, reasoning: "Classification failed" });
  }
}
