import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";
import { Pinecone } from "@pinecone-database/pinecone";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, projectId, type } = body;

    if (!question) {
      return NextResponse.json({ success: false, error: { message: "question is required" } }, { status: 400 });
    }

    const pc = process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== "pinecone_key_placeholder"
      ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
      : null;
    const index = pc?.index(process.env.PINECONE_INDEX || "knowledge_index");

    let topMatches: any[] = [];

    if (index) {
      const emb = await openai.embeddings.create({ input: question, model: "text-embedding-3-small" });
      const vector = emb.data[0].embedding;

      const filter: any = {};
      if (projectId) filter.projectId = projectId;
      if (type) filter.type = type;

      const queryRes = await index.query({
        vector,
        topK: 5,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        includeMetadata: true
      });

      const matchIds = queryRes.matches.map((m: any) => m.id);
      topMatches = await prisma.knowledgeEntry.findMany({
        where: { id: { in: matchIds } }
      });
    }

    if (topMatches.length === 0) {
      return NextResponse.json({ success: true, data: { answer: "No matching entries found.", matches: [] } });
    }

    const ragPrompt = `Answer the question using only the saved entries below. If they don't contain a clear answer, say so rather than guessing. Keep the answer conversational and brief.

Entries:
${topMatches.map((m: any) => `- [${m.type}] ${m.content}`).join("\n")}

Question: ${question}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: ragPrompt }]
    });

    const answer = completion.choices[0].message.content?.trim();

    return NextResponse.json({ success: true, data: { answer, matches: topMatches } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
