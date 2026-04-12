"use client";

import { useState, useEffect } from "react";

export function useRag() {
  const [ragEnabled, setRagEnabled] = useState(false);
  const [showRagSettings, setShowRagSettings] = useState(false);
  const [ragUploadStatus, setRagUploadStatus] = useState<string | null>(null);
  const [ragUploading, setRagUploading] = useState(false);
  const [ragFileReady, setRagFileReady] = useState(false);

  useEffect(() => {
    fetch("/api/upload-pdf")
      .then((res) => res.json())
      .then((data) => {
        if (data.indexReady) setRagFileReady(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ragFileReady && ragEnabled) setRagEnabled(false);
  }, [ragFileReady, ragEnabled]);

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
    } catch {
      setRagUploadStatus("Ошибка загрузки");
    } finally {
      setRagUploading(false);
    }
  }

  const toggleRag = () => {
    if (ragFileReady) setRagEnabled((v) => !v);
  };

  return {
    ragEnabled,
    showRagSettings,
    setShowRagSettings,
    ragUploadStatus,
    ragUploading,
    ragFileReady,
    handleRagUpload,
    toggleRag,
  };
}
