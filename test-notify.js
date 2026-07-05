
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const sheetUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;

console.log('TELEGRAM_BOT_TOKEN exists:', !!botToken);
console.log('TELEGRAM_CHAT_ID exists:', !!chatId);
console.log('GOOGLE_SHEET_WEBHOOK_URL exists:', !!sheetUrl);

if (botToken && chatId) {
  fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: 'Test from local script!' })
  }).then(res => res.json()).then(data => console.log('Telegram Response:', data)).catch(console.error);
}

if (sheetUrl) {
  fetch(sheetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Date: new Date().toLocaleDateString(),
      URLs: 'https://test.com',
      Status: 'Test',
      Reason: 'Test Payload',
      date: new Date().toLocaleDateString(),
      urls: 'https://test.com',
      status: 'Test',
      reason: 'Test Payload'
    })
  }).then(res => res.text()).then(t => console.log('Sheet Response:', t.substring(0, 100))).catch(console.error);
}

