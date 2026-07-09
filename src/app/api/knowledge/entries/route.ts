import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";
import { Pinecone } from "@pinecone-database/pinecone";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const tag = url.searchParams.get("tag");
    const projectId = url.searchParams.get("projectId");

    const where: any = {};
    if (type) where.type = type;
    if (tag) where.tags = { has: tag };
    if (projectId) where.projectId = projectId;

    const entries = await prisma.knowledgeEntry.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { versions: { select: { id: true } } }
    });

    return NextResponse.json({ success: true, data: { entries } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, type = "KNOWLEDGE", tags = [], projectId } = body;

    if (!content) {
      return NextResponse.json({ success: false, error: { message: "content is required" } }, { status: 400 });
    }

    const entry = await prisma.knowledgeEntry.create({
      data: { content, type, tags, projectId, source: "dashboard", vectorId: "pending" }
    });
    
    await prisma.knowledgeEntry.update({
      where: { id: entry.id },
      data: { vectorId: entry.id }
    });

    try {
      const emb = await openai.embeddings.create({
        input: content,
        model: "text-embedding-3-small"
      });
      const vector = emb.data[0].embedding;

      const pc = process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== "pinecone_key_placeholder"
        ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
        : null;
      const index = pc?.index(process.env.PINECONE_INDEX || "knowledge_index");

      if (index) {
        await (index as any).upsert([{
          id: entry.id,
          values: vector,
          metadata: { type, tags, projectId }
        }]);
      }
    } catch (e) {
      console.error("Embedding Error", e);
    }

    return NextResponse.json({ success: true, data: { entry } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
