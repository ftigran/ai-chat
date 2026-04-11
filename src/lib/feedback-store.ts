import type { MessageFeedback } from "./types";

const FEEDBACK_KEY = "message_feedback";
const AGENT_PROMPTS_KEY = "agent_prompts";

export function saveFeedback(fb: MessageFeedback): void {
  if (typeof window === "undefined") return;
  const all = loadFeedbacks();
  // Replace existing feedback for same conversation+messageIndex
  const idx = all.findIndex(
    (f) => f.conversationId === fb.conversationId && f.messageIndex === fb.messageIndex
  );
  if (idx >= 0) {
    all[idx] = fb;
  } else {
    all.push(fb);
  }
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all));
}

export function loadFeedbacks(): MessageFeedback[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(FEEDBACK_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved) as MessageFeedback[];
  } catch {
    return [];
  }
}

export function getFeedbacksByAgent(agentId: string): MessageFeedback[] {
  return loadFeedbacks().filter((f) => f.agentId === agentId);
}

export function saveAgentPrompt(agentId: string, prompt: string): void {
  if (typeof window === "undefined") return;
  const prompts = loadAgentPrompts();
  prompts[agentId] = prompt;
  localStorage.setItem(AGENT_PROMPTS_KEY, JSON.stringify(prompts));
}

export function loadAgentPrompts(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const saved = localStorage.getItem(AGENT_PROMPTS_KEY);
  if (!saved) return {};
  try {
    return JSON.parse(saved) as Record<string, string>;
  } catch {
    return {};
  }
}

export function clearAgentPrompt(agentId: string): void {
  if (typeof window === "undefined") return;
  const prompts = loadAgentPrompts();
  delete prompts[agentId];
  localStorage.setItem(AGENT_PROMPTS_KEY, JSON.stringify(prompts));
}
