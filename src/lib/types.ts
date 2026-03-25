export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  modelId: string;
  mcpEnabled: boolean;
  color: string;
}

export interface Classification {
  category: string;
  confidence: number;
  reasoning: string;
}

export interface Ticket {
  id: string;
  timestamp: number;
  userMessage: string;
  classification: Classification;
  agentId: string;
  agentName: string;
  responsePreview: string;
  responseTime: number;
  conversationId: string;
  channel: "web" | "telegram" | "email";
}

export interface DashboardMetrics {
  totalTickets: number;
  byCategory: Record<string, number>;
  avgResponseTime: number;
}

export interface MessageFeedback {
  id: string;
  conversationId: string;
  messageIndex: number;
  feedback: "like" | "dislike";
  messageText: string;
  agentId: string | null;
  timestamp: number;
}
