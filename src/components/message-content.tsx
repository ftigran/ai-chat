"use client";

import type { MessagePart } from "@/types/chat";

export function MessageContent({
  parts,
  streaming,
}: {
  parts: MessagePart[];
  streaming?: boolean;
}) {
  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === "tool_call") {
          return (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 bg-emerald-900/40 border border-emerald-700/50 text-emerald-400 text-xs px-2 py-1 rounded-md my-1 mr-1"
            >
              <svg
                className="w-3 h-3 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              {part.name}
            </div>
          );
        }
        if (part.type === "mcp_error") {
          return (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 bg-red-900/40 border border-red-700/50 text-red-400 text-xs px-2 py-1 rounded-md my-1 mr-1"
            >
              {part.message}
            </div>
          );
        }
        const isLast = i === parts.length - 1;
        return (
          <span key={i} className="whitespace-pre-wrap leading-relaxed">
            {part.content}
            {isLast && streaming && (
              <span className="inline-block w-1.5 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
            )}
          </span>
        );
      })}
    </div>
  );
}
