"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

const CandlestickChart = dynamic(
  () => import('@/components/flexStrategy/chart/CandlestickChart').then((m) => m.CandlestickChart),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#131722] flex items-center justify-center text-[#787b86]">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="material-symbols-outlined animate-spin text-base text-[#2962ff]">sync</span>
          <span>Loading TradingView chart engine...</span>
        </div>
      </div>
    ),
  }
);
import { ChartToolbar } from '@/components/flexStrategy/chart/ChartToolbar';
import { BacktestReplayBar } from '@/components/flexStrategy/chart/BacktestReplayBar';
import { ParametersPanel } from '@/components/flexStrategy/params/ParametersPanel';
import { StrategyChatPanel } from '@/components/flexStrategy/chat/StrategyChatPanel';
import { BottomTabs } from '@/components/flexStrategy/workspace/BottomTabs';
import { ExportModal } from '@/components/flexStrategy/export/ExportModal';
import { IndicatorsModal } from '@/components/flexStrategy/chart/IndicatorsModal';
import { ChartScreenshotModal } from '@/components/flexStrategy/chart/ChartScreenshotModal';
import { ChartIndicatorConfig } from '@/lib/flexStrategy/chart/indicators';
import {
  ICandle,
  StrategyContract,
  SimulationResult,
  CompletedTrade,
  ActivePosition,
  Timeframe,
} from '@/lib/flexStrategy/engine/types';
import { getCandles, parseCandleCsv, setBaseDataset } from '@/lib/flexStrategy/data/getCandles';
import { BaseDatasetMeta } from '@/lib/data/csvImporter';
import { executeStrategyInWorker } from '@/lib/flexStrategy/engine/workerRunner';
import { extractStrategyJson } from '@/lib/flexStrategy/ai/strategyValidator';
import { calculateSimulationStats } from '@/lib/flexStrategy/engine/stats';
import { ChartDrawing } from '@/lib/flexStrategy/chart/drawingTypes';
import { toast } from 'sonner';
import Link from 'next/link';

interface WorkspaceClientProps {
  projectId: string;
  projectName: string;
  initialSymbol?: string;
  initialTimeframe?: Timeframe;
}

export function WorkspaceClient({
  projectId,
  projectName,
  initialSymbol = 'XAUUSD',
  initialTimeframe = '5m',
}: WorkspaceClientProps) {
  // Chart & Data states
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [candles, setCandles] = useState<ICandle[]>([]);
  const [baseDatasetMeta, setBaseDatasetMeta] = useState<BaseDatasetMeta | null>(null);
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');

  // Mode state: 'strategy' (default) vs 'backtest'
  const [workspaceMode, setWorkspaceMode] = useState<'strategy' | 'backtest'>('strategy');

  // Strategy Tester Panel Height: 'minimized' (closed on default) | 'normal' | 'expanded'
  const [testerHeight, setTesterHeight] = useState<'normal' | 'expanded' | 'minimized'>('minimized');

  const handleModeChange = useCallback((newMode: 'strategy' | 'backtest') => {
    setWorkspaceMode(newMode);
    if (newMode === 'backtest') {
      // Automatically open Strategy Tester so trader immediately sees results & equity curve
      setTesterHeight('normal');
      toast.info('🧪 Switched to Backtest Mode. Bar replay & Strategy Tester active.');
    } else {
      // In Strategy mode, reset bar replay to latest candle and minimize bottom tester
      setReplayIndex(null);
      setIsPlaying(false);
      setTesterHeight('minimized');
      toast.info('⚡ Switched to Strategy Mode.');
    }
  }, []);

  // Chart Drawings State & Persistence
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [isSavingChart, setIsSavingChart] = useState(false);
  const [isChartSaved, setIsChartSaved] = useState(false);

  const handleSaveDrawings = useCallback(
    (newDrawings: ChartDrawing[]) => {
      setDrawings(newDrawings);
      setIsChartSaved(false);
      try {
        localStorage.setItem(`fs_drawings_${projectId}_${symbol}`, JSON.stringify(newDrawings));
      } catch (e) {}

      // Background persist to Postgres database via API
      fetch(`/flexStrategy/api/project/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartDrawings: newDrawings }),
      }).catch((err) => console.warn('Failed to save drawings to DB:', err));
    },
    [projectId, symbol]
  );

  const defaultStrategy: StrategyContract = {
    name: 'XAUUSD Range Breakout',
    params: [
      { key: 'lookbackBars', type: 'number', default: 12, label: 'Range Lookback Bars', min: 3, max: 50 },
      { key: 'slPips', type: 'number', default: 4.5, label: 'Stop Loss ($)', min: 1, max: 20 },
      { key: 'tpPips', type: 'number', default: 9.0, label: 'Take Profit ($)', min: 2, max: 50 },
    ],
    code: `function onBar(ctx) {
  const p = ctx.params;
  const bars = p.lookbackBars || 12;
  const highRange = ctx.indicators.highest(bars, 1);
  const lowRange = ctx.indicators.lowest(bars, 1);
  
  if (!highRange || !lowRange) return null;
  
  if (!ctx.position) {
    if (ctx.bar.close > highRange) {
      return { action: 'buy', sl: ctx.bar.close - p.slPips, tp: ctx.bar.close + p.tpPips };
    }
    if (ctx.bar.close < lowRange) {
      return { action: 'sell', sl: ctx.bar.close + p.slPips, tp: ctx.bar.close - p.tpPips };
    }
  }
  return null;
}`,
  };

  // Active Strategy & Versions
  const [strategy, setStrategy] = useState<StrategyContract>(defaultStrategy);

  const [activeParams, setActiveParams] = useState<Record<string, any>>({
    lookbackBars: 12,
    slPips: 4.5,
    tpPips: 9.0,
  });

  const [versions, setVersions] = useState<
    { version: number; name: string; createdBy: string; createdAt: Date; strategy: StrategyContract; params: Record<string, any> }[]
  >([
    {
      version: 1,
      name: 'XAUUSD Range Breakout',
      createdBy: 'ai',
      createdAt: new Date(),
      strategy: defaultStrategy,
      params: { lookbackBars: 12, slPips: 4.5, tpPips: 9.0 },
    },
  ]);

  const [currentVersion, setCurrentVersion] = useState(1);

  // Simulation execution results
  const [simulation, setSimulation] = useState<SimulationResult>({
    trades: [],
    equityCurve: [],
    stats: {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      profitFactor: 0,
      netProfit: 0,
      netProfitPercent: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      averageWin: 0,
      averageLoss: 0,
      expectancy: 0,
    },
  });

  const [isRunning, setIsRunning] = useState(false);
  const [hasUserRunTest, setHasUserRunTest] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<CompletedTrade | null>(null);

  // Replay feature states
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Backtest Start Point State (Custom selected candle to start backtest from)
  const [backtestStartIndex, setBacktestStartIndex] = useState<number | null>(null);
  const [isSelectingStartPoint, setIsSelectingStartPoint] = useState<boolean>(false);
  const backtestStartIndexRef = useRef<number | null>(backtestStartIndex);
  backtestStartIndexRef.current = backtestStartIndex;

  // Hydrate backtest start point from localStorage on mount
  useEffect(() => {
    try {
      const savedStart = localStorage.getItem(`fs_backtest_start_${projectId}`);
      if (savedStart !== null) {
        const parsed = parseInt(savedStart, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          setBacktestStartIndex(parsed);
          backtestStartIndexRef.current = parsed;
        }
      }
    } catch {}
  }, [projectId]);

  // Chat copilot states
  const [messages, setMessages] = useState<
    { id: string; role: 'user' | 'assistant' | 'system'; content: string; toolStatus?: string | null; versionCreated?: number | null }[]
  >([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Welcome! I am your strategy engineer. Describe your trading idea (e.g. "Create a range breakout strategy for XAUUSD on 5m with a 2:1 TP"), and I will generate the bot script, adjustable parameters, and run a live preview.',
    },
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Technical indicators state
  const [indicators, setIndicators] = useState<ChartIndicatorConfig[]>([
    {
      id: 'vol-default',
      type: 'vol',
      name: 'Volume',
      period: 20,
      color: '#26a69a',
      lineWidth: 1,
      overlay: false,
      visible: true,
    },
    {
      id: 'ema-20',
      type: 'ema',
      name: 'EMA (20)',
      period: 20,
      color: '#f59e0b',
      lineWidth: 1.5,
      overlay: true,
      visible: true,
    },
  ]);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);

  // Export modal
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Chart Screenshot Reference & States
  const screenshotRef = useRef<(() => Promise<string>) | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [capturedScreenshotUrl, setCapturedScreenshotUrl] = useState<string | null>(null);
  const [screenshotFilename, setScreenshotFilename] = useState<string>('');
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);

  // Collapsible Sidebars State
  const [isParamsCollapsed, setIsParamsCollapsed] = useState<boolean>(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(false);

  // Hydrate collapsed states from localStorage on client mount
  useEffect(() => {
    try {
      const savedParams = localStorage.getItem('fs_params_collapsed');
      if (savedParams !== null) setIsParamsCollapsed(savedParams === 'true');
      const savedChat = localStorage.getItem('fs_chat_collapsed');
      if (savedChat !== null) setIsChatCollapsed(savedChat === 'true');
    } catch {}
  }, []);

  const toggleParamsCollapse = useCallback(() => {
    setIsParamsCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('fs_params_collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  const toggleChatCollapse = useCallback(() => {
    setIsChatCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('fs_chat_collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  // Manual 1-click Save Chart button callback: persists all drawings, indicators, symbol, timeframe, params to DB
  const handleSaveChart = useCallback(async () => {
    setIsSavingChart(true);
    try {
      const payload = {
        name: projectName,
        symbol,
        timeframe,
        chartDrawings: drawings,
        activeParams,
        strategy,
        version: currentVersion,
        messages,
      };

      // Immediate offline cache
      try {
        localStorage.setItem(`fs_project_${projectId}`, JSON.stringify(payload));
        localStorage.setItem(`fs_drawings_${projectId}_${symbol}`, JSON.stringify(drawings));
        localStorage.setItem(`fs_indicators_${projectId}`, JSON.stringify(indicators));
        localStorage.setItem(`fs_chartType_${projectId}`, chartType);
      } catch (e) {}

      // Synchronize to Postgres DB via API
      const res = await fetch(`/flexStrategy/api/project/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsChartSaved(true);
        toast.success(`Chart layout & ${drawings.length} drawing${drawings.length === 1 ? '' : 's'} saved to database!`);
      } else {
        toast.error('Failed to save chart to database');
      }
    } catch (err: any) {
      toast.error(`Save error: ${err?.message || String(err)}`);
    } finally {
      setIsSavingChart(false);
    }
  }, [projectId, projectName, symbol, timeframe, drawings, activeParams, strategy, currentVersion, messages, indicators, chartType]);

  // Chart screenshot callback (high-res PNG download, clipboard copy & preview)
  const handleScreenshot = useCallback(async (action: 'instant' | 'download' | 'copy' | 'preview' = 'instant') => {
    if (!screenshotRef.current) {
      toast.error('Chart engine not ready for screenshot');
      return;
    }

    setIsCapturingScreenshot(true);
    try {
      const dataUrl = await screenshotRef.current();
      if (!dataUrl) {
        toast.error('Could not capture chart window');
        setIsCapturingScreenshot(false);
        return;
      }

      // Generate clean timestamped filename: XAUUSD_5m_chart_2026-10-23_1150.png
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10);
      const timePart = now.toTimeString().slice(0, 5).replace(':', '');
      const filename = `${symbol}_${timeframe}_chart_${datePart}_${timePart}.png`;

      setCapturedScreenshotUrl(dataUrl);
      setScreenshotFilename(filename);

      if (action === 'preview') {
        setIsScreenshotModalOpen(true);
        setIsCapturingScreenshot(false);
        return;
      }

      const shouldDownload = action === 'instant' || action === 'download';
      const shouldCopy = action === 'instant' || action === 'copy';

      // 1. Trigger automatic PNG download
      if (shouldDownload) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // 2. Also copy to clipboard as image/png blob if supported
      let copiedToClipboard = false;
      if (shouldCopy) {
        try {
          if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            copiedToClipboard = true;
          }
        } catch (clipboardErr) {
          console.warn('Clipboard write skipped:', clipboardErr);
        }
      }

      if (action === 'copy' && copiedToClipboard) {
        toast.success(`📋 Copied chart to clipboard: ${filename}`, {
          action: {
            label: 'Preview',
            onClick: () => setIsScreenshotModalOpen(true),
          },
        });
      } else if (action === 'download') {
        toast.success(`💾 Chart snapshot downloaded: ${filename}`, {
          action: {
            label: 'Preview',
            onClick: () => setIsScreenshotModalOpen(true),
          },
        });
      } else if (copiedToClipboard) {
        toast.success(`📸 Chart snapshot saved: ${filename}`, {
          description: 'Image downloaded and copied to your clipboard!',
          action: {
            label: 'Preview',
            onClick: () => setIsScreenshotModalOpen(true),
          },
        });
      } else {
        toast.success(`📸 Chart snapshot saved: ${filename}`, {
          action: {
            label: 'Preview',
            onClick: () => setIsScreenshotModalOpen(true),
          },
        });
      }
    } catch (err: any) {
      console.error('Screenshot error:', err);
      toast.error(`Screenshot failed: ${err?.message || String(err)}`);
    } finally {
      setIsCapturingScreenshot(false);
    }
  }, [symbol, timeframe]);

  // Load candles on mount or timeframe/symbol change
  useEffect(() => {
    let mounted = true;
    getCandles(symbol, timeframe, projectId).then(({ candles: data, meta }) => {
      if (mounted) {
        setCandles(data);
        setBaseDatasetMeta(meta);
        try {
          localStorage.setItem(`fs_candles_${projectId}_${symbol}_${timeframe}`, JSON.stringify(data));
        } catch {}
      }
    });
    return () => {
      mounted = false;
    };
  }, [symbol, timeframe, projectId]);

  // Keep latest strategy and params in refs for stable run callbacks
  const strategyCodeRef = useRef(strategy.code);
  const activeParamsRef = useRef(activeParams);
  strategyCodeRef.current = strategy.code;
  activeParamsRef.current = activeParams;

  // Run strategy simulation
  const handleRunSimulation = useCallback(
    async (
      codeToRun?: string,
      paramsToRun?: Record<string, any>,
      showSuccessToast = false,
      startBarIdxOverride?: number
    ) => {
      if (candles.length === 0) {
        toast.info('Loading market data, please wait...');
        return;
      }
      setIsRunning(true);

      const code = codeToRun ?? strategyCodeRef.current;
      const params = paramsToRun ?? activeParamsRef.current;
      const startIdx =
        startBarIdxOverride !== undefined
          ? startBarIdxOverride
          : (backtestStartIndexRef.current ?? 0);

      try {
        const result = await executeStrategyInWorker(candles, code, params, 10000, startIdx);
        setSimulation(result);
        setHasUserRunTest(true);

        // Remove cleared flag since simulation has now run
        try {
          localStorage.removeItem(`fs_sim_cleared_${projectId}`);
        } catch {}

        // Persist simulation history & stats snapshot
        try {
          localStorage.setItem(
            `fs_sim_history_${projectId}`,
            JSON.stringify({
              stats: result.stats,
              tradesCount: result.trades.length,
              startBarIndex: startIdx,
              savedAt: Date.now(),
            })
          );
        } catch {}

        if (result.error) {
          toast.error(result.error);
        } else if (showSuccessToast) {
          const stats = result.stats;
          const startInfo = startIdx > 0 ? ` (from Bar #${startIdx + 1})` : '';
          toast.success(
            `Strategy executed${startInfo}: ${stats.totalTrades} trade${stats.totalTrades === 1 ? '' : 's'} (${stats.winRate}% win rate, ${stats.netProfit >= 0 ? '+' : ''}$${stats.netProfit})`
          );
        }
      } catch (err: any) {
        toast.error(`Execution error: ${err?.message || String(err)}`);
      } finally {
        setIsRunning(false);
      }
    },
    [candles, projectId]
  );

  // Set Backtest Start Point from Chart Click or Date Picker
  const handleSelectStartPoint = useCallback(
    (index: number) => {
      setBacktestStartIndex(index);
      backtestStartIndexRef.current = index;
      setIsSelectingStartPoint(false);
      try {
        localStorage.setItem(`fs_backtest_start_${projectId}`, String(index));
      } catch {}
      setReplayIndex(index);
      setHasUserRunTest(true);
      handleRunSimulation(undefined, undefined, true, index);
      toast.success(`📍 Backtest start set to Bar #${index + 1}! Prior bars will warm up indicators.`);
    },
    [projectId, handleRunSimulation]
  );

  // Reset Backtest Start Point back to the beginning of the chart
  const handleResetStartPoint = useCallback(() => {
    setBacktestStartIndex(null);
    backtestStartIndexRef.current = null;
    setIsSelectingStartPoint(false);
    try {
      localStorage.removeItem(`fs_backtest_start_${projectId}`);
    } catch {}
    setReplayIndex(null);
    if (hasUserRunTest) {
      handleRunSimulation(undefined, undefined, true, 0);
    }
    toast.info('Backtest start point reset to beginning of chart.');
  }, [projectId, hasUserRunTest, handleRunSimulation]);

  // Clear Current Backtest Simulation Results & Trades
  const handleClearTest = useCallback(() => {
    const emptyStats = calculateSimulationStats([], 10000, candles);
    setSimulation({
      trades: [],
      equityCurve: emptyStats.equityCurve,
      stats: emptyStats.stats,
      runningPosition: null,
    });
    setHasUserRunTest(false);
    setSelectedTrade(null);
    setReplayIndex(null);
    setIsPlaying(false);
    try {
      localStorage.removeItem(`fs_sim_history_${projectId}`);
      localStorage.setItem(`fs_sim_cleared_${projectId}`, 'true');
    } catch {}
    toast.success('🧹 Current backtest cleared! Trades removed from chart.');
  }, [candles, projectId]);

  // Re-run simulation only when candles change AND user has an active test running
  const isFirstCandleLoad = useRef(true);
  useEffect(() => {
    if (candles.length > 0) {
      if (isFirstCandleLoad.current) {
        isFirstCandleLoad.current = false;
        return; // Do NOT auto-run on initial page load
      }
      if (hasUserRunTest) {
        handleRunSimulation();
      }
      // Reset replay index so replay adapts to new dataset
      setReplayIndex(null);
      setIsPlaying(false);
    }
  }, [candles, hasUserRunTest, handleRunSimulation]);

  // Replay play/pause loop
  useEffect(() => {
    if (isPlaying) {
      const delay = Math.max(100, Math.floor(1000 / (replaySpeed * 2)));
      replayIntervalRef.current = setInterval(() => {
        setReplayIndex((prev) => {
          const current = prev == null ? 30 : prev;
          if (current >= candles.length - 1) {
            setIsPlaying(false);
            return candles.length - 1;
          }
          return current + 1;
        });
      }, delay);
    } else {
      if (replayIntervalRef.current) clearInterval(replayIntervalRef.current);
    }
    return () => {
      if (replayIntervalRef.current) clearInterval(replayIntervalRef.current);
    };
  }, [isPlaying, replaySpeed, candles.length]);

  const handlePlayToggle = () => {
    if (replayIndex == null || replayIndex >= candles.length - 1) {
      setReplayIndex(backtestStartIndex ?? Math.min(30, candles.length - 1));
    }
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    setReplayIndex((prev) => {
      const current = prev == null ? (backtestStartIndex ?? Math.min(30, candles.length - 1)) : prev;
      return Math.min(candles.length - 1, current + 1);
    });
  };

  const handleResetReplay = () => {
    setIsPlaying(false);
    setReplayIndex(backtestStartIndex ?? 0);
  };

  // Sync state to DB helper
  const syncToDatabase = useCallback(
    async (overrides?: {
      newStrategy?: StrategyContract;
      newParams?: Record<string, any>;
      newVersion?: number;
      newMessages?: typeof messages;
      newSymbol?: string;
      newTimeframe?: Timeframe;
    }) => {
      try {
        const payload = {
          name: projectName,
          symbol: overrides?.newSymbol ?? symbol,
          timeframe: overrides?.newTimeframe ?? timeframe,
          strategy: overrides?.newStrategy ?? strategy,
          activeParams: overrides?.newParams ?? activeParams,
          version: overrides?.newVersion ?? currentVersion,
          messages: overrides?.newMessages ?? messages,
        };

        // Also save to localStorage immediately for instant offline resilience
        try {
          localStorage.setItem(`fs_project_${projectId}`, JSON.stringify(payload));
          localStorage.setItem(`fs_indicators_${projectId}`, JSON.stringify(indicators));
          localStorage.setItem(`fs_chartType_${projectId}`, chartType);
        } catch (e) {}

        // Persist to Postgres database via API
        await fetch(`/flexStrategy/api/project/${projectId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('Background sync failed:', err);
      }
    },
    [projectId, projectName, symbol, timeframe, strategy, activeParams, currentVersion, messages, indicators, chartType]
  );

  // Load project from DB on initial mount
  useEffect(() => {
    let mounted = true;

    // 1. Immediately hydrate indicators and chartType from localStorage
    try {
      const savedInds = localStorage.getItem(`fs_indicators_${projectId}`);
      if (savedInds) {
        const parsed = JSON.parse(savedInds);
        if (Array.isArray(parsed)) {
          setIndicators(parsed);
        }
      }
      const savedChartType = localStorage.getItem(`fs_chartType_${projectId}`);
      if (savedChartType === 'candles' || savedChartType === 'line') {
        setChartType(savedChartType);
      }
    } catch (e) {}

    // 2. Fetch project, versions, and chat messages from Postgres database
    fetch(`/flexStrategy/api/project/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data?.project) return;
        const p = data.project;

        if (p.symbol && p.symbol !== symbol) setSymbol(p.symbol);
        if (p.timeframe && p.timeframe !== timeframe) setTimeframe(p.timeframe as Timeframe);

        // Hydrate versions if existing
        if (Array.isArray(p.versions) && p.versions.length > 0) {
          const loadedVersions = p.versions.map((v: any) => {
            const hasExecutableCode = v.code && !v.code.includes('function onBar(ctx) { ... }') && v.code.includes('onBar');
            const safeCode = hasExecutableCode ? v.code : defaultStrategy.code;
            return {
              version: v.version,
              name: v.name,
              createdBy: v.createdBy,
              createdAt: new Date(v.createdAt),
              strategy: {
                name: v.name,
                params: Array.isArray(v.paramsSchema) && v.paramsSchema.length > 0 ? v.paramsSchema : defaultStrategy.params,
                code: safeCode,
              },
              params: (typeof v.params === 'object' && v.params && Object.keys(v.params).length > 0) ? v.params : { lookbackBars: 12, slPips: 4.5, tpPips: 9.0 },
            };
          });

          setVersions(loadedVersions);

          // Find highest version or active
          const latest = loadedVersions[loadedVersions.length - 1];
          if (latest) {
            setStrategy(latest.strategy);
            setActiveParams(latest.params);
            setCurrentVersion(latest.version);
            strategyCodeRef.current = latest.strategy.code;
            activeParamsRef.current = latest.params;

            // Do not auto-run simulation on project load unless explicitly requested by user
          }
        }

        // Hydrate chat messages if existing
        if (Array.isArray(p.messages) && p.messages.length > 0) {
          setMessages(
            p.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              toolStatus: m.toolStatus,
              versionCreated: m.versionCreated,
            }))
          );
        }

        // Hydrate drawings if saved in database or fallback to localStorage
        if (Array.isArray(p.chartDrawings) && p.chartDrawings.length > 0) {
          setDrawings(p.chartDrawings);
        } else {
          try {
            const saved = localStorage.getItem(`fs_drawings_${projectId}_${p.symbol || symbol}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setDrawings(parsed);
              }
            }
          } catch (e) {}
        }
      })
      .catch((err) => console.warn('Could not load project from DB:', err));

    return () => {
      mounted = false;
    };
  }, [projectId]);

  // Persist indicator changes
  const handleAddIndicator = (config: ChartIndicatorConfig) => {
    setIndicators((prev) => {
      const next = [...prev, config];
      try {
        localStorage.setItem(`fs_indicators_${projectId}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    toast.success(`Added ${config.name} to chart`);
  };

  const handleRemoveIndicator = (id: string) => {
    setIndicators((prev) => {
      const next = prev.filter((i) => i.id !== id);
      try {
        localStorage.setItem(`fs_indicators_${projectId}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleUpdateIndicator = (updatedConfig: ChartIndicatorConfig) => {
    setIndicators((prev) => {
      const next = prev.map((i) => (i.id === updatedConfig.id ? updatedConfig : i));
      try {
        localStorage.setItem(`fs_indicators_${projectId}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    toast.success(`Updated ${updatedConfig.name}`);
  };

  const handleToggleIndicatorVisibility = (id: string) => {
    setIndicators((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i));
      try {
        localStorage.setItem(`fs_indicators_${projectId}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Persist chart type change
  const handleChartTypeChange = (type: 'candles' | 'line') => {
    setChartType(type);
    try {
      localStorage.setItem(`fs_chartType_${projectId}`, type);
    } catch (e) {}
  };

  // Persist symbol or timeframe change
  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    syncToDatabase({ newSymbol });
  };

  const handleTimeframeChange = (newTf: Timeframe) => {
    setTimeframe(newTf);
    syncToDatabase({ newTimeframe: newTf });
  };

  // Parameters adjustment callback (debounced from panel)
  const handleParamsChange = useCallback(
    (newParams: Record<string, any>) => {
      setActiveParams(newParams);
      activeParamsRef.current = newParams;
      handleRunSimulation(strategyCodeRef.current, newParams);
      syncToDatabase({ newParams });
    },
    [handleRunSimulation, syncToDatabase]
  );

  // AI Chat send message handler with automatic DB persistence
  const handleSendMessage = async (text: string) => {
    const userMsgId = 'user-' + Date.now();
    const newMsgs = [...messages, { id: userMsgId, role: 'user' as const, content: text }];
    setMessages(newMsgs);
    setIsAiLoading(true);

    try {
      const res = await fetch('/flexStrategy/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
          currentStrategy: strategy,
          currentParams: activeParams,
          statsContext: simulation.stats,
          symbol,
          timeframe,
          startPoint: backtestStartIndex,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const responseText = await res.text();
      const extracted = extractStrategyJson(responseText);

      let versionCreated: number | null = null;
      let updatedStrategy = strategy;
      let updatedParams = activeParams;
      let nextVer = currentVersion;

      if (extracted) {
        nextVer = currentVersion + 1;
        versionCreated = nextVer;

        // Extract default params
        const newParamValues: Record<string, any> = {};
        extracted.params.forEach((p) => {
          newParamValues[p.key] = p.default;
        });

        updatedStrategy = extracted;
        updatedParams = newParamValues;

        setStrategy(extracted);
        setActiveParams(newParamValues);
        setCurrentVersion(nextVer);
        strategyCodeRef.current = extracted.code;
        activeParamsRef.current = newParamValues;

        setVersions((prev) => [
          ...prev,
          {
            version: nextVer,
            name: extracted.name,
            createdBy: 'ai',
            createdAt: new Date(),
            strategy: extracted,
            params: newParamValues,
          },
        ]);

        // Auto-run simulation on new script
        handleRunSimulation(extracted.code, newParamValues);
        toast.success(`Generated version v${nextVer} of ${extracted.name}!`);
      }

      const assistantMsg = {
        id: 'ai-' + Date.now(),
        role: 'assistant' as const,
        content: responseText.replace(/```json[\s\S]*?```/g, '').trim() || 'Strategy updated successfully.',
        versionCreated,
      };

      const finalMessages = [...newMsgs, assistantMsg];
      setMessages(finalMessages);

      // Save everything (strategy version, parameters, messages) to Postgres DB
      syncToDatabase({
        newStrategy: updatedStrategy,
        newParams: updatedParams,
        newVersion: nextVer,
        newMessages: finalMessages,
      });
    } catch (err: any) {
      toast.error(`Copilot error: ${err?.message || String(err)}`);
      const errMsg = {
        id: 'err-' + Date.now(),
        role: 'assistant' as const,
        content: `Error communicating with AI: ${err?.message || 'Request failed'}.`,
      };
      const finalMsgs = [...newMsgs, errMsg];
      setMessages(finalMsgs);
      syncToDatabase({ newMessages: finalMsgs });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Rollback to prior version
  const handleRollbackVersion = (targetVer: number) => {
    const v = versions.find((item) => item.version === targetVer);
    if (!v) return;

    setStrategy(v.strategy);
    setActiveParams(v.params);
    setCurrentVersion(targetVer);
    strategyCodeRef.current = v.strategy.code;
    activeParamsRef.current = v.params;
    handleRunSimulation(v.strategy.code, v.params);
    toast.info(`Rolled back to v${targetVer} (${v.name})`);

    syncToDatabase({
      newStrategy: v.strategy,
      newParams: v.params,
      newVersion: targetVer,
    });
  };

  // Upload custom CSV
  const handleUploadCsv = (csvText: string) => {
    try {
      const { candles: parsed, meta } = parseCandleCsv(csvText, symbol);
      if (parsed.length > 5) {
        setBaseDataset(symbol, parsed, meta, projectId);
        setCandles(parsed);
        setBaseDatasetMeta(meta);
        setTimeframe(meta.baseTimeframe);
        toast.success(`Imported ${parsed.length.toLocaleString()} candles for ${symbol} (${meta.baseTimeframe} base, ${meta.startDate} → ${meta.endDate})!`);
      } else {
        toast.error('File has too few valid rows.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to parse candle data.');
    }
  };

  // 1. Current replay bar time
  const currentReplayIndex = replayIndex != null ? replayIndex : candles.length - 1;
  const currentCandle = candles[currentReplayIndex];
  const currentTime = currentCandle ? currentCandle.time : 0;

  // 2. Active running position at current candle (supports replay and end-of-data)
  const activeReplayPosition = React.useMemo<ActivePosition | null>(() => {
    if (!hasUserRunTest || candles.length === 0 || !currentTime) return null;

    // Replay mode: find trade that is open at currentTime
    if (replayIndex != null) {
      const openTrade = simulation.trades.find(
        (t) => t.entryTime <= currentTime && t.exitTime > currentTime
      );
      if (openTrade) {
        return {
          side: openTrade.side,
          entryPrice: openTrade.entryPrice,
          entryTime: openTrade.entryTime,
          sl: openTrade.sl,
          tp: openTrade.tp,
          barIndex: candles.findIndex((c) => c.time === openTrade.entryTime),
        };
      }
      return null;
    }

    // Full backtest completed (not in replay):
    // Check if simulation ended with an active open position
    if (simulation.runningPosition) return simulation.runningPosition;
    const lastTrade = simulation.trades[simulation.trades.length - 1];
    if (lastTrade && lastTrade.reason === 'END_OF_DATA') {
      return {
        side: lastTrade.side,
        entryPrice: lastTrade.entryPrice,
        entryTime: lastTrade.entryTime,
        sl: lastTrade.sl,
        tp: lastTrade.tp,
        barIndex: candles.findIndex((c) => c.time === lastTrade.entryTime),
      };
    }
    return null;
  }, [hasUserRunTest, replayIndex, currentTime, candles, simulation.trades, simulation.runningPosition]);

  // 3. Completed trades up to current time (so future trades aren't in History while replaying)
  const visibleCompletedTrades = React.useMemo(() => {
    if (!hasUserRunTest || candles.length === 0) return [];
    if (replayIndex != null && currentTime) {
      return simulation.trades.filter((t) => t.exitTime <= currentTime);
    }
    // When at full history, if last trade is an active position (END_OF_DATA), filter it out of completed trades so it doesn't duplicate
    if (activeReplayPosition) {
      return simulation.trades.filter((t) => t.reason !== 'END_OF_DATA');
    }
    return simulation.trades;
  }, [hasUserRunTest, replayIndex, currentTime, simulation.trades, activeReplayPosition, candles.length]);

  // 4. Dynamic stats for bottom tabs & replay
  const visibleStatsResult = React.useMemo(() => {
    if (!hasUserRunTest || visibleCompletedTrades.length === 0) {
      const empty = calculateSimulationStats([], 10000, candles);
      return { stats: empty.stats, equityCurve: empty.equityCurve };
    }
    if (replayIndex == null) {
      return { stats: simulation.stats, equityCurve: simulation.equityCurve };
    }
    return calculateSimulationStats(visibleCompletedTrades, 10000, candles);
  }, [hasUserRunTest, replayIndex, simulation.stats, simulation.equityCurve, visibleCompletedTrades, candles]);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-white overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <header className="h-12 border-b border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/flexStrategy/dashboard"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span className="text-xs font-semibold">Projects</span>
          </Link>
          <span className="text-zinc-600">/</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">{projectName}</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 border border-zinc-800 text-blue-400 font-mono">
              v{currentVersion}
            </span>
          </div>
        </div>

        {/* Top Header Center: Single Mode Toggle Button */}
        <button
          type="button"
          onClick={() => handleModeChange(workspaceMode === 'strategy' ? 'backtest' : 'strategy')}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
            workspaceMode === 'backtest'
              ? 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600/30'
              : 'bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30'
          }`}
          title={`Currently in ${workspaceMode === 'strategy' ? 'Strategy' : 'Backtest'} Mode. Click to switch to ${workspaceMode === 'strategy' ? 'Backtest' : 'Strategy'} Mode.`}
        >
          <span className="material-symbols-outlined text-sm">
            {workspaceMode === 'strategy' ? 'tune' : 'history_toggle_off'}
          </span>
          <span>{workspaceMode === 'strategy' ? 'Strategy Mode' : 'Backtest Mode'}</span>
          {workspaceMode === 'backtest' && visibleCompletedTrades.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-purple-950 text-purple-200 border border-purple-500/40">
              {visibleCompletedTrades.length}
            </span>
          )}
          <span className="material-symbols-outlined text-xs text-zinc-400">sync_alt</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Toggle Parameters Sidebar */}
          <button
            type="button"
            onClick={toggleParamsCollapse}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              !isParamsCollapsed
                ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title={isParamsCollapsed ? 'Expand Parameters Sidebar' : 'Collapse Parameters Sidebar'}
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            <span>Parameters</span>
          </button>

          {/* Toggle AI Copilot Sidebar */}
          <button
            type="button"
            onClick={toggleChatCollapse}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              !isChatCollapsed
                ? 'bg-purple-600/15 border-purple-500/30 text-purple-400'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title={isChatCollapsed ? 'Expand AI Copilot Sidebar' : 'Collapse AI Copilot Sidebar'}
          >
            <span className="material-symbols-outlined text-sm">smart_toy</span>
            <span>AI Copilot</span>
          </button>

          <div className="w-px h-4 bg-zinc-800 mx-1" />

          {/* Top Nav Save Chart Button */}
          <button
            type="button"
            onClick={handleSaveChart}
            disabled={isSavingChart}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm ${
              isChartSaved
                ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25'
                : 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white shadow-blue-500/20 active:scale-95'
            }`}
            title="Save chart layout and drawings to database"
          >
            {isSavingChart ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span>Saving...</span>
              </>
            ) : isChartSaved ? (
              <>
                <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                <span>Saved</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">cloud_upload</span>
                <span>Save Chart</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm text-blue-400">ios_share</span>
            Export
          </button>
        </div>
      </header>

      {/* Main 3-Panel Body Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left/Center Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chart Toolbar */}
          <ChartToolbar
            symbol={symbol}
            onSymbolChange={handleSymbolChange}
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
            isPlaying={isPlaying}
            onPlayToggle={handlePlayToggle}
            onStepForward={handleStepForward}
            onResetReplay={handleResetReplay}
            replaySpeed={replaySpeed}
            onSpeedChange={setReplaySpeed}
            onRunStrategy={() => handleRunSimulation(undefined, undefined, true)}
            isRunning={isRunning}
            onUploadCsv={handleUploadCsv}
            onOpenIndicators={() => setIsIndicatorsOpen(true)}
            activeIndicatorsCount={indicators.filter((i) => i.visible).length}
            chartType={chartType}
            onChartTypeChange={handleChartTypeChange}
            backtestStartIndex={backtestStartIndex}
            isSelectingStartPoint={isSelectingStartPoint}
            onToggleSelectStartPoint={() => setIsSelectingStartPoint((prev) => !prev)}
            onResetStartPoint={handleResetStartPoint}
            onClearTest={handleClearTest}
            baseDatasetMeta={baseDatasetMeta}
            hasTrades={simulation.trades.length > 0 || simulation.runningPosition != null}
            onScreenshot={handleScreenshot}
            isCapturingScreenshot={isCapturingScreenshot}
          />

          {/* Backtest & Bar Replay Controller Bar (Docked directly above chart canvas in Backtest Mode) */}
          {workspaceMode === 'backtest' && (
            <BacktestReplayBar
              candlesCount={candles.length}
              currentReplayIndex={currentReplayIndex}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onPlayToggle={handlePlayToggle}
              onStepForward={handleStepForward}
              onResetReplay={handleResetReplay}
              replaySpeed={replaySpeed}
              onSpeedChange={setReplaySpeed}
              backtestStartIndex={backtestStartIndex}
              isSelectingStartPoint={isSelectingStartPoint}
              onToggleSelectStartPoint={() => setIsSelectingStartPoint((prev) => !prev)}
              onResetStartPoint={handleResetStartPoint}
              onRunStrategy={() => handleRunSimulation(undefined, undefined, true)}
              isRunning={isRunning}
              onClearTest={handleClearTest}
              hasTrades={visibleCompletedTrades.length > 0 || simulation.runningPosition != null}
              tradesCount={visibleCompletedTrades.length}
              netProfit={visibleStatsResult.stats.netProfit}
              winRate={visibleStatsResult.stats.winRate}
              onExitBacktestMode={() => handleModeChange('strategy')}
              onToggleTester={() => setTesterHeight((prev) => (prev === 'minimized' ? 'normal' : 'minimized'))}
              isTesterOpen={testerHeight !== 'minimized'}
              candles={candles}
              onSelectStartPoint={handleSelectStartPoint}
            />
          )}

          {/* Center Chart */}
          <div className="flex-1 relative min-h-0 bg-zinc-950">

            <CandlestickChart
              candles={candles}
              trades={visibleCompletedTrades}
              runningPosition={activeReplayPosition}
              selectedTrade={selectedTrade}
              onSelectTrade={setSelectedTrade}
              replayIndex={replayIndex}
              indicators={indicators}
              onUpdateIndicator={handleUpdateIndicator}
              onRemoveIndicator={handleRemoveIndicator}
              onToggleIndicatorVisibility={handleToggleIndicatorVisibility}
              symbol={symbol}
              timeframe={timeframe}
              chartType={chartType}
              projectId={projectId}
              initialDrawings={drawings}
              onSaveDrawings={handleSaveDrawings}
              backtestStartIndex={backtestStartIndex}
              isSelectingStartPoint={isSelectingStartPoint}
              onSelectStartPoint={handleSelectStartPoint}
              onCancelSelectStartPoint={() => setIsSelectingStartPoint(false)}
              baseDatasetMeta={baseDatasetMeta}
              screenshotRef={screenshotRef}
            />
          </div>

          {/* Bottom Tabs Strip (Closed / Minimized by default) */}
          <BottomTabs
            trades={visibleCompletedTrades}
            runningPosition={activeReplayPosition}
            currentPrice={candles[currentReplayIndex]?.close}
            symbol={symbol}
            stats={visibleStatsResult.stats}
            equityCurve={visibleStatsResult.equityCurve}
            versions={versions}
            activeVersion={currentVersion}
            onRollbackVersion={handleRollbackVersion}
            selectedTrade={selectedTrade}
            onSelectTrade={setSelectedTrade}
            strategyCode={strategy.code}
            onClearTest={handleClearTest}
            panelHeight={testerHeight}
            onPanelHeightChange={setTesterHeight}
          />
        </div>

        {/* Floating / Side Parameters Panel */}
        <ParametersPanel
          schema={strategy.params}
          values={activeParams}
          onChange={handleParamsChange}
          strategyName={strategy.name}
          isCollapsed={isParamsCollapsed}
          onToggleCollapse={toggleParamsCollapse}
        />

        {/* Right AI Copilot Chat Panel */}
        <StrategyChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isAiLoading}
          currentVersion={currentVersion}
          activeStrategy={strategy}
          stats={simulation.stats}
          isCollapsed={isChatCollapsed}
          onToggleCollapse={toggleChatCollapse}
        />
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        strategy={strategy}
      />

      {/* Technical Indicators Modal */}
      <IndicatorsModal
        isOpen={isIndicatorsOpen}
        onClose={() => setIsIndicatorsOpen(false)}
        indicators={indicators}
        onAddIndicator={handleAddIndicator}
        onUpdateIndicator={handleUpdateIndicator}
        onRemoveIndicator={handleRemoveIndicator}
        onToggleVisibility={handleToggleIndicatorVisibility}
      />

      {/* Chart Screenshot Preview Modal */}
      <ChartScreenshotModal
        isOpen={isScreenshotModalOpen}
        onClose={() => setIsScreenshotModalOpen(false)}
        screenshotUrl={capturedScreenshotUrl}
        filename={screenshotFilename}
        symbol={symbol}
        timeframe={timeframe}
      />
    </div>
  );
}
