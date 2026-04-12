import { getGroqClient } from "@/lib/llm-clients";

export async function generateResponse(
  message: string,
  systemPrompt: string,
  modelId: string,
): Promise<string> {
  const response = await getGroqClient().chat.completions.create({
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}
