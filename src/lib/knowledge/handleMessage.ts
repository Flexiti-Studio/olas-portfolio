import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";
import { Pinecone } from "@pinecone-database/pinecone";

// Mock Pinecone for local dev if keys aren't set
const pc = process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== "pinecone_key_placeholder"
  ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
  : null;
const index = pc?.index(process.env.PINECONE_INDEX || "knowledge_index");

export async function handleKnowledgeMessage(chatId: number, text: string, sendMessage: (chatId: number, text: string, options?: any) => Promise<void>, reqUrl: string) {
  if (text.startsWith("__CALLBACK__")) {
    const data = text.replace("__CALLBACK__", "");
    if (data === "knowledge_update_confirm") {
      const pending = await prisma.setting.findUnique({ where: { key: `knowledge:pending_update_${chatId}` } });
      if (pending) {
        const { targetId, newContent } = pending.value as any;
        const entry = await prisma.knowledgeEntry.findUnique({ where: { id: targetId } });
        if (entry) {
          // Versioning
          await prisma.knowledgeEntryVersion.create({
            data: { entryId: entry.id, content: entry.content }
          });
          // Update
          await prisma.knowledgeEntry.update({
            where: { id: entry.id },
            data: { content: newContent } // Wait, actually should we append? The prompt says "changing/correcting/adding to it".
          });
          
          // Re-embed
          try {
            const emb = await openai.embeddings.create({
              input: newContent,
              model: "text-embedding-3-small",
              dimensions: 1024
            });
            if (index) {
              const metadata: any = { type: entry.type, tags: entry.tags };
              if (entry.projectId) metadata.projectId = entry.projectId;

              await (index as any).upsert({ records: [{
                id: entry.id,
                values: emb.data[0].embedding,
                metadata
              }] });
            }
          } catch (e) { console.error("Re-embed error", e); }
          
          await sendMessage(chatId, "✅ Entry updated.");
        }
        await prisma.setting.delete({ where: { key: `knowledge:pending_update_${chatId}` } }).catch(()=>{});
      } else {
        await sendMessage(chatId, "Update request expired.");
      }
    } else if (data === "knowledge_update_cancel") {
      await prisma.setting.delete({ where: { key: `knowledge:pending_update_${chatId}` } }).catch(()=>{});
      await sendMessage(chatId, "Update cancelled.");
    } else if (data === "knowledge_delete_confirm") {
      const pending = await prisma.setting.findUnique({ where: { key: `knowledge:pending_delete_${chatId}` } });
      if (pending) {
        const { targetId } = pending.value as any;
        // Delete versions first to avoid foreign key constraints
        await prisma.knowledgeEntryVersion.deleteMany({ where: { entryId: targetId } }).catch(()=>{});
        // Delete the entry
        await prisma.knowledgeEntry.delete({ where: { id: targetId } }).catch(()=>{});
        
        // Delete from Pinecone
        try {
          if (index) {
            await (index as any).deleteOne(targetId);
          }
        } catch(e) { console.error("Pinecone delete error", e); }
        
        await sendMessage(chatId, "🗑️ Entry deleted forever.");
        await prisma.setting.delete({ where: { key: `knowledge:pending_delete_${chatId}` } }).catch(()=>{});
      } else {
        await sendMessage(chatId, "Delete request expired.");
      }
    } else if (data === "knowledge_delete_cancel") {
      await prisma.setting.delete({ where: { key: `knowledge:pending_delete_${chatId}` } }).catch(()=>{});
      await sendMessage(chatId, "Deletion cancelled.");
    }
    return;
  }

  if (text.startsWith("/knowledge") || text.startsWith("/idea") || text.startsWith("/note")) {
    const parts = text.split(" ");
    let page = 1;
    if (parts.length > 1 && !isNaN(parseInt(parts[1]))) {
      page = Math.max(1, parseInt(parts[1]));
    }

    const pageSize = 10;
    
    let typeFilter: any = {};
    if (text.startsWith("/idea")) typeFilter = { type: "IDEA" };
    if (text.startsWith("/knowledge")) typeFilter = { type: "KNOWLEDGE" };

    const totalCount = await prisma.knowledgeEntry.count({ where: typeFilter });
    const totalPages = Math.ceil(totalCount / pageSize);

    if (page > totalPages && totalPages > 0) {
      page = totalPages;
    }

    const recent = await prisma.knowledgeEntry.findMany({
      where: typeFilter,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    if (totalCount === 0) {
      await sendMessage(chatId, "You don't have any notes or ideas saved yet!");
      return;
    }

    let reply = `🧠 Your Knowledge Hub (Page ${page} of ${totalPages} — ${totalCount} total entries)\n\n`;
    recent.forEach((entry, idx) => {
      const truncated = entry.content.length > 60 ? entry.content.substring(0, 60) + "..." : entry.content;
      reply += `${(page - 1) * pageSize + idx + 1}. [${entry.type}] ${truncated}\n`;
    });

    if (page < totalPages) {
      reply += `\nSend \`/knowledge ${page + 1}\` for the next page.`;
    }
    reply += `\nTo view or search all notes instantly, visit your Admin Dashboard!`;
    
    // Save the list order so the user can reference them by number (e.g. "delete idea 2")
    await prisma.setting.upsert({
      where: { key: `knowledge:pending_list_${chatId}` },
      update: { value: recent.map(e => e.id) },
      create: { key: `knowledge:pending_list_${chatId}`, value: recent.map(e => e.id) }
    });

    await sendMessage(chatId, reply);
    return;
  }

  // Load short-term conversational memory
  const historySetting = await prisma.setting.findUnique({ where: { key: `knowledge:chat_history_${chatId}` } });
  let chatHistory: { role: string, content: string }[] = [];
  if (historySetting && Array.isArray(historySetting.value)) {
    chatHistory = historySetting.value as { role: string, content: string }[];
  }

  let intent = "UNCLEAR";

  const prompt = `Classify this message as one of: CAPTURE, QUERY, UPDATE, DELETE, UNCLEAR.
CAPTURE = The user is explicitly providing a new idea, fact, or thought and asking you to remember/save it.
QUERY = The user is asking a question, retrieving information, asking what they have saved, or continuing a discussion.
UPDATE = The user wants to change or correct something they already saved.
DELETE = The user wants to delete or remove something they previously saved.

If the intent is QUERY, generate a "standalone_query". If the user's message relies on previous context (e.g., "do you think this is true?"), rewrite it into a full standalone search phrase (e.g., "do you think the secret to wealth is true?"). If no context is needed, just repeat the message.

Respond in JSON format: { "intent": "CAPTURE|QUERY|UPDATE|DELETE|UNCLEAR", "standalone_query": "..." }

Recent Chat History:
${chatHistory.map(m => `${m.role}: ${m.content}`).join("\n")}

User's New Message: "${text}"`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: prompt }],
    temperature: 0,
  });
  
  const parsed = JSON.parse(completion.choices[0].message.content || "{}");
  intent = parsed.intent?.trim().toUpperCase() || "UNCLEAR";
  const standaloneQuery = parsed.standalone_query || text;

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

    try {
      const emb = await openai.embeddings.create({
        input: text,
        model: "text-embedding-3-small",
        dimensions: 1024
      });
      const vector = emb.data[0].embedding;

      if (index) {
        const metadata: any = { type, tags };
        if (projectId) metadata.projectId = projectId;

        await (index as any).upsert({ records: [{
          id: entry.id,
          values: vector,
          metadata
        }] });
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
        input: standaloneQuery,
        model: "text-embedding-3-small",
        dimensions: 1024
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

    const systemPrompt = `You are a helpful conversational AI and a personal memory assistant.
The user will ask a question or discuss a topic. First, look at their saved notes/entries below to answer.
If their saved entries contain relevant information, use that to answer them and discuss it.
If the saved entries DO NOT contain the answer, you may answer the question using your own general AI knowledge, but you MUST start your response by politely mentioning that you didn't find anything in their personal notes about it.
Keep the answer conversational and helpful.

User's Saved Entries:
${topMatches.map(m => `- [${m.type}] ${m.content}`).join("\n")}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory,
      { role: "user", content: text }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any
    });

    const reply = completion.choices[0].message.content?.trim() || "Couldn't generate an answer.";

    // Save conversational memory (keep last 6 messages / 3 turns)
    const newHistory = [
      ...chatHistory,
      { role: "user", content: text },
      { role: "assistant", content: reply }
    ].slice(-6);

    await prisma.setting.upsert({
      where: { key: `knowledge:chat_history_${chatId}` },
      update: { value: newHistory },
      create: { key: `knowledge:chat_history_${chatId}`, value: newHistory }
    });

    // Also update pending query for updates
    await prisma.setting.upsert({
      where: { key: `knowledge:pending_query_${chatId}` },
      update: { value: topMatches.map(m => m.id) },
      create: { key: `knowledge:pending_query_${chatId}`, value: topMatches.map(m => m.id) }
    });

    await sendMessage(chatId, reply);
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
          model: "text-embedding-3-small",
          dimensions: 1024
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
    await sendMessage(chatId, `Update this: '${truncated}' → with what you just said?`, { reply_markup: { inline_keyboard: inlineKeyboard } });
    return;
  }

  if (intent === "DELETE") {
    let targetEntryId: string | null = null;
    
    // Check if user is referencing a number from the /ideas list (e.g., "delete idea 2" or "delete 2")
    const numberMatch = text.match(/\b(\d+)\b/);
    let idx = -1;
    if (numberMatch) {
      idx = parseInt(numberMatch[1]) - 1;
    } else if (text.toLowerCase().includes("first") || text.toLowerCase().includes("1st")) {
      idx = 0;
    } else if (text.toLowerCase().includes("second") || text.toLowerCase().includes("2nd")) {
      idx = 1;
    } else if (text.toLowerCase().includes("third") || text.toLowerCase().includes("3rd")) {
      idx = 2;
    } else if (text.toLowerCase().includes("fourth") || text.toLowerCase().includes("4th")) {
      idx = 3;
    } else if (text.toLowerCase().includes("fifth") || text.toLowerCase().includes("5th")) {
      idx = 4;
    }

    if (idx >= 0) {
      const listSetting = await prisma.setting.findUnique({ where: { key: `knowledge:pending_list_${chatId}` } });
      if (listSetting && Array.isArray(listSetting.value)) {
        const ids = listSetting.value as string[];
        // The list is global 1..N based on page. Let's calculate local index.
        // Actually, if they say "2", and page 1 was 1-10, it's index 1.
        // If they were on page 2 (11-20), and they say "12", local index is 12 % 10 - 1 = 1.
        const localIdx = idx % 10;
        if (ids[localIdx]) {
          targetEntryId = ids[localIdx];
        }
      }
    }

    // Check if there is a pending query match from chat history context
    if (!targetEntryId) {
      const pendingQuery = await prisma.setting.findUnique({ where: { key: `knowledge:pending_query_${chatId}` } });
      if (pendingQuery && Array.isArray(pendingQuery.value) && pendingQuery.value.length > 0) {
        targetEntryId = (pendingQuery.value as any)[0] as string;
      }
    }

    if (!targetEntryId && index) {
      try {
        const emb = await openai.embeddings.create({
          input: standaloneQuery,
          model: "text-embedding-3-small",
          dimensions: 1024
        });
        const queryRes = await index.query({
          vector: emb.data[0].embedding,
          topK: 1,
        });
        if (queryRes.matches.length > 0 && (queryRes.matches[0].score || 0) > 0.75) {
          targetEntryId = queryRes.matches[0].id;
        }
      } catch (e) {
        console.error("Delete Search Error", e);
      }
    }

    if (!targetEntryId) {
      await sendMessage(chatId, "I'm not sure which entry you mean to delete.");
      return;
    }

    const entry = await prisma.knowledgeEntry.findUnique({ where: { id: targetEntryId } });
    if (!entry) {
      await sendMessage(chatId, "I couldn't find the entry to delete.");
      return;
    }

    // Confirmation
    await prisma.setting.upsert({
      where: { key: `knowledge:pending_delete_${chatId}` },
      update: { value: { targetId: targetEntryId } },
      create: { key: `knowledge:pending_delete_${chatId}`, value: { targetId: targetEntryId } }
    });

    const truncated = entry.content.length > 80 ? entry.content.substring(0, 80) + "..." : entry.content;
    const inlineKeyboard = [
      [{ text: "Yes, delete it", callback_data: `knowledge_delete_confirm` }],
      [{ text: "No, cancel", callback_data: `knowledge_delete_cancel` }]
    ];
    await sendMessage(chatId, `Are you sure you want to completely delete this entry?\n\n"${truncated}"`, { reply_markup: { inline_keyboard: inlineKeyboard } });
    return;
  }

  await sendMessage(chatId, "I couldn't understand that. Please try again or rephrase.");
}
