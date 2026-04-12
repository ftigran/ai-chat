import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { processIncomingMessage } from "@/lib/webhook-handler";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}
const FROM_EMAIL = env.RESEND_FROM_EMAIL ?? "support@example.com";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const from = formData.get("from") as string | null;
  const subject = formData.get("subject") as string | null;
  const text = (formData.get("text") ?? formData.get("html")) as string | null;

  if (!from || !text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const { response } = await processIncomingMessage({
      text,
      channel: "email",
      conversationId: `email-${from}`,
    });

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: from,
      subject: `Re: ${subject ?? "Ваш запрос"}`,
      text: response,
    });
  } catch (err) {
    console.error("Email webhook error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
