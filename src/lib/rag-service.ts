import path from "path";
import fs from "fs/promises";
import { VectorStoreIndex, storageContextFromDefaults, Settings, MetadataMode } from "llamaindex";
import { OpenAIEmbedding } from "@llamaindex/openai";
import { env } from "@/lib/env";
import { RAG_TOP_K } from "@/constants/config";

const PERSIST_DIR = path.join(process.cwd(), "data", "index");
const PDF_PATH = env.RAG_PDF_PATH ?? path.join(process.cwd(), "data", "pdfs", "document.pdf");

// Module-level singleton — survives across requests in the same Node process
let cachedIndex: VectorStoreIndex | null = null;
let lastIndexError: string | null = null;

export function getLastIndexError(): string | null {
  return lastIndexError;
}

function configureEmbeddings() {
  Settings.embedModel = new OpenAIEmbedding({
    model: "text-embedding-3-small",
    apiKey: env.OPENAI_API_KEY!,
  });
}

async function persistedIndexExists(): Promise<boolean> {
  try {
    await fs.access(path.join(PERSIST_DIR, "docstore.json"));
    return true;
  } catch {
    return false;
  }
}

async function loadIndexFromStorage(): Promise<VectorStoreIndex> {
  const storageContext = await storageContextFromDefaults({
    persistDir: PERSIST_DIR,
  });
  return await VectorStoreIndex.init({ storageContext });
}

async function buildIndexFromPDF(pdfPath: string): Promise<VectorStoreIndex> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFReader } = require("@llamaindex/readers/pdf");
  const reader = new PDFReader();
  const documents = await reader.loadData(pdfPath);
  const storageContext = await storageContextFromDefaults({
    persistDir: PERSIST_DIR,
  });
  return await VectorStoreIndex.fromDocuments(documents, { storageContext });
}

export async function getIndex(): Promise<VectorStoreIndex | null> {
  if (cachedIndex) return cachedIndex;
  configureEmbeddings();
  await fs.mkdir(PERSIST_DIR, { recursive: true });
  if (await persistedIndexExists()) {
    cachedIndex = await loadIndexFromStorage();
    lastIndexError = null;
  } else {
    // Check if PDF exists before trying to build index
    try {
      await fs.access(PDF_PATH);
    } catch {
      return null;
    }
    cachedIndex = await buildIndexFromPDF(PDF_PATH);
    lastIndexError = null;
  }
  return cachedIndex;
}

export function invalidateIndexCache() {
  cachedIndex = null;
}

export async function queryRAG(userQuery: string): Promise<string> {
  try {
    const index = await getIndex();
    if (!index) return "";
    const retriever = index.asRetriever({ similarityTopK: RAG_TOP_K });
    const nodes = await retriever.retrieve({ query: userQuery });

    if (!nodes.length) return "";

    const contextChunks = nodes
      .map((n, i) => `[Фрагмент ${i + 1}]\n${n.node.getContent(MetadataMode.NONE)}`)
      .join("\n\n");

    return `Релевантный контекст из базы знаний:\n\n${contextChunks}`;
  } catch (err) {
    console.error("[RAG] queryRAG error:", err);
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("429") || message.includes("quota")) {
      lastIndexError = "Превышен лимит OpenAI API. Проверьте баланс и тарифный план.";
    } else if (message.includes("401") || message.includes("invalid")) {
      lastIndexError = "Ошибка авторизации OpenAI. Проверьте OPENAI_API_KEY.";
    } else {
      lastIndexError = `Ошибка RAG: ${message}`;
    }
    return "";
  }
}
