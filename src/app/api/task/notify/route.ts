import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { applicationId, jobUrl, screenshotUrl } = await req.json();

    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    const googleSheetWebhook = process.env.GOOGLE_SHEET_WEBHOOK_URL;

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
          
          await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendPhoto`, {
            method: "POST",
            body: formData
          });
        } else {
          await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: telegramChatId, text: caption })
          });
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
        await fetch(googleSheetWebhook, {
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
            screenshotUrl: screenshotUrl // In case the webhook needs the image
          })
        });
      } catch (err) {
        console.error("Webhook Error:", err);
      }
    } else {
      console.log("Missing GOOGLE_SHEET_WEBHOOK_URL. Skipping Sheet update.");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
