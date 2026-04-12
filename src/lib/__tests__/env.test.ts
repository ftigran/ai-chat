import { describe, it, expect, vi, beforeEach } from "vitest";

describe("env validation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws when GROQ_API_KEY is missing", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const { getEnv } = await import("@/lib/env");
    expect(() => getEnv()).toThrow();
  });

  it("parses successfully with valid GROQ_API_KEY", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test_key_123");
    const { getEnv } = await import("@/lib/env");
    const result = getEnv();
    expect(result.GROQ_API_KEY).toBe("gsk_test_key_123");
  });

  it("optional keys are undefined when not set", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test_key_123");
    const { getEnv } = await import("@/lib/env");
    const result = getEnv();
    expect(result.ELEVENLABS_API_KEY).toBeUndefined();
    expect(result.OPENAI_API_KEY).toBeUndefined();
  });

  it("parses optional keys when provided", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    vi.stubEnv("ELEVENLABS_API_KEY", "el_test");
    vi.stubEnv("OPENAI_API_KEY", "sk_test");
    const { getEnv } = await import("@/lib/env");
    const result = getEnv();
    expect(result.ELEVENLABS_API_KEY).toBe("el_test");
    expect(result.OPENAI_API_KEY).toBe("sk_test");
  });
});
