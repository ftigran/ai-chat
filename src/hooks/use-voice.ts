"use client";

import { useState, useRef, useEffect } from "react";
import type { MessagePart } from "@/types/chat";

export function useVoice(onTranscription: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
        currentObjectUrlRef.current = null;
      }
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  function revokeCurrentUrl() {
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
  }

  async function toggleRecording() {
    setMicError(null);
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
      setMicError("Не удалось получить доступ к микрофону");
      setTimeout(() => setMicError(null), 4000);
    }
  }

  async function speakMessage(index: number, parts: MessagePart[]) {
    if (speakingIndex === index) {
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
      revokeCurrentUrl();
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
        const msg =
          res.status === 402
            ? "Озвучка недоступна: требуется платный план ElevenLabs"
            : `Ошибка озвучки (${res.status})`;
        setTtsError(msg);
        setTimeout(() => setTtsError(null), 4000);
        setSpeakingIndex(null);
        return;
      }
      const blob = await res.blob();
      revokeCurrentUrl();
      const objectUrl = URL.createObjectURL(blob);
      currentObjectUrlRef.current = objectUrl;
      const audio = new Audio(objectUrl);
      currentAudioRef.current = audio;
      audio.onended = () => {
        setSpeakingIndex(null);
        revokeCurrentUrl();
      };
      audio.onerror = () => {
        setSpeakingIndex(null);
        revokeCurrentUrl();
      };
      audio.play();
    } catch {
      setTtsError("Не удалось подключиться к сервису озвучки");
      setTimeout(() => setTtsError(null), 4000);
      setSpeakingIndex(null);
    }
  }

  return {
    recording,
    transcribing,
    speakingIndex,
    ttsError,
    micError,
    toggleRecording,
    speakMessage,
  };
}
