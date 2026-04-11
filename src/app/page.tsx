"use client";

import { useState, useCallback, useEffect } from "react";
import { MODELS } from "@/constants/models";
import { getAgentById } from "@/lib/agents";
import { saveTicket } from "@/lib/ticket-store";
import { saveFeedback, getFeedbacksByAgent, saveAgentPrompt, loadAgentPrompts } from "@/lib/feedback-store";
import { textOf } from "@/lib/parse-message";
import type { Classification, Ticket } from "@/lib/types";
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
  // Routing
  const [routingEnabled, setRoutingEnabled] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classifications, setClassifications] = useState<Record<number, Classification>>({});
  const [conversationId] = useState(() => crypto.randomUUID());
  // RAG
  const [ragEnabled, setRagEnabled] = useState(false);
  const [showRagSettings, setShowRagSettings] = useState(false);
  const [ragUploadStatus, setRagUploadStatus] = useState<string | null>(null);
  const [ragUploading, setRagUploading] = useState(false);
  const [ragFileReady, setRagFileReady] = useState(false);
  // Feedback
  const [feedbacks, setFeedbacks] = useState<Record<number, "like" | "dislike">>({});
  const [messageAgents, setMessageAgents] = useState<Record<number, string>>({});
  const [agentPromptOverrides, setAgentPromptOverrides] = useState<Record<string, string>>(loadAgentPrompts);
  const [improvementSuggestion, setImprovementSuggestion] = useState<{
    agentId: string; agentName: string; prompt: string;
  } | null>(null);
  const [editedSuggestion, setEditedSuggestion] = useState("");
  const [improving, setImproving] = useState(false);
  // Regen model per message
  const [regenModel, setRegenModel] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("/api/upload-pdf")
      .then((res) => res.json())
      .then((data) => { if (data.indexReady) setRagFileReady(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ragFileReady && ragEnabled) setRagEnabled(false);
  }, [ragFileReady, ragEnabled]);

  const { servers, activeServers, saveServers } = useMcpServers();
  const { messages, input, setInput, loading, send, saveEdit, regenerate, handleKeyDown } = useChat();
  const { recording, transcribing, speakingIndex, ttsError, toggleRecording, speakMessage } = useVoice(
    (text) => setInput((prev) => prev + (prev ? " " : "") + text)
  );
  const bottomRef = useAutoScroll([messages]);

  const selectedModel = MODELS.find((m) => m.id === model)!;

  async function triggerImprovement(agentId: string) {
    const agent = getAgentById(agentId);
    if (!agent || improving) return;
    const currentPrompt = agentPromptOverrides[agentId] ?? agent.systemPrompt;
    const allFeedbacks = getFeedbacksByAgent(agentId);
    const liked = allFeedbacks.filter((f) => f.feedback === "like").map((f) => f.messageText).slice(-5);
    const disliked = allFeedbacks.filter((f) => f.feedback === "dislike").map((f) => f.messageText).slice(-5);
    setImproving(true);
    try {
      const res = await fetch("/api/improve-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, agentName: agent.name, currentPrompt, liked, disliked }),
      });
      const data = await res.json();
      if (data.improvedPrompt) {
        setImprovementSuggestion({ agentId, agentName: agent.name, prompt: data.improvedPrompt });
        setEditedSuggestion(data.improvedPrompt);
      }
    } catch { /* ignore */ } finally { setImproving(false); }
  }

  function handleFeedback(messageIndex: number, feedback: "like" | "dislike") {
    const current = feedbacks[messageIndex];
    const newFeedback = current === feedback ? undefined : feedback;
    setFeedbacks((prev) => {
      const updated = { ...prev };
      if (newFeedback === undefined) delete updated[messageIndex];
      else updated[messageIndex] = newFeedback;
      return updated;
    });
    if (newFeedback === undefined) return;
    const agentId = messageAgents[messageIndex] ?? null;
    saveFeedback({
      id: crypto.randomUUID(), conversationId, messageIndex,
      feedback: newFeedback, messageText: textOf(messages[messageIndex]).slice(0, 500),
      agentId, timestamp: Date.now(),
    });
    if (newFeedback === "dislike" && agentId && routingEnabled) {
      const agentDislikes = getFeedbacksByAgent(agentId).filter((f) => f.feedback === "dislike");
      if (agentDislikes.length >= 3 && !improvementSuggestion) triggerImprovement(agentId);
    }
  }

  function applyImprovement() {
    if (!improvementSuggestion) return;
    saveAgentPrompt(improvementSuggestion.agentId, editedSuggestion);
    setAgentPromptOverrides((prev) => ({ ...prev, [improvementSuggestion.agentId]: editedSuggestion }));
    setImprovementSuggestion(null);
  }

  const handleSend = useCallback(async () => {
    let agentSystemPrompt: string | undefined;
    let agentModelId: string | undefined;
    let resolvedClassification: Classification | undefined;
    const startTime = Date.now();
    const text = input.trim();

    if (routingEnabled && text) {
      setClassifying(true);
      try {
        const res = await fetch("/api/classify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        resolvedClassification = (await res.json()) as Classification;
        const userIdx = messages.length;
        setClassifications((prev) => ({ ...prev, [userIdx]: resolvedClassification! }));
        const agent = getAgentById(resolvedClassification.category);
        if (agent) {
          agentSystemPrompt = agentPromptOverrides[agent.id] ?? agent.systemPrompt;
          agentModelId = agent.modelId;
        }
      } catch { /* continue without routing */ } finally { setClassifying(false); }
    }

    const result = await send(model, activeServers, {
      systemPrompt: agentSystemPrompt,
      modelOverride: agentModelId,
      ragEnabled,
      mcpDisabled: selectedModel.mcpDisabled,
    });

    if (result && routingEnabled && resolvedClassification) {
      setMessageAgents((prev) => ({ ...prev, [result.assistantMsgIndex]: resolvedClassification!.category }));
      const agent = getAgentById(resolvedClassification.category);
      const ticket: Ticket = {
        id: crypto.randomUUID(), timestamp: Date.now(), userMessage: text,
        classification: resolvedClassification, agentId: resolvedClassification.category,
        agentName: agent?.name ?? "FAQ", responsePreview: "",
        responseTime: Date.now() - startTime, conversationId, channel: "web",
      };
      saveTicket(ticket);
    }
  }, [input, model, activeServers, routingEnabled, ragEnabled, selectedModel, messages, agentPromptOverrides, send, conversationId]);

  const handleEdit = useCallback((index: number, newText: string) => {
    saveEdit(index, newText, model, activeServers, { ragEnabled, mcpDisabled: selectedModel.mcpDisabled });
  }, [saveEdit, model, activeServers, ragEnabled, selectedModel]);

  const handleRegenerate = useCallback((index: number) => {
    regenerate(index, model, activeServers, {
      modelOverride: regenModel[index],
      ragEnabled,
      mcpDisabled: selectedModel.mcpDisabled,
    });
  }, [regenerate, model, activeServers, regenModel, ragEnabled, selectedModel]);

  const handleSpeak = useCallback((index: number) => {
    speakMessage(index, messages[index].parts);
  }, [speakMessage, messages]);

  async function handleRagUpload(file: File) {
    setRagUploading(true);
    setRagUploadStatus(null);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      const res = await fetch("/api/upload-pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setRagUploadStatus(`Загружен и проиндексирован: ${file.name}`);
        setRagFileReady(true);
      } else {
        setRagUploadStatus(`Ошибка: ${data.error}`);
      }
    } catch { setRagUploadStatus("Ошибка загрузки"); }
    finally { setRagUploading(false); }
  }

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
        ragEnabled={ragEnabled}
        ragFileReady={ragFileReady}
        onToggleRag={() => { if (ragFileReady) setRagEnabled((v) => !v); }}
        showRagSettings={showRagSettings}
        onToggleRagSettings={() => setShowRagSettings((v) => !v)}
        ragUploading={ragUploading}
        ragUploadStatus={ragUploadStatus}
        onRagUpload={handleRagUpload}
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
                regenerate(idx, model, activeServers, { modelOverride: newModel, ragEnabled, mcpDisabled });
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
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Классификация...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {ttsError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          {ttsError}
        </div>
      )}

      {improving && (
        <div className="border-t border-amber-800/40 bg-amber-900/10 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-2 text-amber-400 text-xs">
            <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Анализирую обратную связь и улучшаю промпт агента...
          </div>
        </div>
      )}
      {improvementSuggestion && !improving && (
        <div className="border-t border-amber-800/50 bg-amber-900/15 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-amber-400">
                Предложение по улучшению промпта агента «{improvementSuggestion.agentName}»
              </p>
              <button onClick={() => setImprovementSuggestion(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <textarea
              value={editedSuggestion}
              onChange={(e) => setEditedSuggestion(e.target.value)}
              rows={4}
              className="w-full bg-gray-900 border border-amber-700/40 text-gray-200 text-xs rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={applyImprovement} disabled={!editedSuggestion.trim()} className="text-xs bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
                Применить
              </button>
              <button onClick={() => setImprovementSuggestion(null)} className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

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
