import OpenAI from "openai";
import { MODELS } from "@/constants/models";
import { env } from "@/lib/env";

const globalForClients = globalThis as unknown as {
  _groqClient?: OpenAI;
  _googleClient?: OpenAI;
};

export function getGroqClient(): OpenAI {
  if (!globalForClients._groqClient) {
    globalForClients._groqClient = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return globalForClients._groqClient;
}

export function getGoogleClient(): OpenAI {
  if (!globalForClients._googleClient) {
    globalForClients._googleClient = new OpenAI({
      apiKey: env.GOOGLE_API_KEY!,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return globalForClients._googleClient;
}

export function getClientForModel(modelId: string): OpenAI {
  const cfg = MODELS.find((m) => m.id === modelId);
  if (cfg?.provider === "Google") {
    return getGoogleClient();
  }
  return getGroqClient();
}
