"use client";

import { useState, useEffect } from "react";
import type { McpServer } from "@/types/chat";

export function useMcpServers() {
  const [servers, setServers] = useState<McpServer[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("mcpServers");
    if (saved) {
      try {
        setServers(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  function saveServers(updated: McpServer[]) {
    setServers(updated);
    localStorage.setItem("mcpServers", JSON.stringify(updated));
  }

  const activeServers = servers.filter((s) => s.enabled);

  return { servers, activeServers, saveServers };
}
