import { NextRequest, NextResponse } from "next/server";
import { classifyMessage } from "@/lib/classify-message";
import { generateResponse } from "@/lib/generate-response";
import { getAgentById, DEFAULT_AGENT_ID } from "@/lib/agents";
import { addServerTicket } from "@/lib/server-tickets";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(req: NextRequest) {
  // Verify secret token
  if (WEBHOOK_SECRET) {
    const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (incomingSecret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json();
  const message = body?.message;
  const text: string | undefined = message?.text;
  const chatId: number | undefined = message?.chat?.id;

  if (!text || !chatId) {
    return NextResponse.json({ ok: true });
  }

  if (text === "/start") {
    await sendTelegramMessage(
      chatId,
      "Добро пожаловать! 👋 Я ваш AI-ассистент поддержки. Напишите ваш вопрос, и я помогу вам."
    );
    return NextResponse.json({ ok: true });
  }

  try {
    const startTime = Date.now();
    const classification = await classifyMessage(text);
    const agent = getAgentById(classification.category) ?? getAgentById(DEFAULT_AGENT_ID)!;
    const response = await generateResponse(text, agent.systemPrompt, agent.modelId);

    await sendTelegramMessage(chatId, response);

    addServerTicket({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      userMessage: text,
      classification,
      agentId: agent.id,
      agentName: agent.name,
      responsePreview: response.slice(0, 100),
      responseTime: Date.now() - startTime,
      conversationId: `tg-${chatId}`,
      channel: "telegram",
    });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    await sendTelegramMessage(chatId, "Произошла ошибка при обработке запроса.");
  }

  return NextResponse.json({ ok: true });
}
