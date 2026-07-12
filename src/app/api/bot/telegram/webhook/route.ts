import { NextResponse } from "next/server";
import openai from "@/lib/openai";
import { handleFocusMessage } from "@/lib/focus/handleMessage";
import { handleKnowledgeMessage } from "@/lib/knowledge/handleMessage";

export const dynamic = 'force-dynamic';

const TELEGRAM_TOKEN = process.env.TELEGRAM_SHARED_BOT_TOKEN || process.env.TELEGRAM_FOCUS_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

async function sendMessage(chatId: number, text: string, options: any = {}) {
  if (!TELEGRAM_TOKEN) {
    console.log("Mock Telegram Send (No Token):", text);
    return;
  }
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...options })
  });
}

// Domain Classifier
async function classifyDomain(chatId: number, text: string) {
  const { prisma } = await import("@/lib/prisma");
  const historySetting = await prisma.setting.findUnique({ where: { key: `knowledge:chat_history_${chatId}` } });
  let chatHistory: { role: string, content: string }[] = [];
  if (historySetting && Array.isArray(historySetting.value)) {
    chatHistory = historySetting.value as { role: string, content: string }[];
  }

  const prompt = `Classify this message's domain as one of: TASK, KNOWLEDGE, AMBIGUOUS.
TASK = The user is adding a task, checking off a project, asking for a focus status, or managing their work/schedule.
KNOWLEDGE = The user is asking you a question, having a discussion, saving a new idea/fact, asking what they have saved, or deleting a saved note. CRITICAL: If the user's message mentions the word "idea", "note", or "knowledge" (e.g. "delete idea 2", "save this note"), you MUST classify it as KNOWLEDGE.
AMBIGUOUS = Only use this if it is completely impossible to tell. Use context to make a definitive choice whenever possible.

Recent Chat History (for context):
${chatHistory.map(m => `${m.role}: ${m.content}`).join("\n")}

Return only the single word.

User's New Message: "${text}"`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: prompt }],
    temperature: 0,
    max_tokens: 10
  });

  return completion.choices[0].message.content?.trim().toUpperCase() || "AMBIGUOUS";
}

export async function POST(req: Request) {
  try {
    const update = await req.json();

    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data;
      const chatId = callbackQuery.message.chat.id;

      if (data.startsWith("route_domain_")) {
        const { prisma } = await import("@/lib/prisma");
        const pending = await prisma.setting.findUnique({ where: { key: `pending_domain_routing_${chatId}` } });
        if (!pending) {
          await sendMessage(chatId, "I lost track of what you were talking about. Please try again.");
          return NextResponse.json({ ok: true });
        }
        
        const text = (pending.value as any).text;
        await prisma.setting.delete({ where: { key: `pending_domain_routing_${chatId}` } }).catch(()=>{});

        if (data === "route_domain_task") {
          await handleFocusMessage(chatId, text, sendMessage, req.url);
        } else if (data === "route_domain_knowledge") {
          await handleKnowledgeMessage(chatId, text, sendMessage, req.url);
        }
        return NextResponse.json({ ok: true });
      }

      // Route specific callbacks to their domains
      if (data.startsWith("focus_")) {
        await handleFocusMessage(chatId, `__CALLBACK__${data}`, sendMessage, req.url);
      } else if (data.startsWith("knowledge_")) {
        await handleKnowledgeMessage(chatId, `__CALLBACK__${data}`, sendMessage, req.url);
      }
      
      return NextResponse.json({ ok: true });
    }

    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;

    let domain = "AMBIGUOUS";

    // Direct routing for specific slash commands
    if (text.startsWith("/projects") || text.startsWith("/status")) {
      domain = "TASK";
    } else if (text.startsWith("/knowledge") || text.startsWith("/idea") || text.startsWith("/note")) {
      domain = "KNOWLEDGE";
    } else {
      domain = await classifyDomain(chatId, text);
    }

    if (domain === "TASK") {
      await handleFocusMessage(chatId, text, sendMessage, req.url);
    } else if (domain === "KNOWLEDGE") {
      await handleKnowledgeMessage(chatId, text, sendMessage, req.url);
    } else {
      // AMBIGUOUS
      const { prisma } = await import("@/lib/prisma");
      await prisma.setting.upsert({
        where: { key: `pending_domain_routing_${chatId}` },
        update: { value: { text } },
        create: { key: `pending_domain_routing_${chatId}`, value: { text } }
      });
      
      const inlineKeyboard = [
        [{ text: "Task/Project", callback_data: `route_domain_task` }],
        [{ text: "Idea/Knowledge", callback_data: `route_domain_knowledge` }]
      ];
      await sendMessage(chatId, "Is this about a task/project, or something to save?", { reply_markup: { inline_keyboard: inlineKeyboard } });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Shared Telegram Webhook Error:", error);
    return NextResponse.json({ ok: true });
  }
}
