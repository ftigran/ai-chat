import type { MessagePart, Message } from "@/types/chat";

export function parseMessageParts(raw: string): MessagePart[] {
  const parts: MessagePart[] = [];
  const regex = /\[(tool|mcp_error):([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: raw.slice(lastIndex, match.index) });
    }
    if (match[1] === "tool") {
      parts.push({ type: "tool_call", name: match[2] });
    } else {
      parts.push({ type: "mcp_error", message: match[2] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    parts.push({ type: "text", content: raw.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: raw }];
}

export function textOf(msg: Message): string {
  return msg.parts
    .filter((p): p is { type: "text"; content: string } => p.type === "text")
    .map((p) => p.content)
    .join("");
}
