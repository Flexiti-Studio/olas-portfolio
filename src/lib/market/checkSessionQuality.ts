// Session Quality Checker
// Analyzes hourly volume patterns over trailing 14 days

const CACHE = new Map<string, { isGoodSession: boolean, currentHourRank: number, timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

import { tickerToCoinGeckoId } from './checkVolumeSignal';

export async function checkSessionQuality(ticker: string): Promise<{ isGoodSession: boolean, currentHourRank: number }> {
  // Check cache first
  const cacheKey = `${ticker}-${new Date().getUTCHours()}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { isGoodSession: cached.isGoodSession, currentHourRank: cached.currentHourRank };
  }

  try {
    const coinId = tickerToCoinGeckoId[ticker];
    if (!coinId) {
      return { isGoodSession: true, currentHourRank: -1 };
    }

    // CoinGecko days=14 returns hourly data
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=14`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 } 
    });

    if (!response.ok) {
      console.warn(`[SessionQuality] API failed for ${ticker}: ${response.status}`);
      return { isGoodSession: true, currentHourRank: -1 }; // default true if we can't fetch
    }

    const data = await response.json();
    const volumes: [number, number][] = data.total_volumes;
    
    // Bucket volumes by UTC hour (0-23)
    const hourlyVolumes = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);

    for (const [timestampMs, volumeUSD] of volumes) {
      const hour = new Date(timestampMs).getUTCHours();
      
      hourlyVolumes[hour] += volumeUSD;
      hourlyCounts[hour] += 1;
    }

    // Calculate average volume for each hour
    const averages = hourlyVolumes.map((vol, idx) => {
      const count = hourlyCounts[idx];
      return { hour: idx, avgVol: count > 0 ? vol / count : 0 };
    });

    // Sort hours by average volume descending to find rank
    const sortedAverages = [...averages].sort((a, b) => b.avgVol - a.avgVol);
    
    const currentHour = new Date().getUTCHours();
    const currentHourIndex = sortedAverages.findIndex(a => a.hour === currentHour);
    
    // Rank 1 is index 0. So rank = index + 1
    const currentHourRank = currentHourIndex + 1;
    
    // Top third means rank 1-8
    const isGoodSession = currentHourRank <= 8;

    const result = { isGoodSession, currentHourRank };
    
    CACHE.set(cacheKey, { ...result, timestamp: Date.now() });
    
    return result;

  } catch (error) {
    console.error(`[SessionQuality] Error checking session quality for ${ticker}:`, error);
    return { isGoodSession: true, currentHourRank: -1 };
  }
}
