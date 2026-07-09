import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BUDGET_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

async function sendMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  });
}

async function editMessageText(chatId: number, messageId: number, text: string) {
  await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: text })
  });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text })
  });
}

export async function POST(req: Request) {
  try {
    const update = await req.json();
    
    if (!update.callback_query) {
      return NextResponse.json({ ok: true });
    }

    const callbackQuery = update.callback_query;
    const data = callbackQuery.data; // "subcat_<id>" or "subcat_other"
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    if (data === "subcat_other") {
      // User tapped "Something else..."
      // In a real implementation, you'd edit the message to show a full list of categories, 
      // or send a new message asking them to type the exact category name.
      await answerCallbackQuery(callbackQuery.id);
      await editMessageText(chatId, messageId, "Please type the exact subcategory you meant, or try your message again.");
      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("subcat_")) {
      const subcategoryId = data.replace("subcat_", "");
      
      // Fetch pending transaction
      const pendingSetting = await prisma.setting.findUnique({ where: { key: `pending_tx_${chatId}` } });
      if (!pendingSetting) {
        await answerCallbackQuery(callbackQuery.id, "Session expired or not found.");
        await editMessageText(chatId, messageId, "This pending transaction has expired. Please send it again.");
        return NextResponse.json({ ok: true });
      }

      const pendingTx = pendingSetting.value as any;

      await answerCallbackQuery(callbackQuery.id, "Processing...");
      
      // Hit transaction API internally
      const host = req.headers.get("host");
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      const txRes = await fetch(`${protocol}://${host}/api/budgeting/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subcategoryId: subcategoryId,
          amount: pendingTx.amount,
          rawText: pendingTx.rawText,
          source: "telegram"
        })
      });

      const txJson = await txRes.json();
      if (!txJson.success) {
        await editMessageText(chatId, messageId, `Error logging transaction: ${txJson.error?.message}`);
      } else {
        const { amount, subcategoryName, categoryName, remainingSubcategory, remainingCategory, advice, hasGoal } = txJson.data;
        let reply = `₦${amount.toLocaleString()} logged to ${subcategoryName}.\n`;
        if (hasGoal) {
          reply += `₦${remainingSubcategory.toLocaleString()} left in ${subcategoryName}.\n`;
          reply += `₦${remainingCategory.toLocaleString()} left in ${categoryName} overall.\n`;
          if (advice) reply += `\n${advice}`;
        } else {
          reply += "No goal set for this yet.";
        }
        await editMessageText(chatId, messageId, reply);
        
        // Clean up pending transaction
        await prisma.setting.delete({ where: { key: `pending_tx_${chatId}` } });
      }
    }

    if (data === "advisor_cancel") {
      await answerCallbackQuery(callbackQuery.id);
      await prisma.setting.delete({ where: { key: `pending_advisor_${chatId}` } });
      await editMessageText(chatId, messageId, "Reallocation proposal cancelled.");
      return NextResponse.json({ ok: true });
    }

    if (data === "advisor_edit") {
      await answerCallbackQuery(callbackQuery.id);
      await editMessageText(chatId, messageId, "Please reply with your changes using the /reallocate command, e.g. /reallocate Groceries=20000");
      return NextResponse.json({ ok: true });
    }

    if (data === "advisor_confirm") {
      const pendingSetting = await prisma.setting.findUnique({ where: { key: `pending_advisor_${chatId}` } });
      if (!pendingSetting) {
        await answerCallbackQuery(callbackQuery.id, "Proposal expired.");
        await editMessageText(chatId, messageId, "This proposal has expired. Please ask for advice again.");
        return NextResponse.json({ ok: true });
      }

      await answerCallbackQuery(callbackQuery.id, "Reallocating...");
      
      const proposal = pendingSetting.value as any;
      const host = req.headers.get("host");
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      
      const res = await fetch(`${protocol}://${host}/api/budgeting/advisor/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedChanges: proposal.proposedChanges || [] })
      });
      
      const json = await res.json();
      if (json.success) {
        await editMessageText(chatId, messageId, `Successfully reallocated! Started a new period: ${json.data.period?.label}`);
        await prisma.setting.delete({ where: { key: `pending_advisor_${chatId}` } });
      } else {
        await editMessageText(chatId, messageId, `Failed to reallocate: ${json.error?.message}`);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram Callback Error:", error);
    return NextResponse.json({ ok: true });
  }
}
