import type { AgentConfig } from "./types";

export const AGENTS: AgentConfig[] = [
  {
    id: "tech-support",
    name: "Техподдержка",
    description: "Technical issues, bugs, errors, setup help, troubleshooting",
    systemPrompt:
      "Ты — специалист технической поддержки. Помогай пользователям решать технические проблемы: ошибки, настройка, установка, баги. Давай чёткие пошаговые инструкции. Отвечай на русском языке.",
    modelId: "llama-3.3-70b-versatile",
    mcpEnabled: false,
    color: "emerald",
  },
  {
    id: "sales",
    name: "Продажи",
    description: "Pricing, plans, purchasing, billing, subscription questions",
    systemPrompt:
      "Ты — консультант по продажам. Помогай пользователям с вопросами о ценах, тарифах, покупках и подписках. Будь дружелюбным и убедительным. Отвечай на русском языке.",
    modelId: "llama-3.3-70b-versatile",
    mcpEnabled: false,
    color: "blue",
  },
  {
    id: "faq",
    name: "FAQ",
    description: "General questions, how-to, feature explanations, information requests",
    systemPrompt:
      "Ты — помощник по общим вопросам. Давай понятные и лаконичные ответы на вопросы пользователей. Отвечай на русском языке.",
    modelId: "llama-3.1-8b-instant",
    mcpEnabled: false,
    color: "amber",
  },
  {
    id: "escalation",
    name: "Эскалация",
    description: "Complaints, urgent issues, dissatisfaction, requests for human agent",
    systemPrompt:
      "Ты обрабатываешь эскалированный запрос. Будь эмпатичным и внимательным. Признай проблему пользователя, извинись за неудобства и предложи конкретные шаги для решения. Отвечай на русском языке.",
    modelId: "llama-3.3-70b-versatile",
    mcpEnabled: false,
    color: "red",
  },
];

export const DEFAULT_AGENT_ID = "faq";

export function getAgentById(id: string): AgentConfig | undefined {
  return AGENTS.find((a) => a.id === id);
}
