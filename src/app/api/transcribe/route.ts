import { NextRequest } from "next/server";
import { getGroqClient } from "@/lib/llm-clients";
import { STT_MODEL } from "@/constants/config";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const transcription = await getGroqClient().audio.transcriptions.create({
    file,
    model: STT_MODEL,
  });

  return Response.json({ text: transcription.text });
}
