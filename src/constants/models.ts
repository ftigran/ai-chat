export type Model = {
  id: string;
  label: string;
  provider: string;
  mcpDisabled: boolean;
};

export const MODELS: Model[] = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "Groq", mcpDisabled: true },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B", provider: "Groq", mcpDisabled: true },
  { id: "qwen/qwen3-32b", label: "Qwen 3 32B", provider: "Groq", mcpDisabled: false },
];
