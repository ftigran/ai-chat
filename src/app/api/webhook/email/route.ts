import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { classifyMessage } from "@/lib/classify-message";
import { generateResponse } from "@/lib/generate-response";
import { getAgentById, DEFAULT_AGENT_ID } from "@/lib/agents";
import { addServerTicket } from "@/lib/server-tickets";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "support@example.com";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const from = formData.get("from") as string | null;
  const subject = formData.get("subject") as string | null;
  const text = (formData.get("text") ?? formData.get("html")) as string | null;

  if (!from || !text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const startTime = Date.now();
    const classification = await classifyMessage(text);
    const agent = getAgentById(classification.category) ?? getAgentById(DEFAULT_AGENT_ID)!;
    const response = await generateResponse(text, agent.systemPrompt, agent.modelId);

    await resend.emails.send({
      from: FROM_EMAIL,
      to: from,
      subject: `Re: ${subject ?? "Ваш запрос"}`,
      text: response,
    });

    addServerTicket({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      userMessage: text.slice(0, 500),
      classification,
      agentId: agent.id,
      agentName: agent.name,
      responsePreview: response.slice(0, 100),
      responseTime: Date.now() - startTime,
      conversationId: `email-${from}`,
      channel: "email",
    });
  } catch (err) {
    console.error("Email webhook error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
