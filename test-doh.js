const https = require('https');

function resolveDoH(name, type) {
  return new Promise((resolve, reject) => {
    https.get(`https://cloudflare-dns.com/dns-query?name=${name}&type=${type}`, {
      headers: { 'accept': 'application/dns-json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    const srv = await resolveDoH('_mongodb._tcp.cluster0.ih3hi45.mongodb.net', 'SRV');
    console.log("SRV:", srv.Answer);
    
    const txt = await resolveDoH('cluster0.ih3hi45.mongodb.net', 'TXT');
    console.log("TXT:", txt.Answer);
  } catch (err) {
    console.error(err);
  }
}
run();
