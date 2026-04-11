import OpenAI from "openai";

export async function generateResponse(
  message: string,
  systemPrompt: string,
  modelId: string,
): Promise<string> {
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const response = await groq.chat.completions.create({
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}
