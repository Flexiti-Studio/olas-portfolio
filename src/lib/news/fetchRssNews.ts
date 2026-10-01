import Parser from 'rss-parser';

export interface ParsedNews {
  ticker: string;
  headline: string;
  sourceUrl: string;
  pubDate?: Date;
}

const coinMap: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  cardano: 'ADA',
  stellar: 'XLM',
  aave: 'AAVE',
  quant: 'QNT',
  sei: 'SEI',
  ripple: 'XRP',
  avalanche: 'AVAX',
  dogecoin: 'DOGE',
  polkadot: 'DOT',
  polygon: 'MATIC',
  uniswap: 'UNI',
  litecoin: 'LTC',
  aptos: 'APT',
  sui: 'SUI',
  chainlink: 'LINK',
  cosmos: 'ATOM',
  monero: 'XMR',
};

// Also matching bare tickers as whole words
const knownTickers = Object.values(coinMap);

export async function fetchRssNews(): Promise<ParsedNews[]> {
  const parser = new Parser();
  
  const feeds = [
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    'https://cointelegraph.com/rss',
    'https://decrypt.co/feed',
    'https://bitcoinmagazine.com/feed'
  ];

  const allItems: any[] = [];
  
  // Fetch all feeds
  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      allItems.push(...feed.items);
    } catch (error) {
      console.error(`Error fetching feed ${feedUrl}:`, error);
    }
  }

  // Sort by pubDate descending to keep the most recent if dupes exist
  allItems.sort((a, b) => {
    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return dateB - dateA;
  });

  const parsedData: ParsedNews[] = [];
  const seenTickers = new Set<string>();

  for (const item of allItems) {
    if (!item.title) continue;

    const titleLower = item.title.toLowerCase();
    let matchedTicker: string | null = null;

    // 1. Check for full coin names
    for (const [name, ticker] of Object.entries(coinMap)) {
      if (titleLower.includes(name)) {
        matchedTicker = ticker;
        break;
      }
    }

    // 2. Check for standalone tickers
    if (!matchedTicker) {
      for (const ticker of knownTickers) {
        // Regex ensures we match the ticker as a whole word
        const regex = new RegExp(`\\b${ticker.toLowerCase()}\\b`, 'i');
        if (regex.test(titleLower)) {
          matchedTicker = ticker;
          break;
        }
      }
    }

    // Skip if no match
    if (!matchedTicker) continue;

    // Dedupe by ticker (we only keep the first one because they're sorted by newest)
    if (!seenTickers.has(matchedTicker)) {
      seenTickers.add(matchedTicker);
      
      parsedData.push({
        ticker: matchedTicker,
        headline: item.title,
        sourceUrl: item.link || '',
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date()
      });
    }
  }

  console.log('Fetched RSS News Data:', parsedData);
  return parsedData;
}
