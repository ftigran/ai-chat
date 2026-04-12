"use client";

import { useState, useCallback, useMemo } from "react";
import { MODELS } from "@/constants/models";
import { useMcpServers } from "@/hooks/use-mcp-servers";
import { useChat } from "@/hooks/use-chat";
import { useVoice } from "@/hooks/use-voice";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { useRouting } from "@/hooks/use-routing";
import { useRag } from "@/hooks/use-rag";
import { useFeedback } from "@/hooks/use-feedback";
import { ChatHeader } from "@/components/chat-header";
import { ChatInput } from "@/components/chat-input";
import { EmptyState } from "@/components/empty-state";
import { MessageBubble } from "@/components/message-bubble";
import { ImprovementBanner } from "@/components/improvement-banner";

export default function Home() {
  const [model, setModel] = useState(MODELS[0].id);
  const [showSettings, setShowSettings] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());
  const [regenModel, setRegenModel] = useState<Record<number, string>>({});

  const selectedModel = useMemo(() => MODELS.find((m) => m.id === model)!, [model]);

  const { servers, activeServers, saveServers } = useMcpServers();
  const { messages, input, setInput, loading, send, saveEdit, regenerate, handleKeyDown } =
    useChat();
  const {
    recording,
    transcribing,
    speakingIndex,
    ttsError,
    micError,
    toggleRecording,
    speakMessage,
  } = useVoice((text) => setInput((prev) => prev + (prev ? " " : "") + text));
  const bottomRef = useAutoScroll([messages]);

  const {
    routingEnabled,
    setRoutingEnabled,
    classifying,
    classifications,
    messageAgents,
    classify,
    recordAssistantAgent,
  } = useRouting(conversationId);

  const rag = useRag();

  const {
    feedbacks,
    agentPromptOverrides,
    improvementSuggestion,
    setImprovementSuggestion,
    editedSuggestion,
    setEditedSuggestion,
    improving,
    handleFeedback: rawHandleFeedback,
    applyImprovement,
  } = useFeedback(conversationId);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    const startTime = Date.now();

    const routingResult = await classify(text, messages.length, agentPromptOverrides);

    const result = await send(model, activeServers, {
      systemPrompt: routingResult?.systemPrompt,
      modelOverride: routingResult?.modelId,
      ragEnabled: rag.ragEnabled,
      mcpDisabled: selectedModel.mcpDisabled,
    });

    if (result && routingEnabled && routingResult?.classification) {
      recordAssistantAgent(result.assistantMsgIndex, routingResult.classification, text, startTime);
    }
  }, [
    input,
    model,
    activeServers,
    routingEnabled,
    rag.ragEnabled,
    selectedModel,
    messages,
    agentPromptOverrides,
    send,
    classify,
    recordAssistantAgent,
  ]);

  const handleEdit = useCallback(
    (index: number, newText: string) => {
      saveEdit(index, newText, model, activeServers, {
        ragEnabled: rag.ragEnabled,
        mcpDisabled: selectedModel.mcpDisabled,
      });
    },
    [saveEdit, model, activeServers, rag.ragEnabled, selectedModel],
  );

  const handleRegenerate = useCallback(
    (index: number) => {
      regenerate(index, model, activeServers, {
        modelOverride: regenModel[index],
        ragEnabled: rag.ragEnabled,
        mcpDisabled: selectedModel.mcpDisabled,
      });
    },
    [regenerate, model, activeServers, regenModel, rag.ragEnabled, selectedModel],
  );

  const handleSpeak = useCallback(
    (index: number) => {
      speakMessage(index, messages[index].parts);
    },
    [speakMessage, messages],
  );

  const handleFeedback = useCallback(
    (messageIndex: number, feedback: "like" | "dislike") => {
      rawHandleFeedback(messageIndex, feedback, messages, messageAgents, routingEnabled);
    },
    [rawHandleFeedback, messages, messageAgents, routingEnabled],
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
        routingEnabled={routingEnabled}
        onToggleRouting={() => setRoutingEnabled((v) => !v)}
        ragEnabled={rag.ragEnabled}
        ragFileReady={rag.ragFileReady}
        onToggleRag={rag.toggleRag}
        showRagSettings={rag.showRagSettings}
        onToggleRagSettings={() => rag.setShowRagSettings((v) => !v)}
        ragUploading={rag.ragUploading}
        ragUploadStatus={rag.ragUploadStatus}
        onRagUpload={rag.handleRagUpload}
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
              isLoading={loading}
              speakingIndex={speakingIndex}
              onSpeak={handleSpeak}
              onEdit={handleEdit}
              onRegenerate={handleRegenerate}
              onFeedback={handleFeedback}
              onRegenModelChange={(idx, newModel) => {
                setRegenModel((prev) => ({ ...prev, [idx]: newModel }));
                const mcpDisabled = MODELS.find((m) => m.id === newModel)?.mcpDisabled ?? false;
                regenerate(idx, model, activeServers, {
                  modelOverride: newModel,
                  ragEnabled: rag.ragEnabled,
                  mcpDisabled,
                });
              }}
              feedback={feedbacks[i]}
              regenModel={regenModel[i]}
              currentModel={model}
              classification={classifications[i]}
            />
          ))}
          {classifying && (
            <div className="flex justify-start">
              <div className="bg-violet-900/30 border border-violet-700/50 text-violet-300 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Классификация...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {(ttsError || micError) && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          {ttsError || micError}
        </div>
      )}

      <ImprovementBanner
        improving={improving}
        suggestion={improvementSuggestion}
        editedSuggestion={editedSuggestion}
        onEditChange={setEditedSuggestion}
        onApply={applyImprovement}
        onDismiss={() => setImprovementSuggestion(null)}
      />

      <ChatInput
        input={input}
        onInputChange={setInput}
        onKeyDown={(e) => handleKeyDown(e, handleSend)}
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
