export type McpServer = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
};

export type MessagePart =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string }
  | { type: "mcp_error"; message: string };

export type Message = {
  role: "user" | "assistant";
  parts: MessagePart[];
};
