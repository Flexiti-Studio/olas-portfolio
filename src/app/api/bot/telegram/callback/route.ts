import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { switchFocus } from "@/lib/focus/focus";
import { handleFocusMessage } from "@/lib/focus/handleMessage";
import { handleKnowledgeMessage } from "@/lib/knowledge/handleMessage";
import { Pinecone } from "@pinecone-database/pinecone";
import openai from "@/lib/openai";

export const dynamic = 'force-dynamic';

const TELEGRAM_TOKEN = process.env.TELEGRAM_SHARED_BOT_TOKEN || process.env.TELEGRAM_FOCUS_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  if (!TELEGRAM_TOKEN) return;
  await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  });
}

async function editMessageText(chatId: number, messageId: number, text: string) {
  if (!TELEGRAM_TOKEN) return;
  await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text })
  });
}

async function sendMessage(chatId: number, text: string, options: any = {}) {
  if (!TELEGRAM_TOKEN) return;
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...options })
  });
}

export async function POST(req: Request) {
  try {
    const update = await req.json();

    if (!update.callback_query) {
      return NextResponse.json({ ok: true });
    }

    const callbackQuery = update.callback_query;
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    // --- Domain Routing Callbacks ---
    if (data.startsWith("route_domain_")) {
      const domain = data.replace("route_domain_", "");
      const pendingText = await prisma.setting.findUnique({ where: { key: `pending_domain_routing_${chatId}` } });
      if (pendingText) {
        const { text } = pendingText.value as any;
        await editMessageText(chatId, messageId, `Routing to ${domain}...`);
        if (domain === "task") {
          await handleFocusMessage(chatId, text, sendMessage, req.url);
        } else if (domain === "knowledge") {
          await handleKnowledgeMessage(chatId, text, sendMessage, req.url);
        }
        await prisma.setting.delete({ where: { key: `pending_domain_routing_${chatId}` } });
      } else {
        await editMessageText(chatId, messageId, "Session expired for this message.");
      }
      await answerCallbackQuery(callbackQuery.id);
      return NextResponse.json({ ok: true });
    }

    // --- Knowledge Callbacks ---
    if (data === "knowledge_update_confirm") {
      const pendingUpdate = await prisma.setting.findUnique({ where: { key: `knowledge:pending_update_${chatId}` } });
      if (!pendingUpdate) {
        await answerCallbackQuery(callbackQuery.id, "Session expired.");
        await editMessageText(chatId, messageId, "This update confirmation has expired.");
        return NextResponse.json({ ok: true });
      }
      
      const { targetId, newContent } = pendingUpdate.value as any;
      const entry = await prisma.knowledgeEntry.findUnique({ where: { id: targetId } });
      
      if (entry) {
        // Create Version
        await prisma.knowledgeEntryVersion.create({
          data: { entryId: entry.id, content: entry.content }
        });
        
        // Update Content
        await prisma.knowledgeEntry.update({
          where: { id: entry.id },
          data: { content: newContent }
        });

        // Update Pinecone
        const pc = process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== "pinecone_key_placeholder"
          ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
          : null;
        const index = pc?.index(process.env.PINECONE_INDEX || "knowledge_index");
        
        if (index) {
          const emb = await openai.embeddings.create({ input: newContent, model: "text-embedding-3-small" });
          await (index as any).upsert([{
            id: entry.id,
            values: emb.data[0].embedding,
            metadata: { type: entry.type, tags: entry.tags, projectId: entry.projectId }
          }]);
        }

        await editMessageText(chatId, messageId, "✅ Entry updated.");
      }
      
      await prisma.setting.delete({ where: { key: `knowledge:pending_update_${chatId}` } });
      await answerCallbackQuery(callbackQuery.id);
      return NextResponse.json({ ok: true });
    }

    if (data === "knowledge_update_cancel") {
      await prisma.setting.delete({ where: { key: `knowledge:pending_update_${chatId}` } });
      await editMessageText(chatId, messageId, "Update cancelled.");
      await answerCallbackQuery(callbackQuery.id);
      return NextResponse.json({ ok: true });
    }

    // --- Focus Callbacks ---
    if (data.startsWith("focus_done_")) {
      const taskId = data.replace("focus_done_", "");
      const host = new URL(req.url).host || "localhost:3000";
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      
      const res = await fetch(`${protocol}://${host}/api/focus/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true })
      });
      const json = await res.json();
      
      if (json.success) {
        if (json.data.projectCompleted) {
          await editMessageText(chatId, messageId, `🎉 Marked done! The project is now complete. Use /projects to pick your next focus.`);
        } else {
          await editMessageText(chatId, messageId, `✅ Marked done: ${json.data.task.title}`);
        }
      } else {
        await editMessageText(chatId, messageId, "Failed to complete task.");
      }
      await answerCallbackQuery(callbackQuery.id);
      return NextResponse.json({ ok: true });
    }

    if (data === "focus_switch_force") {
      const pendingSetting = await prisma.setting.findUnique({ where: { key: `focus:pending_switch_${chatId}` } });
      if (!pendingSetting) {
        await answerCallbackQuery(callbackQuery.id, "Session expired.");
        await editMessageText(chatId, messageId, "This confirmation has expired.");
        return NextResponse.json({ ok: true });
      }

      const { targetId } = pendingSetting.value as any;
      await switchFocus(targetId, { force: true });
      
      const p = await prisma.project.findUnique({ where: { id: targetId } });
      await editMessageText(chatId, messageId, `Focus switched to: ${p?.name}`);
      await prisma.setting.delete({ where: { key: `focus:pending_switch_${chatId}` } });
      
      await answerCallbackQuery(callbackQuery.id);
      return NextResponse.json({ ok: true });
    }

    if (data === "focus_switch_cancel") {
      await prisma.setting.delete({ where: { key: `focus:pending_switch_${chatId}` } });
      await editMessageText(chatId, messageId, "Focus switch cancelled.");
      await answerCallbackQuery(callbackQuery.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Shared Telegram Callback Error:", error);
    return NextResponse.json({ ok: true });
  }
}
