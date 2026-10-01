export const tickerToCoinGeckoId: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  XLM: 'stellar',
  AAVE: 'aave',
  QNT: 'quant-network',
  SEI: 'sei-network',
  XRP: 'ripple',
  AVAX: 'avalanche-2',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  UNI: 'uniswap',
  LTC: 'litecoin',
  APT: 'aptos',
  SUI: 'sui',
  LINK: 'chainlink',
  ATOM: 'cosmos',
  XMR: 'monero',
};

// 50% above the 7-day average volume
export const VOLUME_SPIKE_THRESHOLD_MULTIPLIER = 1.5; 
export const MIN_LIQUIDITY_USD = 5000000; // $5M floor

export async function checkVolumeSignal(ticker: string): Promise<{ confirmingSignal: boolean, hasLiquidity: boolean }> {
  const coinId = tickerToCoinGeckoId[ticker];
  if (!coinId) {
    console.warn(`[VolumeCheck] Ticker ${ticker} not in CoinGecko map. Defaulting to false.`);
    return { confirmingSignal: false, hasLiquidity: false };
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=daily`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.warn(`[VolumeCheck] CoinGecko API failed for ${ticker}: ${response.status} ${response.statusText}`);
      return { confirmingSignal: false, hasLiquidity: false };
    }

    const data = await response.json();
    const volumes: [number, number][] = data.total_volumes;
    
    if (!volumes || volumes.length < 2) {
      console.warn(`[VolumeCheck] Insufficient volume data for ${ticker}. Defaulting to false.`);
      return { confirmingSignal: false, hasLiquidity: false };
    }

    const volumeValues = volumes.map(v => v[1]);
    const current24hVolume = volumeValues[volumeValues.length - 1];
    
    const historicalVolumes = volumeValues.slice(0, volumeValues.length - 1);
    if (historicalVolumes.length === 0) return { confirmingSignal: false, hasLiquidity: current24hVolume >= MIN_LIQUIDITY_USD };
    
    const averageVolume = historicalVolumes.reduce((acc, val) => acc + val, 0) / historicalVolumes.length;

    const confirmingSignal = current24hVolume > (averageVolume * VOLUME_SPIKE_THRESHOLD_MULTIPLIER);
    const hasLiquidity = current24hVolume >= MIN_LIQUIDITY_USD;

    return { confirmingSignal, hasLiquidity };

  } catch (error) {
    console.error(`[VolumeCheck] Error checking volume for ${ticker}:`, error);
    return { confirmingSignal: false, hasLiquidity: false };
  }
}

