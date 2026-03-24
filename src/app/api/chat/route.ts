import OpenAI from "openai";
import { NextRequest } from "next/server";
import { createMcpClient, listMcpToolsAsOpenAI, callMcpTool, type McpClient } from "@/lib/mcp";

const GROQ_MODELS = ["llama-3.3-70b-versatile", "gemma2-9b-it", "mixtral-8x7b-32768"];

type OAIMessage = OpenAI.Chat.ChatCompletionMessageParam;

export async function POST(req: NextRequest) {
  const { messages, model, mcpServers } = await req.json() as {
    messages: OAIMessage[];
    model: string;
    mcpServers?: { url: string }[];
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (text: string) => controller.enqueue(encoder.encode(text));

      try {
        if (!GROQ_MODELS.includes(model)) {
          enqueue("Сейчас поддерживаются только модели Groq.");
          return;
        }

        const groq = new OpenAI({
          apiKey: process.env.GROQ_API_KEY!,
          baseURL: "https://api.groq.com/openai/v1",
        });

        const activeServers = mcpServers?.filter((s) => s.url.trim());

        // No MCP — simple streaming
        if (!activeServers?.length) {
          const response = await groq.chat.completions.create({ model, messages, stream: true });
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
            const client = await createMcpClient(server.url);
            const { tools, nameMap } = await listMcpToolsAsOpenAI(client);
            for (const tool of tools) {
              const safeName = tool.function.name;
              if (!toolRoutes.has(safeName)) {
                toolRoutes.set(safeName, { client, originalName: nameMap.get(safeName) ?? safeName });
                allTools.push(tool);
              }
            }
          } catch {
            enqueue(`[mcp_error:Не удалось подключиться к ${server.url}]`);
          }
        }

        if (!allTools.length) {
          enqueue("[mcp_error:Нет доступных инструментов]");
          const response = await groq.chat.completions.create({ model, messages, stream: true });
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) enqueue(text);
          }
          return;
        }

        // Agentic loop (max 5 iterations to prevent infinite loops)
        let currentMessages: OAIMessage[] = [...messages];
        let iterations = 0;

        while (iterations++ < 5) {
          const response = await groq.chat.completions.create({
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
        enqueue(`Error: ${message}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
