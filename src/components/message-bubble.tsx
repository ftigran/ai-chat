"use client";

import type { Message } from "@/types/chat";
import { MessageContent } from "./message-content";

export function MessageBubble({
  message,
  index,
  isStreaming,
  speakingIndex,
  onSpeak,
}: {
  message: Message;
  index: number;
  isStreaming: boolean;
  speakingIndex: number | null;
  onSpeak: (index: number) => void;
}) {
  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
          message.role === "user"
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-800 text-gray-100 rounded-bl-sm"
        }`}
      >
        <MessageContent parts={message.parts} streaming={isStreaming} />
        {message.role === "assistant" && !isStreaming && (
          <button
            onClick={() => onSpeak(index)}
            className={`mt-2 flex items-center gap-1 text-xs transition-colors ${
              speakingIndex === index ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
            }`}
            title={speakingIndex === index ? "Остановить" : "Озвучить"}
          >
            {speakingIndex === index ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M9 9v6l4-3-4-3z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
