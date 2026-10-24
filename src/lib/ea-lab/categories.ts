export interface StrategyCategory {
  id: string;
  number: number;
  name: string;
  shortName: string;
  mainIdea: string;
  icon: string;
  color: string;
  borderColor: string;
  bgActive: string;
  keywords: string[];
}

export const STRATEGY_CATEGORIES: StrategyCategory[] = [
  {
    id: 'trend-following',
    number: 1,
    name: 'Trend Following',
    shortName: 'Trend',
    mainIdea: 'Trade in the direction of the established market trend using indicators such as EMA 20/50.',
    icon: 'trending_up',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgActive: 'bg-emerald-500/10',
    keywords: ['trend', 'ema', 'moving average', 'sma', 'follow', 'trend following', 'trendline', 'direction'],
  },
  {
    id: 'pullback-trading',
    number: 2,
    name: 'Pullback Trading',
    shortName: 'Pullback',
    mainIdea: 'Enter when price retraces within an existing trend before continuing.',
    icon: 'replay',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    bgActive: 'bg-cyan-500/10',
    keywords: ['pullback', 'retrace', 'retracement', 'dip', 'continuation', 're-entry'],
  },
  {
    id: 'market-structure',
    number: 3,
    name: 'Market Structure (SMC/ICT)',
    shortName: 'Market Structure',
    mainIdea: 'Use break of structure (BOS), change of character (CHOCH), displacement, and liquidity sweeps.',
    icon: 'account_tree',
    color: 'text-violet-400',
    borderColor: 'border-violet-500/40',
    bgActive: 'bg-violet-500/10',
    keywords: ['smc', 'ict', 'bos', 'choch', 'market structure', 'displacement', 'fair value', 'fvg', 'breaker'],
  },
  {
    id: 'supply-demand',
    number: 4,
    name: 'Supply and Demand',
    shortName: 'Supply & Demand',
    mainIdea: 'Identify price zones where strong buying or selling previously occurred.',
    icon: 'layers',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgActive: 'bg-amber-500/10',
    keywords: ['supply', 'demand', 'snd', 's&d', 'order block', 'zone', 'imbalance', 'poi'],
  },
  {
    id: 'liquidity-based',
    number: 5,
    name: 'Liquidity-Based Trading',
    shortName: 'Liquidity',
    mainIdea: 'Look for stop hunts, liquidity grabs, and sweeps of previous highs or lows.',
    icon: 'water_drop',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    bgActive: 'bg-blue-500/10',
    keywords: ['liquidity', 'stop hunt', 'sweep', 'grab', 'bsl', 'ssl', 'equal highs', 'equal lows'],
  },
  {
    id: 'breakout-trading',
    number: 6,
    name: 'Breakout Trading',
    shortName: 'Breakout',
    mainIdea: 'Enter when price breaks a key range, support/resistance level, or consolidation.',
    icon: 'bolt',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/40',
    bgActive: 'bg-yellow-500/10',
    keywords: ['breakout', 'range break', 'box break', 'break of range', 'consolidation', 'support', 'resistance'],
  },
  {
    id: 'opening-range-breakout',
    number: 7,
    name: 'Opening-Range Breakout',
    shortName: 'Opening Range (ORB)',
    mainIdea: 'Trade breakouts around the opening range of stock-market sessions.',
    icon: 'schedule',
    color: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    bgActive: 'bg-orange-500/10',
    keywords: ['orb', 'opening range', 'opening-range', 'london open', 'ny open', 'session open', 'session breakout'],
  },
  {
    id: 'momentum-trading',
    number: 8,
    name: 'Momentum Trading',
    shortName: 'Momentum',
    mainIdea: 'Trade strong directional price movements, often after confirmation of volume or momentum.',
    icon: 'speed',
    color: 'text-red-400',
    borderColor: 'border-red-500/40',
    bgActive: 'bg-red-500/10',
    keywords: ['momentum', 'volume spike', 'impulse', 'surge', 'velocity', 'macd', 'rsi momentum'],
  },
  {
    id: 'mean-reversion',
    number: 9,
    name: 'Mean Reversion',
    shortName: 'Mean Reversion',
    mainIdea: 'Trade the expectation that price will return toward its average after moving unusually far from it.',
    icon: 'swap_horiz',
    color: 'text-teal-400',
    borderColor: 'border-teal-500/40',
    bgActive: 'bg-teal-500/10',
    keywords: ['mean reversion', 'reversion', 'bollinger', 'envelope', 'overbought', 'oversold', 'std dev', 'vwap reversion'],
  },
  {
    id: 'fibonacci-retracement',
    number: 10,
    name: 'Fibonacci Retracement',
    shortName: 'Fibonacci',
    mainIdea: 'Use retracement levels to identify potential pullback entry zones.',
    icon: 'straighten',
    color: 'text-indigo-400',
    borderColor: 'border-indigo-500/40',
    bgActive: 'bg-indigo-500/10',
    keywords: ['fib', 'fibonacci', 'golden pocket', '61.8', '78.6', '38.2', '50%', 'retracement level'],
  },
  {
    id: 'order-flow-volume',
    number: 11,
    name: 'Order Flow and Volume Analysis',
    shortName: 'Order Flow',
    mainIdea: 'Study buying/selling pressure, volume, and execution behaviour where reliable data is available.',
    icon: 'bar_chart',
    color: 'text-emerald-300',
    borderColor: 'border-emerald-400/40',
    bgActive: 'bg-emerald-400/10',
    keywords: ['order flow', 'footprint', 'volume profile', 'delta', 'cumulative delta', 'absorption', 'tick volume'],
  },
  {
    id: 'wallet-onchain',
    number: 12,
    name: 'Wallet Activity and On-Chain Analysis',
    shortName: 'Wallet & On-Chain',
    mainIdea: 'For crypto, track wallet clusters, transaction activity, liquidity, and holder concentration.',
    icon: 'account_balance_wallet',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgActive: 'bg-purple-500/10',
    keywords: ['wallet', 'on-chain', 'onchain', 'whale', 'holder', 'crypto flow', 'smart money wallet', 'token transfer'],
  },
  {
    id: 'news-event-based',
    number: 13,
    name: 'News and Event-Based Trading',
    shortName: 'News & Events',
    mainIdea: 'Use economic announcements, market news, and sentiment as trading context or filters.',
    icon: 'newspaper',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/40',
    bgActive: 'bg-rose-500/10',
    keywords: ['news', 'event', 'nfp', 'cpi', 'fomc', 'interest rate', 'sentiment', 'economic calendar'],
  },
  {
    id: 'hybrid-confluence',
    number: 14,
    name: 'Hybrid / Confluence Strategies',
    shortName: 'Hybrid / Confluence',
    mainIdea: 'Combine multiple signals, such as trend + liquidity sweep + market-structure confirmation.',
    icon: 'auto_awesome',
    color: 'text-fuchsia-400',
    borderColor: 'border-fuchsia-500/40',
    bgActive: 'bg-fuchsia-500/10',
    keywords: ['hybrid', 'confluence', 'multi-signal', 'multi-timeframe', 'combo', 'composite', 'trend + liquidity'],
  },
];

/**
 * Resolves the single primary category definition for a given strategy.
 * 1. If strategy has an explicitly assigned category, strictly return that category.
 * 2. Otherwise, if there is a keyword match, pick the category with the strongest score (minimum threshold).
 * 3. Guarantees that every strategy belongs to at most ONE category, never multiple.
 */
export function getStrategyCategory(
  strategy: { name: string; description?: string | null; category?: string | null }
): StrategyCategory | null {
  // 1. Direct explicit category assignment (strict)
  if (strategy.category && strategy.category.trim()) {
    const rawCat = strategy.category.trim().toLowerCase();
    const found = STRATEGY_CATEGORIES.find(
      (c) =>
        c.id.toLowerCase() === rawCat ||
        c.name.toLowerCase() === rawCat ||
        c.shortName.toLowerCase() === rawCat ||
        String(c.number) === rawCat
    );
    if (found) return found;
  }

  // 2. Keyword matching fallback: score each category
  const nameText = (strategy.name || '').toLowerCase();
  const descText = (strategy.description || '').toLowerCase();

  let bestCategory: StrategyCategory | null = null;
  let highestScore = 0;

  for (const cat of STRATEGY_CATEGORIES) {
    let score = 0;

    // Direct category name in strategy name is highest priority
    if (nameText.includes(cat.name.toLowerCase()) || nameText.includes(cat.shortName.toLowerCase())) {
      score += 50;
    }

    for (const kw of cat.keywords) {
      const kwLower = kw.toLowerCase();
      if (nameText.includes(kwLower)) {
        score += kwLower.length * 3;
      } else if (descText.includes(kwLower)) {
        score += kwLower.length;
      }
    }

    // Require a minimum score of 8 so common single words don't trigger false positives
    if (score > highestScore && score >= 8) {
      highestScore = score;
      bestCategory = cat;
    }
  }

  return bestCategory;
}

/**
 * Checks whether an EA strategy belongs to a category.
 * A strategy can only belong to ONE category.
 */
export function matchStrategyCategory(
  strategy: { name: string; description?: string | null; category?: string | null },
  categoryId: string
): boolean {
  if (categoryId === 'all') return true;

  const primaryCategory = getStrategyCategory(strategy);
  if (!primaryCategory) return false;

  return primaryCategory.id === categoryId;
}

/**
 * Serializes category and user description into a clean string stored in DB description.
 */
export function serializeCategoryDescription(category?: string | null, description?: string | null): string | null {
  const cleanDesc = (description || '').replace(/^\[Category:\s*[^\]]+\]\s*\n*/i, '').trim();
  if (!category && !cleanDesc) return null;
  if (!category) return cleanDesc || null;
  if (!cleanDesc) return `[Category: ${category}]`;
  return `[Category: ${category}]\n\n${cleanDesc}`;
}

/**
 * Extracts category and clean description from DB description text.
 */
export function deserializeCategoryDescription(rawDescription?: string | null): {
  category: string | null;
  description: string | null;
} {
  if (!rawDescription) {
    return { category: null, description: null };
  }
  const match = rawDescription.match(/^\[Category:\s*([^\]]+)\]\s*\n*([\s\S]*)$/i);
  if (match) {
    const cat = match[1].trim();
    const cleanDesc = match[2].trim() || null;
    return { category: cat, description: cleanDesc };
  }
  return { category: null, description: rawDescription };
}
