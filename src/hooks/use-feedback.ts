"use client";

import { useState } from "react";
import { getAgentById } from "@/lib/agents";
import {
  saveFeedback,
  getFeedbacksByAgent,
  saveAgentPrompt,
  loadAgentPrompts,
} from "@/lib/feedback-store";
import { textOf } from "@/lib/parse-message";
import type { Message } from "@/types/chat";

export function useFeedback(conversationId: string) {
  const [feedbacks, setFeedbacks] = useState<Record<number, "like" | "dislike">>({});
  const [agentPromptOverrides, setAgentPromptOverrides] =
    useState<Record<string, string>>(loadAgentPrompts);
  const [improvementSuggestion, setImprovementSuggestion] = useState<{
    agentId: string;
    agentName: string;
    prompt: string;
  } | null>(null);
  const [editedSuggestion, setEditedSuggestion] = useState("");
  const [improving, setImproving] = useState(false);

  async function triggerImprovement(agentId: string) {
    const agent = getAgentById(agentId);
    if (!agent || improving) return;
    const currentPrompt = agentPromptOverrides[agentId] ?? agent.systemPrompt;
    const allFeedbacks = getFeedbacksByAgent(agentId);
    const liked = allFeedbacks
      .filter((f) => f.feedback === "like")
      .map((f) => f.messageText)
      .slice(-5);
    const disliked = allFeedbacks
      .filter((f) => f.feedback === "dislike")
      .map((f) => f.messageText)
      .slice(-5);
    setImproving(true);
    try {
      const res = await fetch("/api/improve-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, agentName: agent.name, currentPrompt, liked, disliked }),
      });
      const data = await res.json();
      if (data.improvedPrompt) {
        setImprovementSuggestion({ agentId, agentName: agent.name, prompt: data.improvedPrompt });
        setEditedSuggestion(data.improvedPrompt);
      }
    } catch {
      /* ignore */
    } finally {
      setImproving(false);
    }
  }

  function handleFeedback(
    messageIndex: number,
    feedback: "like" | "dislike",
    messages: Message[],
    messageAgents: Record<number, string>,
    routingEnabled: boolean,
  ) {
    const current = feedbacks[messageIndex];
    const newFeedback = current === feedback ? undefined : feedback;
    setFeedbacks((prev) => {
      const updated = { ...prev };
      if (newFeedback === undefined) delete updated[messageIndex];
      else updated[messageIndex] = newFeedback;
      return updated;
    });
    if (newFeedback === undefined) return;
    const agentId = messageAgents[messageIndex] ?? null;
    saveFeedback({
      id: crypto.randomUUID(),
      conversationId,
      messageIndex,
      feedback: newFeedback,
      messageText: textOf(messages[messageIndex]).slice(0, 500),
      agentId,
      timestamp: Date.now(),
    });
    if (newFeedback === "dislike" && agentId && routingEnabled) {
      const agentDislikes = getFeedbacksByAgent(agentId).filter((f) => f.feedback === "dislike");
      if (agentDislikes.length >= 3 && !improvementSuggestion) triggerImprovement(agentId);
    }
  }

  function applyImprovement() {
    if (!improvementSuggestion) return;
    saveAgentPrompt(improvementSuggestion.agentId, editedSuggestion);
    setAgentPromptOverrides((prev) => ({
      ...prev,
      [improvementSuggestion.agentId]: editedSuggestion,
    }));
    setImprovementSuggestion(null);
  }

  return {
    feedbacks,
    agentPromptOverrides,
    improvementSuggestion,
    setImprovementSuggestion,
    editedSuggestion,
    setEditedSuggestion,
    improving,
    handleFeedback,
    applyImprovement,
  };
}
