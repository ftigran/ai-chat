import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, rm } from "fs/promises";
import path from "path";
import { invalidateIndexCache, getIndex } from "@/lib/rag-service";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("pdf") as File | null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Требуется PDF файл" }, { status: 400 });
  }

  const pdfDir = path.join(process.cwd(), "data", "pdfs");
  await mkdir(pdfDir, { recursive: true });
  const destPath = path.join(pdfDir, "document.pdf");

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(destPath, buffer);

  // Wipe old index and rebuild in background
  const indexDir = path.join(process.cwd(), "data", "index");
  await rm(indexDir, { recursive: true, force: true });
  await mkdir(indexDir, { recursive: true });
  invalidateIndexCache();

  // Fire-and-forget — 500-page PDF can take 30–90s to index
  getIndex().catch((err) => console.error("[RAG] Background indexing error:", err));

  return NextResponse.json({
    success: true,
    message: "PDF загружен. Индексация запущена в фоне.",
    filename: file.name,
    size: file.size,
  });
}
