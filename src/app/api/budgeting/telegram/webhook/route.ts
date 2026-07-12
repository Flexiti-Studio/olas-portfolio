import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BUDGET_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

async function sendMessage(chatId: number, text: string, replyMarkup?: any, parseMode?: string) {
  const res = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: replyMarkup,
      parse_mode: parseMode
    })
  });
  
  const json = await res.json();
  if (!json.ok && parseMode) {
     // If it failed because of Markdown parsing, fallback to plain text
     console.warn("Telegram Send Error with Markdown, falling back to plain text:", json);
     await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         chat_id: chatId,
         text: text,
         reply_markup: replyMarkup
       })
     });
  } else if (!json.ok) {
     console.error("Telegram Send Error:", json);
  }
}

// Intent Classifier
async function classifyIntent(text: string) {
const prompt = `Classify this Telegram message as one of: EXPENSE, INCOME, TRANSFER, COMMAND, STATUS, ADVISOR, CONVERSATION, ADDSUBCAT, EDITINCOME, DELETESUBCAT, DELETEINCOME, UNCLEAR.
EXPENSE = user is describing a purchase or money spent.
INCOME = user got paid, received money, or added a new source of income.
TRANSFER = user moved money from one bank/account to another.
COMMAND = starts with "/" or is a direct instruction like "show my balance".
STATUS = user asks for their current budget strategy, allocations, remaining balances, or how much they have left in categories.
ADVISOR = asking for help reallocating, being more efficient, understanding spending patterns, or getting budget advice — NOT logging a purchase.
ADDSUBCAT = user wants to add or create a new subcategory under a parent category (e.g. "add subcat Gym under Wants").
DELETESUBCAT = user wants to delete, remove, or drop a subcategory (e.g. "delete subcat Gym", "remove Personal Care").
EDITINCOME = user wants to change, update, or edit the amount of an existing income source (e.g. "change my salary to 500k", "update Qefas income to 30k").
DELETEINCOME = user wants to delete, remove, or drop an income source (e.g. "delete Qefas income", "remove salary").
CONVERSATION = general chat, greetings, "hi", "how are you".
UNCLEAR = anything else.

Message: "${text}"
Output exactly ONE word.`;

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
  "description": string,          // short cleaned-up description
  "bank": string | null           // extract the name of the bank/payment method if mentioned (e.g., "Monzo", "GTBank"), otherwise null
}

Rules:
- If the message doesn't clearly state an amount, set "amount" to null.
- If no subcategory is a good match, set "subcategory" to null and confidence to 0.
- Never invent a subcategory not in the known list.
- If no bank is mentioned, set "bank" to null.

Message: "${text}"`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.1
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

// Extract income
async function extractIncome(text: string, banks: any[], incomeCategories: any[]) {
  const bankList = banks.map(b => b.name).join("\n");
  const catList = incomeCategories.map(c => c.name).join("\n");
  const prompt = `Extract income data from this message. The user is adding income.
  
Known Banks:
${bankList}

Known Income Categories:
${catList}

Return ONLY valid JSON:
{
  "amount": number,
  "bankName": string | null,     // Try to match a known bank, or extract the new one
  "incomeCategory": string,      // Try to match a known category, or extract the new one
  "description": string
}

Message: "${text}"`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.1
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

// Extract transfer
async function extractTransfer(text: string, banks: any[]) {
  const bankList = banks.map(b => b.name).join("\n");
  const prompt = `Extract money transfer data from this message.

Known Banks:
${bankList}

Return ONLY valid JSON:
{
  "amount": number,
  "fromBank": string,  // must closely match a known bank
  "toBank": string,    // must closely match a known bank
  "note": string
}

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

    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data;
      const chatId = callbackQuery.message.chat.id;

      if (data === "advisor_confirm") {
        const pending = await prisma.setting.findUnique({ where: { key: `pending_advisor_${chatId}` } });
        if (pending) {
          const proposal = pending.value as any;
          const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
          if (config?.activePeriodId) {
             const activeGoals = await prisma.budgetGoal.findMany({ where: { periodId: config.activePeriodId } });
             for (const c of proposal.proposedChanges || []) {
                const goal = activeGoals.find(g => g.subcategoryId === c.subcategoryId);
                if (goal) {
                   await prisma.budgetGoal.update({ where: { id: goal.id }, data: { amount: c.proposedGoal } });
                }
             }
          }
          if (proposal.proposedStrategy) {
             await prisma.setting.upsert({
               where: { key: "budget_strategy" },
               update: { value: proposal.proposedStrategy },
               create: { key: "budget_strategy", value: proposal.proposedStrategy }
             });
          }
          await sendMessage(chatId, "Great! I've updated your budget goals" + (proposal.proposedStrategy ? " and adjusted your global strategy." : "."));
          await prisma.setting.delete({ where: { key: `pending_advisor_${chatId}` } }).catch(()=> {});
        } else {
          await sendMessage(chatId, "Sorry, I couldn't find the pending changes. They might have expired.");
        }
      } else if (data === "advisor_cancel") {
        await prisma.setting.delete({ where: { key: `pending_advisor_${chatId}` } }).catch(() => {});
        await sendMessage(chatId, "No changes made to your budget.");
      } else if (data === "advisor_edit") {
        await sendMessage(chatId, "Which category would you like to edit? (e.g. '/reallocate Groceries=5000')");
      }
      if (data.startsWith("subcat_")) {
        const subcatId = data.replace("subcat_", "");
        if (subcatId === "other") {
          await sendMessage(chatId, "Okay, please type your expense again with a clearer category.");
        } else {
          const pending = await prisma.setting.findUnique({ where: { key: `pending_tx_${chatId}` } });
          if (pending) {
            const txData = pending.value as any;
            const host = req.headers.get("host");
            const protocol = req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "development" ? "http" : "https");
            const txRes = await fetch(`${protocol}://${host}/api/budgeting/transaction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subcategoryId: subcatId,
                amount: txData.amount,
                rawText: txData.rawText,
                source: "telegram",
                bankName: txData.bank
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
              }
              await sendMessage(chatId, reply);
            }
            await prisma.setting.delete({ where: { key: `pending_tx_${chatId}` } }).catch(() => {});
          } else {
            await sendMessage(chatId, "Sorry, I lost the pending transaction. Please try logging it again.");
          }
        }
      }

      if (data.startsWith("income_recurring_")) {
        const incomeId = data.replace("income_recurring_", "");
        try {
          await prisma.income.update({ where: { id: incomeId }, data: { isRecurring: true } });
          await sendMessage(chatId, "Got it! This income is marked as recurring and will automatically be included in your future monthly pools.");
        } catch (e) {
          await sendMessage(chatId, "Failed to update income.");
        }
      } else if (data.startsWith("income_onetime_")) {
        await sendMessage(chatId, "Got it! Recorded as a one-time income for this month only.");
      }

      return NextResponse.json({ ok: true });
    }

    if (!update.message || !update.message.text) {
      // Ignore non-text messages for now (transcription hook goes here)
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;

    let intent = await classifyIntent(text);

    if (intent === "COMMAND") {
      if (text.startsWith("/balance")) {
        const balances = await prisma.bankAccount.findMany();
        const msg = balances.map(b => `${b.name}: ₦${Number(b.balance).toLocaleString()}`).join("\n") || "No accounts found.";
        await sendMessage(chatId, `Balances:\n${msg}`);
      } else if (text.replace(" ", "").startsWith("/status")) {
        intent = "STATUS"; // Let the STATUS block handle it

      } else if (text.replace(" ", "").startsWith("/reallocate")) {
        const host = req.headers.get("host");
        const protocol = req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "development" ? "http" : "https");
        
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
        const protocol = req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "development" ? "http" : "https");
        
        await sendMessage(chatId, "Generating digest...");
        
        // Dynamic import to avoid circular dependencies or weird edge issues in webhook
        const { sendDigest } = await import("@/lib/budgeting/sendDigest");
        
        const result = await sendDigest(host, protocol);
        
        if (result.success) {
           await sendMessage(chatId, "Sent — check your inbox");
        } else {
           await sendMessage(chatId, `Failed to send digest: ${result.error?.message}`);
        }
      } else if (text.startsWith("/addbank")) {
        const parts = text.replace("/addbank", "").trim().split(" ");
        const balanceStr = parts.pop();
        const balance = Number(balanceStr);
        const bankName = parts.join(" ").trim();
        if (bankName && !isNaN(balance)) {
           try {
             await prisma.bankAccount.create({ data: { name: bankName, balance } });
             await sendMessage(chatId, `Added bank ${bankName} with starting balance ₦${balance.toLocaleString()}.`);
           } catch (e: any) {
             await sendMessage(chatId, `Failed to add bank. It might already exist.`);
           }
        } else {
           await sendMessage(chatId, "Usage: /addbank <Name> <StartingBalance>\nExample: /addbank Monzo 50000");
        }
      } else if (text.startsWith("/start") || text.startsWith("/help")) {
        await sendMessage(chatId, "Hi! I'm your Flexiti Budget Bot. 🤖\n\nYou can log expenses by simply typing what you bought (e.g., 'Groceries for 5000').\n\nYou can also use commands like /balance, /status, /addbank, /reallocate, or /digest, or just chat with me for budgeting advice!");
      } else {
        await sendMessage(chatId, "I recognized that as a command, but I'm not sure which one. Try /balance, /status, /addbank, /reallocate, or /digest.");
      }
      
      if (intent !== "STATUS") {
        return NextResponse.json({ ok: true });
      }
    }

    if (intent === "CONVERSATION" || intent === "UNCLEAR") {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are the Flexiti Budget Bot, a friendly and concise financial assistant. Respond conversationally to the user's message. If they ask a general question, answer it. If they are just greeting, say hi back and remind them you can help track expenses or give budget advice." },
          { role: "user", content: text }
        ],
        temperature: 0.7
      });
      const reply = response.choices[0].message.content || "I'm here to help with your budget!";
      await sendMessage(chatId, reply);
      return NextResponse.json({ ok: true });
    }

    if (intent === "STATUS") {
      const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
      if (!config || !config.activePeriodId) {
        await sendMessage(chatId, "You don't have an active budget period set up.");
        return NextResponse.json({ ok: true });
      }

      const host = req.headers.get("host");
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      const res = await fetch(`${protocol}://${host}/api/budgeting/strategy?periodId=${config.activePeriodId}`);
      const json = await res.json();

      if (!json.success) {
         await sendMessage(chatId, "Error fetching your budget status.");
         return NextResponse.json({ ok: true });
      }

      const data = json.data;
      const strategyData = data.strategy || { needs: 50, savings: 20, wants: 30 };

      // If they explicitly typed a command, give the full breakdown
      if (text.trim().startsWith("/")) {
        let reply = `📊 *Budget Strategy Status*\n\n`;
        reply += `💰 *Total Income*: ₦${(data.totalIncome || 0).toLocaleString()}\n`;
        reply += `🎯 *50/30/20 Target*: Needs (${strategyData.needs}%) | Savings (${strategyData.savings}%) | Wants (${strategyData.wants}%)\n\n`;
        
        for (const groupName of ["NEEDS", "SAVINGS", "WANTS"]) {
           const g = data.groups[groupName];
           reply += `*${groupName}*: ₦${g.totalActual.toLocaleString()} spent / ₦${g.totalGoal.toLocaleString()} goal\n`;
           
           for (const cat of g.categories) {
              let catHeaderPrinted = false;
              for (const sub of cat.subcategories) {
                if (sub.goal > 0 || sub.actual > 0) {
                   if (!catHeaderPrinted) {
                      reply += `  _${cat.name}_\n`;
                      catHeaderPrinted = true;
                   }
                   const sign = sub.remaining >= 0 ? "left" : "over";
                   reply += `    - ${sub.name}: ₦${Math.abs(sub.remaining).toLocaleString()} ${sign}\n`;
                }
              }
           }
           reply += `\n`;
        }
        
        await sendMessage(chatId, reply, undefined, "Markdown");
      } else {
        // Natural language query: Let GPT answer it using the budget data
        const payloadToAI = {
          totalIncome: data.totalIncome,
          strategy: strategyData,
          groups: data.groups
        };

        const systemPrompt = `You are a financial assistant. The user is asking a specific question about their budget.
Here is their current budget data (JSON):
${JSON.stringify(payloadToAI)}

Answer the user's question concisely in 1-3 sentences. Do not dump all the data. Only tell them what they asked for. Use Naira (₦) for amounts.`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
          ],
          temperature: 0.3
        });
        
        const aiReply = response.choices[0].message.content || "I couldn't find the answer to that in your current budget.";
        await sendMessage(chatId, aiReply);
      }
      
      return NextResponse.json({ ok: true });
    }

    if (intent === "ADVISOR") {
      const host = req.headers.get("host");
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      
      await sendMessage(chatId, "Analyzing your recent spending patterns...");

      const res = await fetch(`${protocol}://${host}/api/budgeting/advisor/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: text })
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
        reply += `\nProposed goal changes:\n`;
        for (const c of proposal.proposedChanges) {
          reply += `${c.name}: ₦${c.currentGoal.toLocaleString()} → ₦${c.proposedGoal.toLocaleString()}\n`;
        }
      } else {
        reply += `\nNo goal changes proposed.\n`;
      }
      
      if (proposal.proposedStrategy) {
        reply += `\nRecommended Strategy Shift:\nNeeds: ${proposal.proposedStrategy.needs}% | Savings: ${proposal.proposedStrategy.savings}% | Wants: ${proposal.proposedStrategy.wants}%\n`;
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

    if (intent === "ADDSUBCAT") {
      await sendMessage(chatId, "⏳ Creating subcategory...");
      
      const parsePrompt = `Extract the target Category and new Subcategory to create from this message.
Valid base categories are usually NEEDS, SAVINGS, WANTS.
Return ONLY valid JSON: { "categoryName": string, "subcategoryName": string }
Message: "${text}"`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: parsePrompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (!parsed.categoryName || !parsed.subcategoryName) {
         await sendMessage(chatId, "I couldn't understand the category and subcategory names. Please try again (e.g. 'Add subcategory Gym to Wants').");
         return NextResponse.json({ ok: true });
      }

      const categories = await prisma.category.findMany();
      // Simple case-insensitive match
      const matchedCat = categories.find(c => c.name.toLowerCase() === parsed.categoryName.toLowerCase() || c.group.toLowerCase() === parsed.categoryName.toLowerCase());

      if (!matchedCat) {
         await sendMessage(chatId, `I couldn't find a base category matching '${parsed.categoryName}'. Known categories: ${categories.map(c=>c.name).join(", ")}`);
         return NextResponse.json({ ok: true });
      }

      const host = req.headers.get("host");
      const protocol = req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "development" ? "http" : "https");
      
      const res = await fetch(`${protocol}://${host}/api/budgeting/subcategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: matchedCat.id, name: parsed.subcategoryName })
      });

      const json = await res.json();
      if (json.success) {
         await sendMessage(chatId, `✅ Successfully added subcategory '${parsed.subcategoryName}' under '${matchedCat.name}'.`);
      } else {
         await sendMessage(chatId, `❌ Failed to add subcategory: ${json.error?.message}`);
      }
      return NextResponse.json({ ok: true });
    }

    if (intent === "EDITINCOME") {
      await sendMessage(chatId, "⏳ Updating income...");
      
      const parsePrompt = `Extract the name of the income category and the new amount the user wants to set.
Return ONLY valid JSON: { "incomeCategoryName": string, "newAmount": number }
Message: "${text}"`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: parsePrompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (!parsed.incomeCategoryName || !parsed.newAmount) {
         await sendMessage(chatId, "I couldn't understand which income to update or the new amount. Please try again (e.g. 'Change Qefas pallative to 30000').");
         return NextResponse.json({ ok: true });
      }

      // Find the most recent income matching this category name
      const incomes = await prisma.income.findMany({
        include: { incomeCategory: true },
        orderBy: { createdAt: 'desc' }
      });
      
      const matchedIncome = incomes.find(inc => 
        inc.incomeCategory.name.toLowerCase().includes(parsed.incomeCategoryName.toLowerCase()) || 
        parsed.incomeCategoryName.toLowerCase().includes(inc.incomeCategory.name.toLowerCase())
      );

      if (!matchedIncome) {
         await sendMessage(chatId, `I couldn't find an existing income matching '${parsed.incomeCategoryName}'.`);
         return NextResponse.json({ ok: true });
      }

      try {
        const diff = parsed.newAmount - Number(matchedIncome.amount);
        
        await prisma.$transaction(async (tx) => {
          await tx.income.update({
            where: { id: matchedIncome.id },
            data: { amount: parsed.newAmount }
          });
          
          if (matchedIncome.bankAccountId) {
            await tx.bankAccount.update({
              where: { id: matchedIncome.bankAccountId },
              data: { balance: { increment: diff } }
            });
          }
        });

        // Rebalance
        const { autoBalanceCurrentPeriod } = await import("@/lib/autoBalance");
        await autoBalanceCurrentPeriod();

        await sendMessage(chatId, `✅ Successfully updated '${matchedIncome.incomeCategory.name}' income to ₦${parsed.newAmount.toLocaleString()}. Balances and budget goals have been recalculated!`);
      } catch (e: any) {
        await sendMessage(chatId, `❌ Failed to update income: ${e.message}`);
      }

      return NextResponse.json({ ok: true });
    }

    if (intent === "DELETEINCOME") {
      await sendMessage(chatId, "⏳ Deleting income...");
      const parsePrompt = `Extract the name of the income category the user wants to delete.
Return ONLY valid JSON: { "incomeCategoryName": string }
Message: "${text}"`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: parsePrompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (!parsed.incomeCategoryName) {
         await sendMessage(chatId, "I couldn't understand which income to delete. Please try again.");
         return NextResponse.json({ ok: true });
      }

      const incomes = await prisma.income.findMany({ include: { incomeCategory: true }, orderBy: { createdAt: 'desc' } });
      const matchedIncome = incomes.find(inc => 
        inc.incomeCategory.name.toLowerCase().includes(parsed.incomeCategoryName.toLowerCase()) || 
        parsed.incomeCategoryName.toLowerCase().includes(inc.incomeCategory.name.toLowerCase())
      );

      if (!matchedIncome) {
         await sendMessage(chatId, `I couldn't find an existing income matching '${parsed.incomeCategoryName}'.`);
         return NextResponse.json({ ok: true });
      }

      const host = req.headers.get("host");
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      const res = await fetch(`${protocol}://${host}/api/budgeting/income?id=${matchedIncome.id}`, { method: "DELETE" });
      
      if (res.ok) {
         await sendMessage(chatId, `✅ Successfully deleted '${matchedIncome.incomeCategory.name}' income. Balances and budget goals have been recalculated!`);
      } else {
         await sendMessage(chatId, `❌ Failed to delete income.`);
      }
      return NextResponse.json({ ok: true });
    }

    if (intent === "DELETESUBCAT") {
      await sendMessage(chatId, "⏳ Deleting subcategory...");
      const parsePrompt = `Extract the name of the subcategory the user wants to delete.
Return ONLY valid JSON: { "subcategoryName": string }
Message: "${text}"`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: parsePrompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (!parsed.subcategoryName) {
         await sendMessage(chatId, "I couldn't understand which subcategory to delete.");
         return NextResponse.json({ ok: true });
      }

      const subcats = await prisma.subcategory.findMany();
      const matchedSubcat = subcats.find(s => 
        s.name.toLowerCase() === parsed.subcategoryName.toLowerCase() || 
        s.name.toLowerCase().includes(parsed.subcategoryName.toLowerCase())
      );

      if (!matchedSubcat) {
         await sendMessage(chatId, `I couldn't find a subcategory matching '${parsed.subcategoryName}'.`);
         return NextResponse.json({ ok: true });
      }

      const host = req.headers.get("host");
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      const res = await fetch(`${protocol}://${host}/api/budgeting/subcategory?id=${matchedSubcat.id}`, { method: "DELETE" });
      
      if (res.ok) {
         await sendMessage(chatId, `✅ Successfully deleted subcategory '${matchedSubcat.name}'.`);
      } else {
         await sendMessage(chatId, `❌ Failed to delete subcategory.`);
      }
      return NextResponse.json({ ok: true });
    }

    if (intent === "EXPENSE") {
      await sendMessage(chatId, "⏳ Logging transaction...");
      
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
        const protocol = req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "development" ? "http" : "https");
        const txRes = await fetch(`${protocol}://${host}/api/budgeting/transaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subcategoryId: matchedSubcat.id,
            amount: parsed.amount,
            rawText: text,
            source: "telegram",
            bankName: parsed.bank
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
          update: { value: { amount: parsed.amount, rawText: text, desc: parsed.description, bank: parsed.bank } },
          create: { key: `pending_tx_${chatId}`, value: { amount: parsed.amount, rawText: text, desc: parsed.description, bank: parsed.bank } }
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
    }

    if (intent === "INCOME") {
      await sendMessage(chatId, "⏳ Adding income...");
      const banks = await prisma.bankAccount.findMany();
      const cats = await prisma.incomeCategory.findMany();
      const parsed = await extractIncome(text, banks, cats);

      if (!parsed.amount) {
        await sendMessage(chatId, "I couldn't find an amount. Please clarify.");
        return NextResponse.json({ ok: true });
      }

      const host = req.headers.get("host");
      const protocol = req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "development" ? "http" : "https");
      
      try {
        const res = await fetch(`${protocol}://${host}/api/budgeting/income`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
             amount: parsed.amount,
             bankAccountName: parsed.bankName || "Unallocated/Cash",
             incomeCategoryName: parsed.incomeCategory || "General",
             description: parsed.description
          })
        });

        const json = await res.json();
        if (json.success) {
           const incomeId = json.data.income.id;
           const inlineKeyboard = [
             [
               { text: "One-Time", callback_data: `income_onetime_${incomeId}` },
               { text: "Recurring", callback_data: `income_recurring_${incomeId}` }
             ]
           ];
           await sendMessage(chatId, `Added ₦${parsed.amount.toLocaleString()} from ${parsed.incomeCategory || "General"}. Is this recurring every month?`, {
             inline_keyboard: inlineKeyboard
           });
        } else {
           await sendMessage(chatId, `Failed to add income: ${json.error?.message}`);
        }
      } catch (err: any) {
        await sendMessage(chatId, `Network error adding income: ${err.message}`);
      }
      return NextResponse.json({ ok: true });
    }

    if (intent === "TRANSFER") {
      await sendMessage(chatId, "⏳ Transferring money...");
      const banks = await prisma.bankAccount.findMany();
      const parsed = await extractTransfer(text, banks);

      if (!parsed.amount || !parsed.fromBank || !parsed.toBank) {
        await sendMessage(chatId, "I need an amount, a source bank, and a destination bank.");
        return NextResponse.json({ ok: true });
      }

      const host = req.headers.get("host");
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      
      const res = await fetch(`${protocol}://${host}/api/budgeting/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           amount: parsed.amount,
           fromAccountName: parsed.fromBank,
           toAccountName: parsed.toBank,
           note: parsed.note
        })
      });

      const json = await res.json();
      if (json.success) {
         await sendMessage(chatId, `Transferred ₦${parsed.amount.toLocaleString()} from ${parsed.fromBank} to ${parsed.toBank}.`);
      } else {
         await sendMessage(chatId, `Failed to transfer: ${json.error?.message}`);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ ok: true }); // Always 200 OK to Telegram to avoid retries
  }
}
