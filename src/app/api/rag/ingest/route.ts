import { NextRequest, NextResponse } from "next/server";
import { rm, mkdir } from "fs/promises";
import path from "path";
import { invalidateIndexCache, getIndex } from "@/lib/rag-service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (
    process.env.RAG_INGEST_SECRET &&
    body.secret !== process.env.RAG_INGEST_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const indexDir = path.join(process.cwd(), "data", "index");
  await rm(indexDir, { recursive: true, force: true });
  await mkdir(indexDir, { recursive: true });
  invalidateIndexCache();

  try {
    await getIndex();
    return NextResponse.json({ success: true, message: "Индекс успешно построен" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
