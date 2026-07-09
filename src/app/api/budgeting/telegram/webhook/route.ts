import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BUDGET_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: replyMarkup
    })
  });
}

// Intent Classifier
async function classifyIntent(text: string) {
  const prompt = `Classify this Telegram message as one of: EXPENSE, COMMAND, ADVISOR, UNCLEAR.
EXPENSE = user is describing a purchase or money spent.
COMMAND = starts with "/" or is a direct instruction like "show my balance".
ADVISOR = asking for help reallocating, being more efficient, understanding spending patterns, or getting budget advice — NOT logging a purchase.
Return only the single word.

Message: "${text}"`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1
  });

  return completion.choices[0].message.content?.trim().toUpperCase() || "UNCLEAR";
}

// Extract expense
async function extractExpense(text: string, subcategories: any[]) {
  const subcatList = subcategories.map(s => `${s.category.name} > ${s.name}`).join("\n");
  const prompt = `You extract structured expense data from a short message. The user is logging a personal purchase in Nigerian Naira.

Known subcategories (format: "Category > Subcategory"):
${subcatList}

Given the message, return ONLY valid JSON, no other text, in this exact shape:
{
  "amount": number,               // in Naira, no currency symbol
  "subcategory": string,          // must exactly match one from the known list above, or null
  "confidence": number,           // 0.0–1.0
  "description": string           // short cleaned-up description
}

Rules:
- If the message doesn't clearly state an amount, set "amount" to null.
- If no subcategory is a good match, set "subcategory" to null and confidence to 0.
- Never invent a subcategory not in the known list.

Message: "${text}"`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.1
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

export async function POST(req: Request) {
  try {
    const update = await req.json();
    if (!update.message || !update.message.text) {
      // Ignore non-text messages for now (transcription hook goes here)
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;

    const intent = await classifyIntent(text);

    if (intent === "COMMAND") {
      if (text.startsWith("/balance")) {
        const balances = await prisma.bankAccount.findMany();
        const msg = balances.map(b => `${b.name}: ₦${Number(b.balance).toLocaleString()}`).join("\n") || "No accounts found.";
        await sendMessage(chatId, `Balances:\n${msg}`);
      } else if (text.startsWith("/status")) {
        await sendMessage(chatId, "Status command invoked (TODO: implement category rollup)");
      } else if (text.startsWith("/reallocate")) {
        const host = req.headers.get("host");
        const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
        
        let sourceGoals;
        const overridesText = text.replace("/reallocate", "").trim();
        if (overridesText) {
          const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
          const activeGoals = config?.activePeriodId ? await prisma.budgetGoal.findMany({ where: { periodId: config.activePeriodId }, include: { subcategory: true } }) : [];
          
          sourceGoals = activeGoals.map(g => ({ subcategoryId: g.subcategoryId, amount: Number(g.amount) }));
          
          const overrides = overridesText.split(',').map((s: string) => s.trim());
          for (const o of overrides) {
            const [subName, amtStr] = o.split('=');
            if (subName && amtStr) {
              const matchedSubcat = activeGoals.find(g => g.subcategory.name.toLowerCase() === subName.trim().toLowerCase());
              if (matchedSubcat) {
                const targetGoal = sourceGoals.find(sg => sg.subcategoryId === matchedSubcat.subcategoryId);
                if (targetGoal) {
                   targetGoal.amount = Number(amtStr);
                }
              }
            }
          }
        }
        
        const res = await fetch(`${protocol}://${host}/api/budgeting/strategy/period`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            triggeredBy: "manual",
            sourceGoals
          })
        });
        
        const json = await res.json();
        if (json.success) {
           await sendMessage(chatId, `Successfully reallocated! Started a new period: ${json.data.period.label}`);
        } else {
           await sendMessage(chatId, `Failed to reallocate: ${json.error?.message}`);
        }
      } else if (text.startsWith("/digest")) {
        const host = req.headers.get("host") || "localhost:3000";
        const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
        
        await sendMessage(chatId, "Generating digest...");
        
        // Dynamic import to avoid circular dependencies or weird edge issues in webhook
        const { sendDigest } = await import("@/lib/budgeting/sendDigest");
        
        const result = await sendDigest(host, protocol);
        
        if (result.success) {
           await sendMessage(chatId, "Sent — check your inbox");
        } else {
           await sendMessage(chatId, `Failed to send digest: ${result.error?.message}`);
        }
      } else {
        await sendMessage(chatId, "Recognized as a command, but unknown command.");
      }
      return NextResponse.json({ ok: true });
    }

    if (intent === "UNCLEAR") {
      await sendMessage(chatId, "I couldn't understand that. Please rephrase as a purchase or a recognized command.");
      return NextResponse.json({ ok: true });
    }

    if (intent === "ADVISOR") {
      const host = req.headers.get("host");
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      
      await sendMessage(chatId, "Analyzing your recent spending patterns...");

      const res = await fetch(`${protocol}://${host}/api/budgeting/advisor/suggest`, {
        method: "POST"
      });
      const json = await res.json();
      
      if (!json.success) {
        await sendMessage(chatId, json.error?.message || "Failed to analyze history.");
        return NextResponse.json({ ok: true });
      }

      const proposal = json.data;
      
      let reply = `Here's what I'm seeing:\n\n`;
      for (const r of proposal.reasoning || []) {
        reply += `- ${r}\n`;
      }
      
      if (proposal.proposedChanges && proposal.proposedChanges.length > 0) {
        reply += `\nProposed changes:\n`;
        for (const c of proposal.proposedChanges) {
          reply += `${c.name}: ₦${c.currentGoal.toLocaleString()} → ₦${c.proposedGoal.toLocaleString()}\n`;
        }
      } else {
        reply += `\nNo changes proposed.\n`;
      }
      
      if (proposal.summary) {
        reply += `\n${proposal.summary}\n`;
      }

      await prisma.setting.upsert({
        where: { key: `pending_advisor_${chatId}` },
        update: { value: proposal },
        create: { key: `pending_advisor_${chatId}`, value: proposal }
      });

      const inlineKeyboard = [
        [{ text: "Confirm", callback_data: "advisor_confirm" }, { text: "Edit", callback_data: "advisor_edit" }, { text: "Cancel", callback_data: "advisor_cancel" }]
      ];

      await sendMessage(chatId, reply, { inline_keyboard: inlineKeyboard });
      return NextResponse.json({ ok: true });
    }

    // EXPENSE
    const allSubcats = await prisma.subcategory.findMany({ include: { category: true } });
    const parsed = await extractExpense(text, allSubcats);

    if (parsed.amount === null || parsed.amount === undefined) {
      await sendMessage(chatId, "I couldn't find an amount. Please clarify the amount.");
      return NextResponse.json({ ok: true });
    }

    if (parsed.confidence >= 0.75 && parsed.subcategory) {
      // Proceed directly
      const subcatName = parsed.subcategory.split(" > ")[1];
      const matchedSubcat = allSubcats.find(s => s.name.toLowerCase() === subcatName?.toLowerCase());
      
      if (!matchedSubcat) {
        await sendMessage(chatId, `Failed to match subcategory ${parsed.subcategory}.`);
        return NextResponse.json({ ok: true });
      }

      // Hit transaction API internally
      const host = req.headers.get("host");
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      const txRes = await fetch(`${protocol}://${host}/api/budgeting/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subcategoryId: matchedSubcat.id,
          amount: parsed.amount,
          rawText: text,
          source: "telegram"
        })
      });

      const txJson = await txRes.json();
      if (!txJson.success) {
        await sendMessage(chatId, `Error logging transaction: ${txJson.error?.message}`);
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
        await sendMessage(chatId, reply);
      }
    } else {
      // Confidence < 0.75: Ask for confirmation using Inline Keyboard
      // Save pending tx to settings
      await prisma.setting.upsert({
        where: { key: `pending_tx_${chatId}` },
        update: { value: { amount: parsed.amount, rawText: text, desc: parsed.description } },
        create: { key: `pending_tx_${chatId}`, value: { amount: parsed.amount, rawText: text, desc: parsed.description } }
      });

      // Suggest top 3 subcategories based on simple string match or just arbitrary ones for now
      // Since LLM provides 'parsed.subcategory' as top choice, we'll put it first, then 2 others.
      const suggestions = allSubcats.slice(0, 3); 
      
      const inlineKeyboard = suggestions.map(s => ([{ text: s.name, callback_data: `subcat_${s.id}` }]));
      inlineKeyboard.push([{ text: "Something else...", callback_data: "subcat_other" }]);

      await sendMessage(chatId, `I see ₦${parsed.amount}, but I'm not sure which category. Where does this belong?`, {
        inline_keyboard: inlineKeyboard
      });
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ ok: true }); // Always 200 OK to Telegram to avoid retries
  }
}
