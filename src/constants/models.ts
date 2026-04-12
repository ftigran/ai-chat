export type Model = {
  id: string;
  label: string;
  provider: string;
  mcpDisabled: boolean;
};

export const MODELS: Model[] = [
  // Groq
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "Groq", mcpDisabled: true },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B", provider: "Groq", mcpDisabled: true },
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", provider: "Groq", mcpDisabled: false },
  { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B", provider: "Groq", mcpDisabled: false },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    label: "Llama 4 Scout 17B",
    provider: "Groq",
    mcpDisabled: false,
  },
  { id: "qwen/qwen3-32b", label: "Qwen 3 32B", provider: "Groq", mcpDisabled: false },
  // Google (free tier)
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google", mcpDisabled: false },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    provider: "Google",
    mcpDisabled: false,
  },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "Google", mcpDisabled: false },
  {
    id: "gemini-2.0-flash-lite",
    label: "Gemini 2.0 Flash Lite",
    provider: "Google",
    mcpDisabled: false,
  },
];
