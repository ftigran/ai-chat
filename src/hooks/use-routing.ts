"use client";

import { useState, useCallback } from "react";
import { getAgentById } from "@/lib/agents";
import { saveTicket } from "@/lib/ticket-store";
import type { Classification, Ticket } from "@/lib/types";

export function useRouting(conversationId: string) {
  const [routingEnabled, setRoutingEnabled] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classifications, setClassifications] = useState<Record<number, Classification>>({});
  const [messageAgents, setMessageAgents] = useState<Record<number, string>>({});

  const classify = useCallback(
    async (text: string, messagesLength: number, agentPromptOverrides: Record<string, string>) => {
      if (!routingEnabled || !text) return undefined;

      setClassifying(true);
      try {
        const res = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        const classification = (await res.json()) as Classification;
        setClassifications((prev) => ({ ...prev, [messagesLength]: classification }));
        const agent = getAgentById(classification.category);
        if (agent) {
          return {
            classification,
            systemPrompt: agentPromptOverrides[agent.id] ?? agent.systemPrompt,
            modelId: agent.modelId,
          };
        }
        return { classification, systemPrompt: undefined, modelId: undefined };
      } catch {
        return undefined;
      } finally {
        setClassifying(false);
      }
    },
    [routingEnabled],
  );

  const recordAssistantAgent = useCallback(
    (
      assistantMsgIndex: number,
      classification: Classification,
      text: string,
      startTime: number,
    ) => {
      setMessageAgents((prev) => ({ ...prev, [assistantMsgIndex]: classification.category }));
      const agent = getAgentById(classification.category);
      const ticket: Ticket = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        userMessage: text,
        classification,
        agentId: classification.category,
        agentName: agent?.name ?? "FAQ",
        responsePreview: "",
        responseTime: Date.now() - startTime,
        conversationId,
        channel: "web",
      };
      saveTicket(ticket);
    },
    [conversationId],
  );

  return {
    routingEnabled,
    setRoutingEnabled,
    classifying,
    classifications,
    messageAgents,
    classify,
    recordAssistantAgent,
  };
}
