import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, rm, access } from "fs/promises";
import path from "path";
import { invalidateIndexCache, getIndex, getLastIndexError } from "@/lib/rag-service";

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

  // Try to build index — may take 30–90s for large PDFs
  try {
    await getIndex();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[RAG] Indexing error:", err);
    if (message.includes("429") || message.includes("quota")) {
      return NextResponse.json(
        {
          error:
            "Превышен лимит OpenAI API. PDF сохранён, но индексация не удалась. Проверьте баланс и тарифный план.",
        },
        { status: 429 },
      );
    }
    if (message.includes("401") || message.includes("invalid")) {
      return NextResponse.json(
        {
          error: "Ошибка авторизации OpenAI. Проверьте OPENAI_API_KEY в .env.",
        },
        { status: 401 },
      );
    }
    return NextResponse.json(
      {
        error: `Ошибка индексации: ${message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "PDF загружен и проиндексирован.",
    filename: file.name,
    size: file.size,
  });
}

export async function GET() {
  try {
    const indexPath = path.join(process.cwd(), "data", "index", "docstore.json");
    await access(indexPath);
    return NextResponse.json({ indexReady: true });
  } catch {
    return NextResponse.json({ indexReady: false });
  }
}
