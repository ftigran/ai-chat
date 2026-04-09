"use client";

import { useState, useCallback } from "react";
import { MODELS } from "@/constants/models";
import { useMcpServers } from "@/hooks/use-mcp-servers";
import { useChat } from "@/hooks/use-chat";
import { useVoice } from "@/hooks/use-voice";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { ChatHeader } from "@/components/chat-header";
import { ChatInput } from "@/components/chat-input";
import { EmptyState } from "@/components/empty-state";
import { MessageBubble } from "@/components/message-bubble";

export default function Home() {
  const [model, setModel] = useState(MODELS[0].id);
  const [showSettings, setShowSettings] = useState(false);

  const { servers, activeServers, saveServers } = useMcpServers();
  const { messages, input, setInput, loading, send, handleKeyDown } = useChat();
  const { recording, transcribing, speakingIndex, ttsError, toggleRecording, speakMessage } = useVoice(
    (text) => setInput((prev) => prev + (prev ? " " : "") + text)
  );
  const bottomRef = useAutoScroll([messages]);

  const handleSend = useCallback(() => send(model, activeServers), [send, model, activeServers]);
  const handleKeyDownWrapped = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => handleKeyDown(e, model, activeServers),
    [handleKeyDown, model, activeServers]
  );
  const handleSpeak = useCallback(
    (index: number) => speakMessage(index, messages[index].parts),
    [speakMessage, messages]
  );

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      <ChatHeader
        model={model}
        onModelChange={setModel}
        activeServers={activeServers}
        mcpServers={servers}
        onServersChange={saveServers}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((v) => !v)}
      />

      <main className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && <EmptyState activeServerCount={activeServers.length} />}
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              index={i}
              isStreaming={loading && msg.role === "assistant" && i === messages.length - 1}
              speakingIndex={speakingIndex}
              onSpeak={handleSpeak}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </main>

      {ttsError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          {ttsError}
        </div>
      )}

      <ChatInput
        input={input}
        onInputChange={setInput}
        onKeyDown={handleKeyDownWrapped}
        onSend={handleSend}
        onToggleRecording={toggleRecording}
        recording={recording}
        transcribing={transcribing}
        loading={loading}
        activeServers={activeServers}
      />
    </div>
  );
}
