import OpenAI from "openai";
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

export async function classifyMessage(message: string): Promise<Classification> {
  if (!message?.trim()) {
    return { category: DEFAULT_AGENT_ID, confidence: 0, reasoning: "Empty message" };
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
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { category: DEFAULT_AGENT_ID, confidence: 0, reasoning: "Failed to parse classification" };
  }

  const parsed = JSON.parse(jsonMatch[0]) as Classification;
  const validAgent = AGENTS.find((a) => a.id === parsed.category);
  if (!validAgent) {
    return { category: DEFAULT_AGENT_ID, confidence: parsed.confidence ?? 0, reasoning: parsed.reasoning ?? "Unknown category" };
  }

  return parsed;
}
