import OpenAI from "openai";
import { NextRequest } from "next/server";
import { createMcpClient, listMcpToolsAsOpenAI, callMcpTool, type McpClient } from "@/lib/mcp";
import { MODELS } from "@/constants/models";

const VALID_IDS = new Set(MODELS.map((m) => m.id));

function getClient(model: string): OpenAI | null {
  const cfg = MODELS.find((m) => m.id === model);
  if (!cfg) return null;

  if (cfg.provider === "Google") {
    return new OpenAI({
      apiKey: process.env.GOOGLE_API_KEY!,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }

  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

type OAIMessage = OpenAI.Chat.ChatCompletionMessageParam;

export async function POST(req: NextRequest) {
  const { messages, model, mcpServers, systemPrompt, ragEnabled } = await req.json() as {
    messages: OAIMessage[];
    model: string;
    mcpServers?: { url: string }[];
    systemPrompt?: string;
    ragEnabled?: boolean;
  };

  // Prepend system prompt with optional RAG context
  let finalSystemPrompt = systemPrompt;
  let ragError: string | null = null;
  if (ragEnabled) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const queryText = typeof lastUser?.content === "string" ? lastUser.content : "";
    if (queryText) {
      const { queryRAG, getLastIndexError } = await import("@/lib/rag-service");
      const ctx = await queryRAG(queryText);
      ragError = getLastIndexError();
      if (ctx) {
        finalSystemPrompt = ctx + (finalSystemPrompt ? `\n\n---\n\n${finalSystemPrompt}` : "");
      }
    }
  }
  if (finalSystemPrompt) {
    messages.unshift({ role: "system", content: finalSystemPrompt });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (text: string) => controller.enqueue(encoder.encode(text));

      try {
        if (ragError) {
          enqueue(`[mcp_error:RAG: ${ragError}]`);
        }

        if (!VALID_IDS.has(model)) {
          enqueue("Неизвестная модель.");
          return;
        }

        const client = getClient(model)!;
        const activeServers = mcpServers?.filter((s) => s.url.trim());

        // No MCP — simple streaming
        if (!activeServers?.length) {
          const response = await client.chat.completions.create({ model, messages, stream: true });
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) enqueue(text);
          }
          return;
        }

        // Connect to all MCP servers and aggregate tools
        const toolRoutes = new Map<string, { client: McpClient; originalName: string }>();
        const allTools: OpenAI.Chat.ChatCompletionTool[] = [];

        for (const server of activeServers) {
          try {
            const mcpClient = await createMcpClient(server.url);
            const { tools, nameMap } = await listMcpToolsAsOpenAI(mcpClient);
            for (const tool of tools) {
              const safeName = tool.function.name;
              if (!toolRoutes.has(safeName)) {
                toolRoutes.set(safeName, { client: mcpClient, originalName: nameMap.get(safeName) ?? safeName });
                allTools.push(tool);
              }
            }
          } catch {
            enqueue(`[mcp_error:Не удалось подключиться к ${server.url}]`);
          }
        }

        if (!allTools.length) {
          enqueue("[mcp_error:Нет доступных инструментов]");
          const response = await client.chat.completions.create({ model, messages, stream: true });
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) enqueue(text);
          }
          return;
        }

        // Agentic loop (max 5 iterations to prevent infinite loops)
        const currentMessages: OAIMessage[] = [...messages];
        let iterations = 0;

        while (iterations++ < 5) {
          const response = await client.chat.completions.create({
            model,
            messages: currentMessages,
            tools: allTools,
            tool_choice: "auto",
            stream: false,
          });

          const choice = response.choices[0];
          const msg = choice.message;

          if (choice.finish_reason !== "tool_calls" || !msg.tool_calls?.length) {
            const finalText = msg.content ?? "";
            const chunkSize = 8;
            for (let i = 0; i < finalText.length; i += chunkSize) {
              enqueue(finalText.slice(i, i + chunkSize));
              await new Promise((r) => setTimeout(r, 8));
            }
            break;
          }

          // Reconstruct assistant message explicitly to avoid type mismatches
          type RawToolCall = { id: string; type: string; function: { name: string; arguments: string } };
          const toolCalls = (msg.tool_calls as RawToolCall[]).map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.function.name, arguments: tc.function.arguments },
          }));

          currentMessages.push({
            role: "assistant",
            content: msg.content ?? null,
            tool_calls: toolCalls,
          });

          for (const toolCall of toolCalls) {
            const safeName = toolCall.function.name;
            enqueue(`[tool:${safeName}]`);

            const route = toolRoutes.get(safeName);
            if (!route) {
              currentMessages.push({ role: "tool", tool_call_id: toolCall.id, content: "Tool not found" });
              continue;
            }

            const args = JSON.parse(toolCall.function.arguments || "{}");
            const result = await callMcpTool(route.client, route.originalName, args);
            currentMessages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error";
        if (message.includes("429")) {
          enqueue("Превышен лимит запросов. Подождите немного и попробуйте снова.");
        } else if (message.includes("401") || message.includes("403")) {
          enqueue("Ошибка авторизации. Проверьте API-ключ.");
        } else if (message.includes("404")) {
          enqueue("Модель не найдена. Возможно, она больше недоступна.");
        } else {
          enqueue(`Ошибка: ${message}`);
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
