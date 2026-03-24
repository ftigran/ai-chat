import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { AGENTS, DEFAULT_AGENT_ID } from "@/lib/agents";
import type { Classification } from "@/lib/types";

const CLASSIFIER_MODEL = "llama-3.1-8b-instant";

function buildClassifierPrompt(): string {
  const categories = AGENTS.map((a) => `- ${a.id}: ${a.description}`).join("\n");
  return `You are a message classifier. Classify the user message into exactly one category.

Categories:
${categories}

Respond with JSON only, no other text: {"category": "...", "confidence": 0.0-1.0, "reasoning": "..."}`;
}

export async function POST(req: NextRequest) {
  try {
    const { message } = (await req.json()) as { message: string };

    if (!message?.trim()) {
      return NextResponse.json(
        { category: DEFAULT_AGENT_ID, confidence: 0, reasoning: "Empty message" } satisfies Classification,
      );
    }

    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY!,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const response = await groq.chat.completions.create({
      model: CLASSIFIER_MODEL,
      messages: [
        { role: "system", content: buildClassifierPrompt() },
        { role: "user", content: message },
      ],
      temperature: 0,
      max_tokens: 150,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { category: DEFAULT_AGENT_ID, confidence: 0, reasoning: "Failed to parse classification" } satisfies Classification,
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as Classification;

    // Validate category exists
    const validAgent = AGENTS.find((a) => a.id === parsed.category);
    if (!validAgent) {
      return NextResponse.json(
        { category: DEFAULT_AGENT_ID, confidence: parsed.confidence ?? 0, reasoning: parsed.reasoning ?? "Unknown category" } satisfies Classification,
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Classification error:", err);
    return NextResponse.json(
      { category: DEFAULT_AGENT_ID, confidence: 0, reasoning: "Classification failed" } satisfies Classification,
    );
  }
}
