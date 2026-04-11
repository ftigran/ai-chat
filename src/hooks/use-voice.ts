"use client";

import { useState, useRef } from "react";
import type { MessagePart } from "@/types/chat";

export function useVoice(onTranscription: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setTranscribing(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", blob, "audio.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = await res.json();
          if (data.text) onTranscription(data.text);
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      alert("Не удалось получить доступ к микрофону");
    }
  }

  async function speakMessage(index: number, parts: MessagePart[]) {
    if (speakingIndex === index) {
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
      setSpeakingIndex(null);
      return;
    }

    const text = parts
      .filter((p): p is { type: "text"; content: string } => p.type === "text")
      .map((p) => p.content)
      .join("")
      .trim();

    if (!text) return;

    setSpeakingIndex(index);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const msg = res.status === 402
          ? "Озвучка недоступна: требуется платный план ElevenLabs"
          : `Ошибка озвучки (${res.status})`;
        setTtsError(msg);
        setTimeout(() => setTtsError(null), 4000);
        setSpeakingIndex(null);
        return;
      }
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      currentAudioRef.current = audio;
      audio.onended = () => setSpeakingIndex(null);
      audio.onerror = () => setSpeakingIndex(null);
      audio.play();
    } catch {
      setTtsError("Не удалось подключиться к сервису озвучки");
      setTimeout(() => setTtsError(null), 4000);
      setSpeakingIndex(null);
    }
  }

  return { recording, transcribing, speakingIndex, ttsError, toggleRecording, speakMessage };
}
