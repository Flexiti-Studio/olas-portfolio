const https = require('https');

const data = JSON.stringify({
  commands: [
    { command: "status", description: "View your current budget strategy and allocations" },
    { command: "balance", description: "Check your bank account balances" },
    { command: "addbank", description: "Add a new bank account (e.g. /addbank Monzo 500)" },
    { command: "reallocate", description: "Manually trigger a budget reallocation" },
    { command: "digest", description: "Generate and send an email digest" }
  ]
});

const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: '/bot8783869610:AAGUu-sBiCo6xjtR-Fj8vQG9KbNNC8XA9k8/setMyCommands',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
