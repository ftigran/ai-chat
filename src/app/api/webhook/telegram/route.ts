import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processIncomingMessage } from "@/lib/webhook-handler";

const TOKEN = env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = env.TELEGRAM_WEBHOOK_SECRET;

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(req: NextRequest) {
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
      "Добро пожаловать! 👋 Я ваш AI-ассистент поддержки. Напишите ваш вопрос, и я помогу вам.",
    );
    return NextResponse.json({ ok: true });
  }

  try {
    const { response } = await processIncomingMessage({
      text,
      channel: "telegram",
      conversationId: `tg-${chatId}`,
    });
    await sendTelegramMessage(chatId, response);
  } catch (err) {
    console.error("Telegram webhook error:", err);
    await sendTelegramMessage(chatId, "Произошла ошибка при обработке запроса.");
  }

  return NextResponse.json({ ok: true });
}
