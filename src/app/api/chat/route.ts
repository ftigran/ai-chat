import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { NextRequest } from "next/server";

const GOOGLE_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash-preview-05-20"];
const XAI_MODELS = ["grok-3-mini"];
const GROQ_MODELS = ["llama-3.3-70b-versatile", "gemma2-9b-it", "mixtral-8x7b-32768"];

export async function POST(req: NextRequest) {
  const { messages, model } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (GOOGLE_MODELS.includes(model)) {
          const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

          const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

          const lastMessage = messages[messages.length - 1].content;

          const chat = ai.chats.create({
            model,
            history,
          });

          const response = await chat.sendMessageStream({ message: lastMessage });

          for await (const chunk of response) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } else if (XAI_MODELS.includes(model)) {
          const client = new OpenAI({
            apiKey: process.env.XAI_API_KEY!,
            baseURL: "https://api.x.ai/v1",
          });

          const response = await client.chat.completions.create({
            model,
            messages,
            stream: true,
          });

          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } else if (GROQ_MODELS.includes(model)) {
          const client = new OpenAI({
            apiKey: process.env.GROQ_API_KEY!,
            baseURL: "https://api.groq.com/openai/v1",
          });

          const response = await client.chat.completions.create({
            model,
            messages,
            stream: true,
          });

          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } else {
          controller.enqueue(encoder.encode("Unknown model"));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error";
        controller.enqueue(encoder.encode(`Error: ${message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
