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
async function classifyDomain(text: string) {
  const prompt = `Classify this message's domain as one of: TASK, KNOWLEDGE, AMBIGUOUS.
TASK = about projects, tasks, checking things off, or focus/priority.
KNOWLEDGE = about saving, recalling, or updating an idea or piece of information.
AMBIGUOUS = genuinely unclear which this is, or could be either.
Return only the single word.

Message: "${text}"`;

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

    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;

    let domain = "AMBIGUOUS";

    // Direct routing for specific slash commands
    if (text.startsWith("/projects") || text.startsWith("/status")) {
      domain = "TASK";
    } else {
      domain = await classifyDomain(text);
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
      await sendMessage(chatId, "Is this about a task/project, or something to save?", { inline_keyboard: inlineKeyboard });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Shared Telegram Webhook Error:", error);
    return NextResponse.json({ ok: true });
  }
}
