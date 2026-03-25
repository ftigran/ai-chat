import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { agentId, agentName, currentPrompt, liked, disliked } = await req.json() as {
    agentId: string;
    agentName: string;
    currentPrompt: string;
    liked: string[];
    disliked: string[];
  };

  if (!agentId || !currentPrompt) {
    return NextResponse.json({ error: "agentId and currentPrompt are required" }, { status: 400 });
  }

  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const likedSection = liked.length > 0
    ? `\nПримеры ответов, которые пользователи оценили ПОЛОЖИТЕЛЬНО (👍):\n${liked.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
    : "";

  const dislikedSection = disliked.length > 0
    ? `\nПримеры ответов, которые пользователи оценили НЕГАТИВНО (👎):\n${disliked.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
    : "";

  const userPrompt = `Ты — эксперт по написанию системных промптов для AI-агентов.

Агент: ${agentName}
Текущий системный промпт:
"""
${currentPrompt}
"""
${likedSection}
${dislikedSection}

Проанализируй паттерны в оценках пользователей и предложи улучшенный системный промпт для этого агента.
Улучши стиль, точность и полезность ответов на основе обратной связи.
Отвечай ТОЛЬКО текстом нового системного промпта — без пояснений, без кавычек, без заголовков.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const improvedPrompt = completion.choices[0]?.message?.content?.trim() ?? currentPrompt;
    return NextResponse.json({ improvedPrompt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
