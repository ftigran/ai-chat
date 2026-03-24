import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export type McpClient = Client;

export async function createMcpClient(url: string): Promise<Client> {
  const client = new Client({ name: "ai-chat", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(url));
  await client.connect(transport);
  return client;
}

// Groq requires tool names matching [a-zA-Z0-9_-], max 64 chars
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

export async function listMcpToolsAsOpenAI(
  client: Client
): Promise<{ tools: ReturnType<typeof buildTool>[]; nameMap: Map<string, string> }> {
  const { tools } = await client.listTools();
  const nameMap = new Map<string, string>(); // safe name → original name

  const openaiTools = tools.map((tool) => {
    const safeName = sanitizeName(tool.name);
    nameMap.set(safeName, tool.name);
    return buildTool(safeName, tool.description ?? "", tool.inputSchema as Record<string, unknown>);
  });

  return { tools: openaiTools, nameMap };
}

function buildTool(name: string, description: string, parameters: Record<string, unknown>) {
  return {
    type: "function" as const,
    function: { name, description, parameters },
  };
}

export async function callMcpTool(
  client: Client,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const result = await client.callTool({ name, arguments: args });
  const content = result.content as Array<{ type: string; text?: string }>;
  return content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
}
