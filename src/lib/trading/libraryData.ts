export interface StrategyImage {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: string;
}

export interface LibraryStrategy {
  id: string;
  number: number;
  name: string;
  category: 'trend' | 'momentum' | 'breakout' | 'mean-reversion';
  categoryLabel: string;
  categoryLetter: 'A' | 'B' | 'C' | 'D';
  difficulty: 'Easy' | 'Easy to intermediate' | 'Intermediate' | 'Intermediate to advanced' | 'Advanced';
  bestForTesting: string;
  howItWorks: string[];
  exampleBotRules?: string[];
  mainWeakness: string;
  whyTestIt?: string;
  possibleInputs?: string[];
  formula?: {
    latex: string;
    description: string;
    terms: { symbol: string; explanation: string }[];
  };
  research?: {
    source: string;
    url: string;
    note?: string;
  };
}

export interface LibraryCategoryDef {
  id: 'all' | 'trend' | 'momentum' | 'breakout' | 'mean-reversion';
  letter?: 'A' | 'B' | 'C' | 'D';
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  count: number;
}

export const LIBRARY_CATEGORIES: LibraryCategoryDef[] = [
  {
    id: 'all',
    name: 'All 12 Bot Strategies',
    shortName: 'All Strategies',
    description: 'Ranked by practical usefulness as mechanical starting points for trading bots.',
    icon: 'grid_view',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    bgColor: 'bg-blue-600/10',
    count: 12,
  },
  {
    id: 'trend',
    letter: 'A',
    name: 'A. Trend-Following Strategies',
    shortName: 'Trend Following',
    description: 'Ride established market directions using moving averages, channels, and multi-timeframe filters.',
    icon: 'trending_up',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-600/10',
    count: 3,
  },
  {
    id: 'momentum',
    letter: 'B',
    name: 'B. Momentum Strategies',
    shortName: 'Momentum',
    description: 'Capitalize on high velocity directional thrust, RSI dip recoveries, and MACD confirmations.',
    icon: 'speed',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    bgColor: 'bg-cyan-600/10',
    count: 3,
  },
  {
    id: 'breakout',
    letter: 'C',
    name: 'C. Breakout Strategies',
    shortName: 'Breakout',
    description: 'Trade key levels, opening range sessions, and smart-money liquidity sweeps with structure shifts.',
    icon: 'call_split',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-600/10',
    count: 3,
  },
  {
    id: 'mean-reversion',
    letter: 'D',
    name: 'D. Mean-Reversion Strategies',
    shortName: 'Mean Reversion',
    description: 'Exploit statistical price stretch, Bollinger Band bounces, Z-scores, and pairs trading cointegration.',
    icon: 'swap_horiz',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgColor: 'bg-purple-600/10',
    count: 3,
  },
];

export const LIBRARY_STRATEGIES: LibraryStrategy[] = [
  // A. Trend-following strategies
  {
    id: 'ema-trend-following',
    number: 1,
    name: 'EMA Trend Following',
    category: 'trend',
    categoryLabel: 'Trend-Following',
    categoryLetter: 'A',
    difficulty: 'Easy',
    bestForTesting: 'XAUUSD, NAS100, US30 and other trending markets.',
    howItWorks: [
      'EMA 20 above EMA 50 indicates a potential bullish trend.',
      'EMA 20 below EMA 50 indicates a potential bearish trend.',
      'Use a higher-timeframe trend filter to avoid counter-trend noise.',
      'Enter on a pullback or confirmed continuation.',
      'Use ATR or market structure to determine the stop-loss.',
    ],
    exampleBotRules: [
      'H1 establishes the overarching trend direction.',
      'M15 identifies a pullback into the EMA zone.',
      'A bullish or bearish candle confirms continuation.',
      'The risk manager calculates position size based on equity % risk.',
      'The bot enters with a predefined stop-loss and take-profit.',
    ],
    mainWeakness:
      'Moving averages lag behind price and can generate repeated losses during ranging or chop markets.',
    research: {
      source: 'SSRN Research: Technical Trading Rules & Transaction Costs',
      url: 'https://papers.ssrn.com/sol3/Delivery.cfm/6977700.pdf?abstractid=6977700&mirid=1&utm_source=chatgpt.com',
      note: 'Research into technical trading rules suggests that performance can vary substantially with transaction costs and evaluation methods.',
    },
  },
  {
    id: 'donchian-channel-breakout',
    number: 2,
    name: 'Donchian Channel Breakout',
    category: 'trend',
    categoryLabel: 'Trend-Following',
    categoryLetter: 'A',
    difficulty: 'Easy to intermediate',
    bestForTesting: 'Sustained trends and liquid futures or indices.',
    howItWorks: [
      'Buys when price breaks above a recent price-channel high.',
      'Sells when price breaks below a recent price-channel low.',
      'Entry: Breakout above the previous 20 completed candles’ high.',
      'Exit: Price breaks below a shorter trailing channel.',
      'Stop-loss: ATR-based or another predefined risk rule.',
      'Position sizing: Volatility-adjusted (e.g. Turtle trading sizing).',
      'Test 20-candle and 55-candle entry windows (don’t assume either is optimal).',
    ],
    whyTestIt:
      'Trend-following breakout strategies have an extensive research history, including documented defensive benefits ("crisis alpha") during market stress.',
    mainWeakness:
      'Whipsaws during range-bound conditions where breakouts fail immediately after entering.',
    research: {
      source: 'Fidelity Institutional: Crisis Alpha with Trend Following',
      url: 'https://institutional.fidelity.com/institutions/insights/topics/investing-ideas/crisis-alpha-with-a-higher-return-potential?utm_source=chatgpt.com',
      note: 'Empirical studies on crisis alpha and non-correlated return profiles in systematic trend-following.',
    },
  },
  {
    id: 'htf-trend-ltf-pullback',
    number: 3,
    name: 'Higher-Timeframe Trend + Lower-Timeframe Pullback',
    category: 'trend',
    categoryLabel: 'Trend-Following',
    categoryLetter: 'A',
    difficulty: 'Intermediate',
    bestForTesting: 'Gold (XAUUSD), forex majors, and indices.',
    howItWorks: [
      'Built specifically around multi-timeframe alignment.',
      'Attempts to avoid entering late after a large move has already unfolded.',
      'H4 establishes directional macro bias.',
      'H1 identifies the active intermediate trend.',
      'M15 identifies the counter-trend pullback.',
      'A confirmed structural break (BOS) triggers the entry.',
      'Stop-loss goes beyond a technically meaningful invalidation level.',
    ],
    exampleBotRules: [
      'H4 directional bias: Price above 200 EMA + Bullish structural swing high sequence.',
      'H1 active trend: Price above 50 EMA.',
      'M15 pullback: 3+ consecutive bearish candles into Fibonacci 50%-61.8% discount or EMA value zone.',
      'Trigger: M15 bullish engulfing candle or break of recent M15 swing high.',
      'Risk: SL placed 2 pips below M15 swing low; TP at 2.5R or next H1 liquidity high.',
    ],
    mainWeakness:
      'A supposed pullback can turn into a complete higher-timeframe trend reversal, hitting invalidation.',
  },

  // B. Momentum strategies
  {
    id: 'price-momentum',
    number: 4,
    name: 'Price Momentum',
    category: 'momentum',
    categoryLabel: 'Momentum',
    categoryLetter: 'B',
    difficulty: 'Intermediate',
    bestForTesting: 'Trending markets, equity indices, and selected crypto markets.',
    howItWorks: [
      'Core thesis: An asset moving strongly in one direction tends to continue moving in that direction.',
      'Rate of change (ROC) evaluation across fixed lookback periods.',
      'Evaluation of moving-average slopes and relative volatility expansion.',
      'Volume confirmation where reliable tick or exchange volume is accessible.',
      'For multi-instrument bots: Calculate a momentum score across the universe and trade only those meeting a top threshold.',
    ],
    possibleInputs: [
      'Rate of Change (ROC 14 / 28)',
      'Recent Price Returns (1-day, 3-day, 5-day delta)',
      'Moving-Average Slope (Linear Regression slope of 20 SMA)',
      'Relative Volatility (Normalized ATR percentile)',
      'Trading Volume (Volume > 1.5x 20-period Volume SMA)',
    ],
    mainWeakness:
      'Momentum can reverse abruptly; crowded momentum trades frequently suffer sharp, cascading drawdowns.',
    research: {
      source: 'Reuters Commentary: Momentum and Reversal Dynamics',
      url: 'https://www.reuters.com/commentary/breakingviews/global-markets-breakingviews-2026-07-17/?utm_source=chatgpt.com',
      note: 'Analysis on sudden momentum reversals and crowding risk in algorithmic trading.',
    },
  },
  {
    id: 'rsi-pullback',
    number: 5,
    name: 'RSI Pullback Strategy',
    category: 'momentum',
    categoryLabel: 'Momentum',
    categoryLetter: 'B',
    difficulty: 'Easy',
    bestForTesting: 'Pullbacks within established trends and short-term mean-reversion opportunities.',
    howItWorks: [
      'Combines a trend filter with an oscillator to buy dips rather than chasing peaks.',
      'Distinguishes between buying a temporary dip in an uptrend vs buying into a market that is collapsing.',
    ],
    exampleBotRules: [
      'Buy Conditions:',
      '1. Price is above the 200-period moving average (Macro Uptrend).',
      '2. RSI(2) falls below a predefined oversold threshold (e.g. < 10 or < 15).',
      '3. Price begins recovering (e.g. closes higher than previous candle high).',
      '4. Stop-loss and risk checks pass; exit on RSI(2) > 70 or fixed target.',
      'Short Conditions: Reverse symmetrically (Price < 200 SMA, RSI(2) > 90, entry on breakdown).',
    ],
    mainWeakness:
      'RSI can remain pinned in overbought or oversold territory for extended durations during runaway moves. Thresholds must be rigorously backtested rather than assumed.',
  },
  {
    id: 'macd-momentum-confirmation',
    number: 6,
    name: 'MACD Momentum Confirmation',
    category: 'momentum',
    categoryLabel: 'Momentum',
    categoryLetter: 'B',
    difficulty: 'Easy',
    bestForTesting: 'Trend continuation and velocity confirmation.',
    howItWorks: [
      'Higher-timeframe trend agrees with the intended trade direction.',
      'MACD histogram or signal line crosses in the direction of the bias.',
      'Price closes beyond a predefined structural level.',
      'The expected reward justifies the risk (minimum 1.5R to 2R).',
      'Best practice: Test MACD as an alternative confirmation method rather than blindly stacking it with RSI, Stochastics, and multiple correlated momentum indicators.',
    ],
    mainWeakness:
      'Lagging signal cross in slow or choppy markets leading to entries near the tail end of moves.',
  },

  // C. Breakout strategies
  {
    id: 'sr-breakout-retest',
    number: 7,
    name: 'Support and Resistance Breakout + Retest',
    category: 'breakout',
    categoryLabel: 'Breakout',
    categoryLetter: 'C',
    difficulty: 'Intermediate',
    bestForTesting: 'Gold, forex pairs, and indices.',
    howItWorks: [
      'Identify a mathematical key resistance/support level (swing highs/lows or rolling price ranges).',
      'Wait for a candle to close decisively beyond the level (expansion/displacement).',
      'Wait for price to retest the broken level.',
      'Confirm that the level holds (wick rejection, lower-timeframe reversal candle).',
      'Enter with a predefined invalidation point beyond the retest wick.',
      'Reverse the logic for bearish breakdowns.',
    ],
    exampleBotRules: [
      'Level identification: Highest high of last 48 bars.',
      'Breakout confirmation: Candle body closes at least 0.5 ATR above the level.',
      'Retest window: Price returns to touch within 0.2 ATR of the level within 12 bars.',
      'Hold confirmation: Rejection candle with lower shadow >= 50% of candle range.',
      'Entry: Market execution upon close of confirmation candle.',
    ],
    mainWeakness:
      'False breakouts ("fakeouts") and levels that get tested repeatedly before failing completely.',
  },
  {
    id: 'opening-range-breakout',
    number: 8,
    name: 'Opening Range Breakout (ORB)',
    category: 'breakout',
    categoryLabel: 'Breakout',
    categoryLetter: 'C',
    difficulty: 'Intermediate',
    bestForTesting: 'Instruments with meaningful session-opening volume spikes (US30, NAS100, DAX, GER40).',
    howItWorks: [
      'Identifies the high and low of a predefined opening window (e.g. first 15 or 30 minutes of London or New York session).',
      'Calculates the range: High - Low of the opening window.',
      'Wait for a subsequent candle to close beyond the range boundaries.',
      'Apply a volatility and spread filter to weed out erratic opening spikes.',
      'Enter in the breakout direction.',
      'Exit at a predefined target, trailing stop, or hard end-of-session time limit.',
      'Important: Don’t apply identical session assumptions to synthetic or 24/7 instruments with no physical opening bells.',
    ],
    mainWeakness:
      'Opening range expansion followed by immediate midday consolidation or mean reversion.',
  },
  {
    id: 'liquidity-sweep-mss',
    number: 9,
    name: 'Liquidity Sweep + Market Structure Shift',
    category: 'breakout',
    categoryLabel: 'Breakout / SMC',
    categoryLetter: 'C',
    difficulty: 'Advanced',
    bestForTesting: 'Gold (XAUUSD), forex majors, and indices (Smart Money Concepts automation).',
    howItWorks: [
      'A prime candidate for mechanical SMC / ICT rule automation.',
      'Price approaches a previously identified significant swing low/high.',
      'Price sweeps below that low (stop hunt into sell-side liquidity).',
      'The candle closes back above the level (rejection wick, no acceptance below).',
      'A bullish Market Structure Shift (MSS) occurs: Price breaks the last lower high on the execution timeframe.',
      'The bot enters on displacement or a Fair Value Gap (FVG) retest.',
      'Stop-loss is placed beyond the invalidation sweep low; reverse for bearish.',
    ],
    mainWeakness:
      'Liquidity sweeps are easy to identify subjectively in hindsight. The bot must strictly use mathematical rules and only information available at the exact moment of entry.',
  },

  // D. Mean-reversion strategies
  {
    id: 'bollinger-bands-mean-reversion',
    number: 10,
    name: 'Bollinger Bands Mean Reversion',
    category: 'mean-reversion',
    categoryLabel: 'Mean-Reversion',
    categoryLetter: 'D',
    difficulty: 'Intermediate',
    bestForTesting: 'Range-bound markets and quiet consolidation sessions.',
    howItWorks: [
      'Calculate Bollinger Bands (typically 20-period SMA, 2.0 Standard Deviations).',
      'Identify price excursions beyond an outer band.',
      'Require mathematical evidence that the market is ranging (e.g. ADX < 20 or flat 200 SMA).',
      'Enter only when a reversal condition is confirmed (e.g. candle closes back inside the band).',
      'Target the middle band (SMA 20) or opposite band for exits.',
      'Crucial: A price closing outside the lower band during a strong downtrend is NOT a buy signal.',
    ],
    mainWeakness:
      '"Walking the bands" during strong directional trends, causing severe consecutive losses without a ranging filter.',
  },
  {
    id: 'z-score-mean-reversion',
    number: 11,
    name: 'Z-Score Mean Reversion',
    category: 'mean-reversion',
    categoryLabel: 'Mean-Reversion',
    categoryLetter: 'D',
    difficulty: 'Intermediate to advanced',
    bestForTesting: 'Instruments that exhibit measurable, statistically verified short-term mean-reverting behavior.',
    howItWorks: [
      'Calculates normalized statistical distance from rolling mean.',
      'A high positive Z-score (e.g. > +2.0) indicates price is 2 standard deviations above its mean.',
      'A high negative Z-score (e.g. < -2.0) indicates price is 2 standard deviations below its mean.',
      'The bot tests whether extreme readings statistically predict subsequent reversion to zero.',
      'Lookback window, entry threshold, and exit targets must be calibrated per asset.',
    ],
    formula: {
      latex: 'Z_t = \\frac{P_t - \\mu_t}{\\sigma_t}',
      description: 'Z-score formula for standardized price distance',
      terms: [
        { symbol: 'P_t', explanation: 'Current price or chosen price series at bar t' },
        { symbol: '\\mu_t', explanation: 'Rolling mean over the specified lookback window' },
        { symbol: '\\sigma_t', explanation: 'Rolling standard deviation over the lookback window' },
      ],
    },
    mainWeakness:
      'Markets can remain far from their means significantly longer than a trader or bot account can stay solvent.',
  },
  {
    id: 'statistical-arbitrage-pairs',
    number: 12,
    name: 'Statistical Arbitrage / Pairs Trading',
    category: 'mean-reversion',
    categoryLabel: 'Mean-Reversion / Quant',
    categoryLetter: 'D',
    difficulty: 'Advanced',
    bestForTesting: 'Related assets with a stable, measurable cointegration relationship (correlated equities, ETFs, index baskets).',
    howItWorks: [
      'Instead of trading a single instrument chart, the bot monitors the mathematical relationship between two assets (Asset A vs Asset B).',
      'Identify a suitable pair and test for cointegration (e.g. Engle-Granger test).',
      'Estimate their historical spread and beta relationship using training data.',
      'Measure the spread deviation in standard deviations (Z-score of the spread).',
      'Enter when deviation exceeds threshold (Long undervalued asset, Short overvalued asset).',
      'Exit when the spread reverts to historical mean or when relationship breaks down (stop loss).',
    ],
    mainWeakness:
      'Fundamental breakdown in cointegration (regime change) where the spread diverges permanently, causing massive losses without statistical validation.',
  },
];
