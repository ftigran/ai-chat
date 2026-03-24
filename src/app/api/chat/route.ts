import OpenAI from "openai";
import { NextRequest } from "next/server";
import { createMcpClient, listMcpToolsAsOpenAI, callMcpTool } from "@/lib/mcp";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

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
        const clients: Client[] = [];
        const toolRoutes = new Map<string, Client>(); // tool name → client
        const allTools: OpenAI.Chat.ChatCompletionTool[] = [];

        for (const server of activeServers) {
          try {
            const client = await createMcpClient(server.url);
            clients.push(client);
            const tools = await listMcpToolsAsOpenAI(client);
            for (const tool of tools) {
              if (!toolRoutes.has(tool.function.name)) {
                toolRoutes.set(tool.function.name, client);
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

        // Agentic loop
        let currentMessages: OAIMessage[] = [...messages];

        while (true) {
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
            // Simulate streaming for smoother UX
            const chunkSize = 8;
            for (let i = 0; i < finalText.length; i += chunkSize) {
              enqueue(finalText.slice(i, i + chunkSize));
              await new Promise((r) => setTimeout(r, 8));
            }
            break;
          }

          currentMessages.push(msg as OAIMessage);

          for (const toolCall of msg.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }>) {
            const toolName = toolCall.function.name;
            enqueue(`[tool:${toolName}]`);

            const client = toolRoutes.get(toolName);
            if (!client) {
              currentMessages.push({ role: "tool", tool_call_id: toolCall.id, content: "Tool not found" });
              continue;
            }

            const args = JSON.parse(toolCall.function.arguments || "{}");
            const result = await callMcpTool(client, toolName, args);
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
