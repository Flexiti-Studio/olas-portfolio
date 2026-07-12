import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";
import { Pinecone } from "@pinecone-database/pinecone";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const entry = await prisma.knowledgeEntry.findUnique({
      where: { id },
      include: { versions: { orderBy: { createdAt: 'desc' } } }
    });

    if (!entry) {
      return NextResponse.json({ success: false, error: { message: "Not found" } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { entry } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { content, type, tags, projectId, summary } = body;

    const entry = await prisma.knowledgeEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ success: false, error: { message: "Not found" } }, { status: 404 });
    }

    if (content && content !== entry.content) {
      await prisma.knowledgeEntryVersion.create({
        data: { entryId: entry.id, content: entry.content }
      });
    }

    const dataToUpdate: any = {};
    if (content !== undefined) dataToUpdate.content = content;
    if (type !== undefined) dataToUpdate.type = type;
    if (tags !== undefined) dataToUpdate.tags = tags;
    if (projectId !== undefined) dataToUpdate.projectId = projectId;
    if (summary !== undefined) dataToUpdate.summary = summary;

    const updated = await prisma.knowledgeEntry.update({
      where: { id },
      data: dataToUpdate
    });

    // Update Pinecone if meaning changes
    if (content !== undefined || tags !== undefined || type !== undefined || projectId !== undefined) {
      const pc = process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== "pinecone_key_placeholder"
        ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
        : null;
      const index = pc?.index(process.env.PINECONE_INDEX || "knowledge_index");

      if (index) {
        let vector = null;
        if (content !== undefined) {
          const emb = await openai.embeddings.create({ input: content, model: "text-embedding-3-small" });
          vector = emb.data[0].embedding;
        } else {
          // fetch old vector if only metadata changes?
          // Actually, you can partial update metadata in pinecone, but simplest is full upsert if we had vector.
          // For simplicity in this demo, if content didn't change, we skip pinecone update.
        }

        if (vector) {
          await (index as any).upsert({ records: [{
            id: updated.id,
            values: vector,
            metadata: { 
              type: updated.type, 
              tags: updated.tags, 
              projectId: updated.projectId || "none" 
            }
          }] });
        }
      }
    }

    return NextResponse.json({ success: true, data: { entry: updated } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Delete versions
    await prisma.knowledgeEntryVersion.deleteMany({ where: { entryId: id } });
    
    // Delete entry
    await prisma.knowledgeEntry.delete({ where: { id } });

    // Delete from Pinecone
    const pc = process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== "pinecone_key_placeholder"
      ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
      : null;
    const index = pc?.index(process.env.PINECONE_INDEX || "knowledge_index");

    if (index) {
      await (index as any).deleteOne(id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
