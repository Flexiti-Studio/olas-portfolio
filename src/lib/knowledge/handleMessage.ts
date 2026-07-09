import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";
import { Pinecone } from "@pinecone-database/pinecone";

// Mock Pinecone for local dev if keys aren't set
const pc = process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== "pinecone_key_placeholder"
  ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
  : null;
const index = pc?.index(process.env.PINECONE_INDEX || "knowledge_index");

export async function handleKnowledgeMessage(chatId: number, text: string, sendMessage: (chatId: number, text: string, options?: any) => Promise<void>, reqUrl: string) {
  let intent = "UNCLEAR";

  const prompt = `Classify this message as one of: CAPTURE, QUERY, UPDATE, UNCLEAR.
CAPTURE = sharing a new idea or piece of knowledge to save.
QUERY = asking a question about something previously saved.
UPDATE = referring to something already saved and changing/correcting/adding to it.
Return only the single word.

Message: "${text}"`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: prompt }],
    temperature: 0,
    max_tokens: 10
  });
  
  intent = completion.choices[0].message.content?.trim().toUpperCase() || "UNCLEAR";

  if (intent === "CAPTURE") {
    // Determine Type & Tags
    const metaPrompt = `Classify this text as IDEA or KNOWLEDGE, and suggest 1-3 short tags.
Respond in JSON format: { "type": "IDEA" | "KNOWLEDGE", "tags": ["tag1"] }
Text: "${text}"`;

    let type = "KNOWLEDGE";
    let tags: string[] = [];

    try {
      const metaRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: metaPrompt }]
      });
      const meta = JSON.parse(metaRes.choices[0].message.content || "{}");
      if (meta.type === "IDEA" || meta.type === "KNOWLEDGE") type = meta.type;
      if (Array.isArray(meta.tags)) tags = meta.tags;
    } catch (e) {
      // ignore
    }

    // Try to find a project match
    let projectId: string | null = null;
    const projects = await prisma.project.findMany({ where: { status: { not: "ARCHIVED" } } });
    for (const p of projects) {
      if (text.toLowerCase().includes(p.name.toLowerCase())) {
        projectId = p.id;
        break;
      }
    }

    // Create DB row
    const entry = await prisma.knowledgeEntry.create({
      data: { type, content: text, tags, projectId, vectorId: "pending" }
    });
    
    await prisma.knowledgeEntry.update({
      where: { id: entry.id },
      data: { vectorId: entry.id }
    });

    // Embedding & Pinecone
    try {
      const emb = await openai.embeddings.create({
        input: text,
        model: "text-embedding-3-small"
      });
      const vector = emb.data[0].embedding;

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

    await sendMessage(chatId, `Saved as a ${type}.`);
    return;
  }

  if (intent === "QUERY") {
    let topMatches: any[] = [];
    
    try {
      const emb = await openai.embeddings.create({
        input: text,
        model: "text-embedding-3-small"
      });
      const vector = emb.data[0].embedding;

      if (index) {
        const queryRes = await index.query({
          vector,
          topK: 5,
          includeMetadata: true
        });
        const matchIds = queryRes.matches.map(m => m.id);
        topMatches = await prisma.knowledgeEntry.findMany({
          where: { id: { in: matchIds } }
        });
      }
    } catch (e) {
      console.error("Query Error", e);
    }

    const ragPrompt = `Answer the question using only the saved entries below. If they don't contain a clear answer, say so rather than guessing. Keep the answer conversational and brief — this is a quick check-in, not a report.

Entries:
${topMatches.map(m => `- [${m.type}] ${m.content}`).join("\n")}

Question: ${text}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: ragPrompt }]
    });

    const reply = completion.choices[0].message.content?.trim();

    await prisma.setting.upsert({
      where: { key: `knowledge:pending_query_${chatId}` },
      update: { value: topMatches.map(m => m.id) },
      create: { key: `knowledge:pending_query_${chatId}`, value: topMatches.map(m => m.id) }
    });

    await sendMessage(chatId, reply || "Couldn't generate an answer.");
    return;
  }

  if (intent === "UPDATE") {
    // Resolve which entry to update
    let targetEntryId: string | null = null;
    const isPronounHeavy = /\b(that|it|this|the last one)\b/i.test(text);

    if (isPronounHeavy) {
      const pendingQuery = await prisma.setting.findUnique({ where: { key: `knowledge:pending_query_${chatId}` } });
      if (pendingQuery && Array.isArray(pendingQuery.value) && pendingQuery.value.length > 0) {
        targetEntryId = (pendingQuery.value as any)[0] as string; // pick top match from last query
      }
    }

    if (!targetEntryId && index) {
      // Find closest
      try {
        const emb = await openai.embeddings.create({
          input: text,
          model: "text-embedding-3-small"
        });
        const queryRes = await index.query({
          vector: emb.data[0].embedding,
          topK: 1,
        });
        if (queryRes.matches.length > 0 && (queryRes.matches[0].score || 0) > 0.75) {
          targetEntryId = queryRes.matches[0].id;
        }
      } catch (e) {
        console.error("Update Search Error", e);
      }
    }

    if (!targetEntryId) {
      await sendMessage(chatId, "I'm not sure which entry you mean — can you say more about what you're updating?");
      return;
    }

    const entry = await prisma.knowledgeEntry.findUnique({ where: { id: targetEntryId } });
    if (!entry) {
      await sendMessage(chatId, "I couldn't find the entry to update.");
      return;
    }

    // Confirmation
    await prisma.setting.upsert({
      where: { key: `knowledge:pending_update_${chatId}` },
      update: { value: { targetId: targetEntryId, newContent: text } },
      create: { key: `knowledge:pending_update_${chatId}`, value: { targetId: targetEntryId, newContent: text } }
    });

    const truncated = entry.content.length > 50 ? entry.content.substring(0, 50) + "..." : entry.content;
    const inlineKeyboard = [
      [{ text: "Yes, update it", callback_data: `knowledge_update_confirm` }],
      [{ text: "No, cancel", callback_data: `knowledge_update_cancel` }]
    ];
    await sendMessage(chatId, `Update this: '${truncated}' → with what you just said?`, { inline_keyboard: inlineKeyboard });
    return;
  }

  await sendMessage(chatId, "I couldn't understand that. Please try again or rephrase.");
}
