import { classifyMessage } from "@/lib/classify-message";
import { generateResponse } from "@/lib/generate-response";
import { getAgentById, DEFAULT_AGENT_ID } from "@/lib/agents";
import { addServerTicket } from "@/lib/server-tickets";
import type { Ticket } from "@/lib/types";

export async function processIncomingMessage(params: {
  text: string;
  channel: "telegram" | "email";
  conversationId: string;
}): Promise<{ response: string; ticket: Ticket }> {
  const startTime = Date.now();
  const classification = await classifyMessage(params.text);
  const agent = getAgentById(classification.category) ?? getAgentById(DEFAULT_AGENT_ID)!;
  const response = await generateResponse(params.text, agent.systemPrompt, agent.modelId);

  const ticket: Ticket = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    userMessage: params.text.slice(0, 500),
    classification,
    agentId: agent.id,
    agentName: agent.name,
    responsePreview: response.slice(0, 100),
    responseTime: Date.now() - startTime,
    conversationId: params.conversationId,
    channel: params.channel,
  };

  addServerTicket(ticket);
  return { response, ticket };
}
