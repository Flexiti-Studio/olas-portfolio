import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { applicationId, jobUrl, screenshotUrl } = await req.json();

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    let { data: dailyCounter, error: fetchError } = await supabase
      .from('task_session_counters')
      .select('*')
      .eq('date', today)
      .single();

    if (!dailyCounter && fetchError?.code === 'PGRST116') {
      const { data: newCounter, error: createError } = await supabase
        .from('task_session_counters')
        .insert([{ date: today, sessionCount: 1, linkCount: 0 }])
        .select()
        .single();
      
      if (createError) throw createError;
      dailyCounter = newCounter;
    } else if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }


    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    const googleSheetWebhook = process.env.GOOGLE_SHEET_WEBHOOK_URL;

    let tgSuccess = !telegramBotToken || !telegramChatId; // if not configured, treat as 'success' for recording purposes, or maybe user wants it to fail if not configured? Assuming skipped is success.
    let sheetSuccess = !googleSheetWebhook;

    // 1. Notify Telegram
    if (telegramBotToken && telegramChatId) {
      try {
        const caption = `New Job Application Finalized!\n\nLink: ${jobUrl}\nStatus: Applied`;
        
        if (screenshotUrl && screenshotUrl.startsWith('data:image')) {
          const base64Data = screenshotUrl.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const blob = new Blob([buffer], { type: 'image/jpeg' });
          
          const formData = new FormData();
          formData.append('chat_id', telegramChatId);
          formData.append('caption', caption);
          formData.append('photo', blob, 'screenshot.jpg');
          
          const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendPhoto`, {
            method: "POST",
            body: formData
          });
          if (tgRes.ok) tgSuccess = true;
        } else {
          const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: telegramChatId, text: caption })
          });
          if (tgRes.ok) tgSuccess = true;
        }
      } catch (err) {
        console.error("Telegram Error:", err);
      }
    } else {
      console.log("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID. Skipping Telegram notification.");
    }

    // 2. Append to Google Sheet
    if (googleSheetWebhook) {
      try {
        const sheetRes = await fetch(googleSheetWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Date: new Date().toLocaleDateString(),
            URLs: jobUrl,
            Status: "Applied",
            Reason: "Submitted via Dashboard",
            date: new Date().toLocaleDateString(),
            urls: jobUrl,
            status: "Applied",
            reason: "Submitted via Dashboard",
            screenshotUrl: screenshotUrl
          })
        });
        if (sheetRes.ok) sheetSuccess = true;
      } catch (err) {
        console.error("Webhook Error:", err);
      }
    } else {
      console.log("Missing GOOGLE_SHEET_WEBHOOK_URL. Skipping Sheet update.");
    }

    // Fetch session target from settings
    let sessionTarget = 20; // Default
    const { data: setting } = await supabase
      .from('task_payment_settings')
      .select('session_target')
      .eq('id', 'default')
      .single();
    
    if (setting && setting.session_target) {
      sessionTarget = setting.session_target;
    }

    // Always update counter regardless of notification success
    let newLinkCount = dailyCounter.linkCount + 1;
    let newSessionCount = Math.floor((newLinkCount - 1) / sessionTarget) + 1;

    const { error: updateError } = await supabase
      .from('task_session_counters')
      .update({
        sessionCount: newSessionCount,
        linkCount: newLinkCount
      })
      .eq('date', today);

    if (updateError) throw updateError;

    const { error: linkError } = await supabase
      .from('task_link_records')
      .insert([{ url: jobUrl, date: today }]);
      
    if (linkError) console.error("Failed to save link record:", linkError);

    return NextResponse.json({ success: true, tgSuccess, sheetSuccess });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
