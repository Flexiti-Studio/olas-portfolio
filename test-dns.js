const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

dns.resolveSrv('_mongodb._tcp.cluster0.ih3hi45.mongodb.net', (err, addresses) => {
  if (err) {
    console.error("SRV Error:", err);
  } else {
    console.log("SRV Addresses:", addresses);
  }
});

dns.resolveTxt('cluster0.ih3hi45.mongodb.net', (err, addresses) => {
  if (err) {
    console.error("TXT Error:", err);
  } else {
    console.log("TXT Addresses:", addresses);
  }
});
