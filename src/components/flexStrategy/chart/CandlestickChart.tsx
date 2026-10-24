"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ICandle, CompletedTrade, ActivePosition, Timeframe } from '@/lib/flexStrategy/engine/types';
import {
  ChartIndicatorConfig,
  formatIndicatorTitle,
  computeLiveIndicatorValue,
} from '@/lib/flexStrategy/chart/indicators';
import {
  KLineChartAdapter,
  IChartAdapter,
  ChartDrawingSpec,
  IndicatorSpec,
} from '@/lib/chart/ChartAdapter';
import { ChartDrawing, DrawingToolType } from '@/lib/flexStrategy/chart/drawingTypes';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';
import { toast } from 'sonner';

export const TRADINGVIEW_PALETTE = [
  { label: 'Royal Blue', hex: '#2962FF' },
  { label: 'Emerald Green', hex: '#089981' },
  { label: 'Crimson Red', hex: '#f23645' },
  { label: 'Amber Orange', hex: '#ff9800' },
  { label: 'Purple', hex: '#ab47bc' },
  { label: 'Cyan', hex: '#00bcd4' },
  { label: 'White', hex: '#ffffff' },
  { label: 'Slate Gray', hex: '#787b86' },
];

export function TradingViewToolIcon({
  tool,
  className = 'w-4 h-4',
}: {
  tool: string;
  className?: string;
}) {
  switch (tool) {
    case 'cursor':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="1.75" fill="currentColor" stroke="none" />
          <line x1="12" y1="3" x2="12" y2="8" strokeWidth="1.7" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12" y2="21" strokeWidth="1.7" strokeLinecap="round" />
          <line x1="3" y1="12" x2="8" y2="12" strokeWidth="1.7" strokeLinecap="round" />
          <line x1="16" y1="12" x2="21" y2="12" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );

    case 'trendline':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <line x1="4.5" y1="19.5" x2="19.5" y2="4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="4.5" cy="19.5" r="2.25" fill="#131722" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="19.5" cy="4.5" r="2.25" fill="#131722" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );

    case 'horizontal':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.5" fill="#131722" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );

    case 'vertical':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.5" fill="#131722" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );

    case 'ray':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <line x1="4.5" y1="19.5" x2="20" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="4.5" cy="19.5" r="2.25" fill="#131722" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          <path d="M14 4h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'rectangle':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3.5" y="6" width="17" height="12" rx="1.5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="3.5" cy="6" r="1.5" fill="currentColor" />
          <circle cx="20.5" cy="18" r="1.5" fill="currentColor" />
        </svg>
      );

    case 'fibonacci':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <line x1="2" y1="4.5" x2="22" y2="4.5" stroke="currentColor" strokeWidth="1.6" />
          <line x1="2" y1="9.5" x2="22" y2="9.5" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
          <line x1="2" y1="14.5" x2="22" y2="14.5" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
          <line x1="2" y1="19.5" x2="22" y2="19.5" stroke="currentColor" strokeWidth="1.6" />
          <rect x="2" y="9.5" width="20" height="5" fill="currentColor" fillOpacity="0.25" />
          <line x1="5" y1="19.5" x2="19" y2="4.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 2" />
          <circle cx="5" cy="19.5" r="1.8" fill="currentColor" />
          <circle cx="19" cy="4.5" r="1.8" fill="currentColor" />
        </svg>
      );

    case 'long_position':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="4" width="18" height="8" rx="1.5" fill="#089981" fillOpacity="0.35" stroke="#089981" strokeWidth="1.5" />
          <rect x="3" y="12" width="18" height="8" rx="1.5" fill="#f23645" fillOpacity="0.35" stroke="#f23645" strokeWidth="1.5" />
          <line x1="1.5" y1="12" x2="22.5" y2="12" stroke="#2962FF" strokeWidth="1.8" />
          <path d="M12 9.5V6.5M12 6.5L10 8.5M12 6.5L14 8.5" stroke="#089981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'short_position':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="4" width="18" height="8" rx="1.5" fill="#f23645" fillOpacity="0.35" stroke="#f23645" strokeWidth="1.5" />
          <rect x="3" y="12" width="18" height="8" rx="1.5" fill="#089981" fillOpacity="0.35" stroke="#089981" strokeWidth="1.5" />
          <line x1="1.5" y1="12" x2="22.5" y2="12" stroke="#2962FF" strokeWidth="1.8" />
          <path d="M12 14.5V17.5M12 17.5L10 15.5M12 17.5L14 15.5" stroke="#089981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'text':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <path d="M5 5h14v3.5h-5.25V19h-3.5V8.5H5V5z" />
        </svg>
      );

    case 'measure':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
          <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" strokeWidth="1.4" strokeDasharray="2.5 2" fill="currentColor" fillOpacity="0.12" />
          <path d="M8 7.5v9M6.5 9.5L8 7.5l1.5 2M6.5 14.5L8 16.5l1.5-2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11.5 12h5M13.5 10.5L11.5 12l2 1.5M14.5 10.5L16.5 12l-2 1.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'marker':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
          <path d="M12 21.5c-3.5-3.5-7-7.5-7-11.5a7 7 0 1 1 14 0c0 4-3.5 8-7 11.5z" strokeWidth="1.8" />
          <circle cx="12" cy="10" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 4v16m-8-8h16" strokeLinecap="round" />
        </svg>
      );
  }
}

function getDrawingLabel(type: string): string {
  switch (type) {
    case 'trendline': return 'Trend Line';
    case 'horizontal': return 'Horizontal Line';
    case 'vertical': return 'Vertical Line';
    case 'ray': return 'Ray Line';
    case 'rectangle': return 'Rectangle';
    case 'fibonacci': return 'Fibonacci';
    case 'long_position': return 'Long Position';
    case 'short_position': return 'Short Position';
    case 'measure': return 'Measure';
    case 'marker': return 'Marker / Stamp';
    case 'text': return 'Text';
    default: return 'Drawing';
  }
}

interface CandlestickChartProps {
  candles: ICandle[];
  trades?: CompletedTrade[];
  runningPosition?: ActivePosition | null;
  selectedTrade?: CompletedTrade | null;
  onSelectTrade?: (trade: CompletedTrade | null) => void;
  replayIndex?: number | null;
  indicators?: ChartIndicatorConfig[];
  onUpdateIndicator?: (config: ChartIndicatorConfig) => void;
  onRemoveIndicator?: (id: string) => void;
  onToggleIndicatorVisibility?: (id: string) => void;
  symbol?: string;
  timeframe?: string;
  chartType?: 'candles' | 'line';
  projectId?: string;
  initialDrawings?: ChartDrawing[];
  onSaveDrawings?: (drawings: ChartDrawing[]) => void;
  // Start point selection
  backtestStartIndex?: number | null;
  isSelectingStartPoint?: boolean;
  onSelectStartPoint?: (index: number) => void;
  onCancelSelectStartPoint?: () => void;
  baseDatasetMeta?: {
    symbol: string;
    baseTimeframe: Timeframe;
    count: number;
    startDate: string;
    endDate: string;
  } | null;
  screenshotRef?: React.MutableRefObject<(() => Promise<string>) | null>;
}

export function CandlestickChart({
  candles,
  trades = [],
  runningPosition = null,
  selectedTrade,
  onSelectTrade,
  replayIndex,
  indicators = [],
  onUpdateIndicator,
  onRemoveIndicator,
  onToggleIndicatorVisibility,
  symbol = 'XAUUSD',
  timeframe = '5m',
  chartType = 'candles',
  projectId,
  initialDrawings,
  onSaveDrawings,
  backtestStartIndex,
  isSelectingStartPoint = false,
  onSelectStartPoint,
  onCancelSelectStartPoint,
  baseDatasetMeta,
  screenshotRef,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<IChartAdapter | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);

  // Left vertical drawing toolbar states
  const [activeTool, setActiveTool] = useState<DrawingToolType>('cursor');
  const [isLocked, setIsLocked] = useState(false);
  const [isDrawingsHidden, setIsDrawingsHidden] = useState(false);
  const [drawings, setDrawings] = useState<ChartDrawingSpec[]>([]);
  const [selectedMarkerSymbol, setSelectedMarkerSymbol] = useState<string>('🎯');
  const [isMarkerMenuOpen, setIsMarkerMenuOpen] = useState(false);

  // OHLC & Indicator hover legend state
  const [hoveredCandle, setHoveredCandle] = useState<ICandle | null>(null);
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);
  const hoveredCandleIndexRef = useRef<number | null>(null);
  const isSelectingStartPointRef = useRef(isSelectingStartPoint);
  isSelectingStartPointRef.current = isSelectingStartPoint;
  const onSelectStartPointRef = useRef(onSelectStartPoint);
  onSelectStartPointRef.current = onSelectStartPoint;
  const [countdownText, setCountdownText] = useState<string>('');
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);

  // Active indicator being edited in settings modal
  const [editingIndicator, setEditingIndicator] = useState<ChartIndicatorConfig | null>(null);
  const [hoveredIndicatorId, setHoveredIndicatorId] = useState<string | null>(null);

  // Selected Drawing for TradingView floating quick properties toolbar
  const [selectedDrawing, setSelectedDrawing] = useState<ChartDrawingSpec | null>(null);
  const [isDrawingColorPickerOpen, setIsDrawingColorPickerOpen] = useState(false);
  const [isThicknessPickerOpen, setIsThicknessPickerOpen] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Track chart dragging state to display folding hand (grabbing) cursor
  const [isDraggingChart, setIsDraggingChart] = useState(false);

  // Context-aware drawing interaction states for authentic TradingView cursors
  const [isHoveringDrawing, setIsHoveringDrawing] = useState(false);
  const [isHoveringPoint, setIsHoveringPoint] = useState(false);
  const [isMovingDrawing, setIsMovingDrawing] = useState(false);

  const isHoveringDrawingRef = useRef(false);
  const isHoveringPointRef = useRef(false);
  const isMovingDrawingRef = useRef(false);

  // Handle drag / pan folding hand (grabbing), axis resize (ns/ew-resize), and tool move cursors
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMouseDown = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let dragType: 'none' | 'y-axis' | 'x-axis' | 'drawing' | 'canvas-pan' = 'none';

    const handlePointerDown = (e: PointerEvent) => {
      // Left click only
      if (e.button !== 0) return;

      // Handle start point selection click anywhere on the chart canvas
      if (isSelectingStartPointRef.current) {
        const rect = container.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const exactIndex = adapterRef.current?.getDataIndexFromCoordinates(relX, relY);
        const chosenIdx = exactIndex != null
          ? Math.max(0, Math.min(displayedCandles.length - 1, exactIndex))
          : (hoveredCandleIndexRef.current ?? (displayedCandles.length > 0 ? displayedCandles.length - 1 : 0));

        if (onSelectStartPointRef.current) {
          e.stopPropagation();
          e.preventDefault();
          onSelectStartPointRef.current(chosenIdx);
          return;
        }
      }

      if (activeTool !== 'cursor') return;

      const rect = container.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;

      // Price scale (Y-axis) is at right edge (~70px)
      const isOverYAxis = relX >= rect.width - 70;
      // Time scale (X-axis) is at bottom edge (~28px)
      const isOverXAxis = relY >= rect.height - 28;
      // Moving a drawing or handle
      const isOverDrawing = isMovingDrawingRef.current || isHoveringDrawingRef.current || isHoveringPointRef.current;

      isMouseDown = true;
      startX = e.clientX;
      startY = e.clientY;

      if (isOverYAxis) {
        dragType = 'y-axis';
      } else if (isOverXAxis) {
        dragType = 'x-axis';
      } else if (isOverDrawing) {
        dragType = 'drawing';
      } else {
        dragType = 'canvas-pan';
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (isSelectingStartPointRef.current) {
        const rect = container.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const exactIndex = adapterRef.current?.getDataIndexFromCoordinates(relX, relY);
        const chosenIdx = exactIndex != null
          ? Math.max(0, Math.min(displayedCandles.length - 1, exactIndex))
          : (hoveredCandleIndexRef.current ?? (displayedCandles.length > 0 ? displayedCandles.length - 1 : 0));

        if (onSelectStartPointRef.current) {
          e.stopPropagation();
          e.preventDefault();
          onSelectStartPointRef.current(chosenIdx);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isMouseDown) return;
      if (activeTool !== 'cursor') return;

      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);

      // Once mouse moves slightly while pressed down, activate appropriate drag cursor
      if (dx > 2 || dy > 2) {
        if (!isDragging) {
          isDragging = true;
          document.body.style.userSelect = 'none';

          if (dragType === 'y-axis') {
            document.body.style.cursor = 'ns-resize';
            setIsDraggingChart(false);
          } else if (dragType === 'x-axis') {
            document.body.style.cursor = 'ew-resize';
            setIsDraggingChart(false);
          } else if (dragType === 'drawing') {
            document.body.style.cursor = isHoveringPointRef.current ? 'crosshair' : 'move';
            setIsDraggingChart(false);
          } else {
            // Normal chart canvas panning with folding hand
            setIsDraggingChart(true);
            document.body.style.cursor = 'grabbing';
          }
        }
      }
    };

    const handlePointerUp = () => {
      isMouseDown = false;
      dragType = 'none';
      if (isDragging) {
        isDragging = false;
        setIsDraggingChart(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    container.addEventListener('pointerdown', handlePointerDown, { capture: true });
    container.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      container.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [activeTool]);

  // Initialize KLineChartAdapter
  useEffect(() => {
    if (!containerRef.current) return;

    const adapter = new KLineChartAdapter(containerRef.current, {
      timeframe: timeframe as any,
    });
    adapterRef.current = adapter;

    // Listen to crosshair changes to update live OHLC & live indicator readouts
    adapter.onCrosshairChange(({ candle, dataIndex }) => {
      setHoveredCandle(candle ?? null);
      setHoveredCandleIndex(dataIndex ?? null);
      hoveredCandleIndexRef.current = dataIndex ?? null;
    });

    // Listen to drawing selection for the floating TradingView properties toolbar
    adapter.onDrawingSelect((drawing) => {
      setSelectedDrawing(drawing);
    });

    // Listen to drawing hover state for cursor updates
    adapter.onDrawingHover((isHovering, figureType) => {
      const isPoint = figureType === 'point';
      isHoveringDrawingRef.current = isHovering;
      isHoveringPointRef.current = isHovering && isPoint;
      setIsHoveringDrawing(isHovering);
      setIsHoveringPoint(isHovering && isPoint);
    });

    // Listen to drawing moving state for move cursor
    adapter.onDrawingMoveState((isMoving, figureType) => {
      isMovingDrawingRef.current = isMoving;
      setIsMovingDrawing(isMoving);
      if (isMoving) {
        document.body.style.cursor = figureType === 'point' ? 'crosshair' : 'move';
      } else {
        document.body.style.cursor = '';
      }
    });

    // Listen to drawing changes and forward to persistence
    adapter.onDrawingChange((updatedDrawings) => {
      setDrawings(updatedDrawings);
      // Map to project drawing format with full properties
      const mappedDrawings: ChartDrawing[] = updatedDrawings.map((d) => ({
        id: d.id,
        type: d.type as any,
        points: d.points.map((p) => ({ time: p.time, price: p.price })),
        color: d.color,
        fillColor: d.fillColor,
        lineWidth: d.lineWidth,
        lineStyle: d.lineStyle,
        entryPrice: d.entryPrice,
        slPrice: d.slPrice,
        tpPrice: d.tpPrice,
        text: d.text,
        markerSymbol: d.markerSymbol,
        lock: d.lock,
      }));
      onSaveDrawings?.(mappedDrawings);
    });

    return () => {
      adapter.destroy();
      adapterRef.current = null;
    };
  }, []); // Run once on mount

  // Memoize visible candle slice depending on replayIndex for true TradingView bar replay
  const displayedCandles = React.useMemo(() => {
    if (replayIndex == null) return candles;
    return candles.slice(0, Math.min(candles.length, replayIndex + 1));
  }, [candles, replayIndex]);

  // Active Candle for OHLC Header and Snapshot (respects bar replay & hover)
  const activeCandle = hoveredCandle || (displayedCandles.length > 0 ? displayedCandles[displayedCandles.length - 1] : null);

  // Play subtle synthetic camera shutter click sound via native Web Audio
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // AudioContext blocked or not supported
    }
  }, []);

  // Hook up screenshotRef for taking chart snapshot with full-spectrum chart metadata
  useEffect(() => {
    if (screenshotRef) {
      screenshotRef.current = async () => {
        if (!adapterRef.current) return '';
        setIsFlashActive(true);
        playShutterSound();
        setTimeout(() => setIsFlashActive(false), 250);

        // Map live indicator metrics to pass exact values visible on screen
        const indData = indicators
          .filter((ind) => ind.visible !== false)
          .map((ind) => ({
            id: ind.id,
            name: ind.name,
            title: formatIndicatorTitle(ind),
            color: ind.color,
            value: computeLiveIndicatorValue(
              ind,
              displayedCandles,
              hoveredCandleIndex ?? (displayedCandles.length - 1)
            ),
            visible: ind.visible,
          }));

        const candleData = activeCandle
          ? {
              open: activeCandle.open,
              high: activeCandle.high,
              low: activeCandle.low,
              close: activeCandle.close,
              volume: activeCandle.volume,
            }
          : null;

        return await adapterRef.current.takeScreenshot({
          symbol,
          timeframe,
          baseDatasetMeta,
          candle: candleData,
          indicators: indData,
          countdownText,
        });
      };
    }
    return () => {
      if (screenshotRef) {
        screenshotRef.current = null;
      }
    };
  }, [
    screenshotRef,
    symbol,
    timeframe,
    baseDatasetMeta,
    activeCandle,
    indicators,
    displayedCandles,
    hoveredCandleIndex,
    countdownText,
    playShutterSound,
  ]);

  // Sync Candles (respects Bar Replay)
  useEffect(() => {
    if (adapterRef.current && displayedCandles.length > 0) {
      adapterRef.current.setCandles(displayedCandles);
    }
  }, [displayedCandles]);

  // Sync Timeframe
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.setTimeframe(timeframe as any);
    }
  }, [timeframe]);

  // Sync Chart Type (candles vs line/area)
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.setChartType(chartType);
    }
  }, [chartType]);

  // Track previously rendered indicator instances to diff additions, removals, and updates
  const prevIndicatorsRef = useRef<Map<string, ChartIndicatorConfig>>(new Map());

  // Sync Indicators cleanly with chart adapter (handles diffing of additions, removals, visibility)
  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    const currentMap = new Map<string, ChartIndicatorConfig>();
    indicators.forEach((ind) => currentMap.set(ind.id, ind));

    const prevMap = prevIndicatorsRef.current;

    // 1. Explicitly remove any indicator that was deleted from state OR toggled to visible === false
    prevMap.forEach((prevInd, id) => {
      const current = currentMap.get(id);
      if (!current || !current.visible) {
        adapter.removeIndicator(id);
      }
    });

    // 2. Add or update indicators that are currently visible
    indicators.forEach((ind) => {
      if (!ind.visible) {
        adapter.removeIndicator(ind.id);
        return;
      }

      const prev = prevMap.get(ind.id);
      if (!prev || !prev.visible) {
        // Newly added to chart or toggled visible
        adapter.addIndicator({
          id: ind.id,
          type: ind.type.toUpperCase(),
          name: ind.name,
          period: ind.period,
          color: ind.color,
          lineWidth: ind.lineWidth,
          overlay: ind.overlay,
          calcParams: ind.calcParams,
          source: ind.source,
          stdDev: ind.stdDev,
          multiplier: ind.multiplier,
        });
      } else {
        // Updated parameters or styling
        adapter.overrideIndicator({
          id: ind.id,
          type: ind.type.toUpperCase(),
          name: ind.name,
          period: ind.period,
          color: ind.color,
          lineWidth: ind.lineWidth,
          overlay: ind.overlay,
          calcParams: ind.calcParams,
          source: ind.source,
          stdDev: ind.stdDev,
          multiplier: ind.multiplier,
        });
      }
    });

    prevIndicatorsRef.current = currentMap;
  }, [indicators]);

  // Sync Trades as Small Arrows Only (respects bar replay timestamp)
  useEffect(() => {
    if (adapterRef.current) {
      const currentCandle = displayedCandles[displayedCandles.length - 1];
      const currentMs = replayIndex != null && currentCandle ? currentCandle.time : undefined;
      adapterRef.current.setTradeMarkers(trades, currentMs);
    }
  }, [trades, displayedCandles, replayIndex]);

  // Sync Active Running Position (for live replay / open trade visualization)
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.setRunningPosition(runningPosition);
    }
  }, [runningPosition]);

  // Focus Trade (render SL/TP and P&L for selected trade only, or clear when unselected)
  useEffect(() => {
    if (adapterRef.current) {
      if (selectedTrade) {
        adapterRef.current.focusTrade(selectedTrade.id);
      } else {
        adapterRef.current.clearTradeFocus();
      }
    }
  }, [selectedTrade]);

  // Hydrate Initial Drawings (resets when projectId changes)
  const hydratedDrawingsRef = useRef<string | null>(null);
  useEffect(() => {
    if (!adapterRef.current) return;
    if (hydratedDrawingsRef.current === projectId) return;
    if (initialDrawings && initialDrawings.length > 0) {
      hydratedDrawingsRef.current = projectId ?? null;
      const specs: ChartDrawingSpec[] = initialDrawings.map((d) => ({
        id: d.id,
        type: d.type as any,
        points: d.points.map((p) => ({ time: p.time, price: p.price })),
        color: d.color,
        fillColor: d.fillColor,
        lineWidth: d.lineWidth,
        lineStyle: d.lineStyle,
        entryPrice: d.entryPrice,
        slPrice: d.slPrice,
        tpPrice: d.tpPrice,
        text: d.text,
        markerSymbol: d.markerSymbol,
        lock: d.lock,
      }));
      adapterRef.current.loadDrawings(specs);
      setDrawings(specs);
    }
  }, [initialDrawings, projectId]);

  // Synchronize Lock Drawings state with KLineChart overlay engine
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.setDrawingsLocked(isLocked);
    }
  }, [isLocked]);

  // Global keyboard shortcuts (Delete/Backspace to delete selected drawing, Escape to revert to cursor mode or deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (adapterRef.current?.removeSelectedDrawing?.()) {
          setSelectedDrawing(null);
          toast.info('Drawing removed');
        }
      } else if (e.key === 'Escape') {
        if (selectedDrawing) {
          adapterRef.current?.deselectDrawing?.();
          setSelectedDrawing(null);
          setIsDrawingColorPickerOpen(false);
          setIsThicknessPickerOpen(false);
        } else {
          adapterRef.current?.cancelDrawing?.();
          setActiveTool('cursor');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawing]);

  // Countdown to candle close
  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const secondsInTf =
        timeframe === '1m'
          ? 60
          : timeframe === '5m'
          ? 300
          : timeframe === '15m'
          ? 900
          : timeframe === '1h'
          ? 3600
          : timeframe === '4h'
          ? 14400
          : 86400;

      const remaining = secondsInTf - (now % secondsInTf);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setCountdownText(
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timeframe]);

  // Handle Toolbar Drawing Selection with automatic transition back to cursor mode upon completion
  const handleSelectTool = (tool: any, options?: { markerSymbol?: string }) => {
    if (activeTool === tool && tool !== 'cursor') {
      adapterRef.current?.cancelDrawing?.();
      setActiveTool('cursor');
      return;
    }
    setActiveTool(tool);
    if (tool !== 'cursor') {
      adapterRef.current?.createDrawingTool(tool, {
        color: tool === 'long_position' ? '#089981' : tool === 'short_position' ? '#f23645' : '#2962FF',
        lineWidth: 2,
        markerSymbol: options?.markerSymbol ?? selectedMarkerSymbol,
        onComplete: () => {
          setActiveTool('cursor');
        },
      });
    } else {
      adapterRef.current?.cancelDrawing?.();
    }
  };

  // Drawing quick property toolbar actions
  const handleUpdateDrawingColor = (color: string) => {
    if (!selectedDrawing || !adapterRef.current) return;
    adapterRef.current.updateDrawing(selectedDrawing.id, { color });
    setSelectedDrawing((prev) => (prev ? { ...prev, color } : null));
    setIsDrawingColorPickerOpen(false);
  };

  const handleUpdateDrawingWidth = (lineWidth: number) => {
    if (!selectedDrawing || !adapterRef.current) return;
    adapterRef.current.updateDrawing(selectedDrawing.id, { lineWidth });
    setSelectedDrawing((prev) => (prev ? { ...prev, lineWidth } : null));
    setIsThicknessPickerOpen(false);
  };

  const handleUpdateDrawingStyle = (lineStyle: 'solid' | 'dashed' | 'dotted') => {
    if (!selectedDrawing || !adapterRef.current) return;
    adapterRef.current.updateDrawing(selectedDrawing.id, { lineStyle });
    setSelectedDrawing((prev) => (prev ? { ...prev, lineStyle } : null));
  };

  const handleToggleDrawingLock = () => {
    if (!selectedDrawing || !adapterRef.current) return;
    const newLock = !selectedDrawing.lock;
    adapterRef.current.updateDrawing(selectedDrawing.id, { lock: newLock });
    setSelectedDrawing((prev) => (prev ? { ...prev, lock: newLock } : null));
    toast.info(newLock ? 'Drawing locked' : 'Drawing unlocked');
  };

  const handleDeleteSelectedDrawing = () => {
    if (!selectedDrawing || !adapterRef.current) return;
    adapterRef.current.removeDrawing(selectedDrawing.id);
    setSelectedDrawing(null);
    toast.info('Drawing removed');
  };

  const handleDeselectDrawing = () => {
    if (adapterRef.current) {
      adapterRef.current.deselectDrawing();
    }
    setSelectedDrawing(null);
    setIsDrawingColorPickerOpen(false);
    setIsThicknessPickerOpen(false);
  };

  // Clear all drawings
  const handleClearDrawings = () => {
    if (adapterRef.current) {
      adapterRef.current.loadDrawings([]);
    }
    setDrawings([]);
    onSaveDrawings?.([]);
  };

  // Toggle Hide All Drawings
  const handleToggleHideAll = () => {
    setIsDrawingsHidden((prev) => {
      const next = !prev;
      if (adapterRef.current) {
        if (next) {
          adapterRef.current.loadDrawings([]);
        } else {
          // reload
          if (initialDrawings) {
            adapterRef.current.loadDrawings(
              initialDrawings.map((d) => ({
                id: d.id,
                type: d.type as any,
                points: d.points,
                color: d.color,
                lineWidth: d.lineWidth,
              }))
            );
          }
        }
      }
      return next;
    });
  };

  // Right Click Context Menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  return (
    <div
      className="relative w-full h-full flex overflow-hidden select-none bg-[#131722]"
      onContextMenu={handleContextMenu}
      onClick={closeContextMenu}
    >
      {/* =========================================================================
          LEFT VERTICAL DRAWING TOOLBAR (TRADINGVIEW AUTHENTIC SUITE)
          ========================================================================= */}
      <div className="w-11 bg-[#131722] border-r border-[#1e222d] flex flex-col items-center py-2 gap-1 z-20 text-[#787b86]">
        {/* 1. Cursor / Crosshair */}
        <button
          type="button"
          onClick={() => handleSelectTool('cursor')}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activeTool === 'cursor'
              ? 'bg-[#2a2e39] text-[#2962ff]'
              : 'hover:bg-[#1e222d] hover:text-[#d1d4dc]'
          }`}
          title="Crosshair (Cursor)"
        >
          <TradingViewToolIcon tool="cursor" className="w-[17px] h-[17px]" />
        </button>

        {/* 2. Trendline */}
        <button
          type="button"
          onClick={() => handleSelectTool('trendline')}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activeTool === 'trendline'
              ? 'bg-[#2a2e39] text-[#2962ff]'
              : 'hover:bg-[#1e222d] hover:text-[#d1d4dc]'
          }`}
          title="Trend Line"
        >
          <TradingViewToolIcon tool="trendline" className="w-[17px] h-[17px]" />
        </button>

        {/* 3. Horizontal Line */}
        <button
          type="button"
          onClick={() => handleSelectTool('horizontal')}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activeTool === 'horizontal'
              ? 'bg-[#2a2e39] text-[#2962ff]'
              : 'hover:bg-[#1e222d] hover:text-[#d1d4dc]'
          }`}
          title="Horizontal Line (Support & Resistance)"
        >
          <TradingViewToolIcon tool="horizontal" className="w-[17px] h-[17px]" />
        </button>

        {/* 4. Vertical Line (MT5) */}
        <button
          type="button"
          onClick={() => handleSelectTool('vertical')}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activeTool === 'vertical'
              ? 'bg-[#2a2e39] text-[#2962ff]'
              : 'hover:bg-[#1e222d] hover:text-[#d1d4dc]'
          }`}
          title="Vertical Line (MT5 Cycle / Time Marker)"
        >
          <TradingViewToolIcon tool="vertical" className="w-[17px] h-[17px]" />
        </button>

        {/* 5. Ray Line */}
        <button
          type="button"
          onClick={() => handleSelectTool('ray')}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activeTool === 'ray'
              ? 'bg-[#2a2e39] text-[#2962ff]'
              : 'hover:bg-[#1e222d] hover:text-[#d1d4dc]'
          }`}
          title="Ray Line"
        >
          <TradingViewToolIcon tool="ray" className="w-[17px] h-[17px]" />
        </button>

        {/* 6. Rectangle */}
        <button
          type="button"
          onClick={() => handleSelectTool('rectangle')}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activeTool === 'rectangle'
              ? 'bg-[#2a2e39] text-[#2962ff]'
              : 'hover:bg-[#1e222d] hover:text-[#d1d4dc]'
          }`}
          title="Rectangle (Supply & Demand Zone)"
        >
          <TradingViewToolIcon tool="rectangle" className="w-[17px] h-[17px]" />
        </button>

        {/* 7. Fibonacci Retracement */}
        <button
          type="button"
          onClick={() => handleSelectTool('fibonacci')}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activeTool === 'fibonacci'
              ? 'bg-[#2a2e39] text-[#2962ff]'
              : 'hover:bg-[#1e222d] hover:text-[#d1d4dc]'
          }`}
          title="Fibonacci Retracement"
        >
          <TradingViewToolIcon tool="fibonacci" className="w-[17px] h-[17px]" />
        </button>

        {/* Divider */}
        <div className="w-5 h-px bg-[#1e222d] my-1" />

        {/* 8. Long Position Tool */}
        <button
          type="button"
          onClick={() => handleSelectTool('long_position')}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activeTool === 'long_position'
              ? 'bg-[#2a2e39] text-[#089981]'
              : 'hover:bg-[#1e222d] hover:text-[#089981]'
          }`}
          title="Long Position Tool (Target & Stop Loss Box)"
        >
          <TradingViewToolIcon tool="long_position" className="w-[17px] h-[17px]" />
        </button>

        {/* 9. Short Position Tool */}
        <button
          type="button"
          onClick={() => handleSelectTool('short_position')}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activeTool === 'short_position'
              ? 'bg-[#2a2e39] text-[#f23645]'
              : 'hover:bg-[#1e222d] hover:text-[#f23645]'
          }`}
          title="Short Position Tool (Target & Stop Loss Box)"
        >
          <TradingViewToolIcon tool="short_position" className="w-[17px] h-[17px]" />
        </button>

        {/* 10. Text Tool */}
        <button
          type="button"
          onClick={() => handleSelectTool('text')}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activeTool === 'text'
              ? 'bg-[#2a2e39] text-[#2962ff]'
              : 'hover:bg-[#1e222d] hover:text-[#d1d4dc]'
          }`}
          title="Text Note"
        >
          <TradingViewToolIcon tool="text" className="w-[17px] h-[17px]" />
        </button>

        {/* 11. Measure Tool */}
        <button
          type="button"
          onClick={() => handleSelectTool('measure')}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            activeTool === 'measure'
              ? 'bg-[#2a2e39] text-[#2962ff]'
              : 'hover:bg-[#1e222d] hover:text-[#d1d4dc]'
          }`}
          title="Measure (Price & Bar Distance)"
        >
          <TradingViewToolIcon tool="measure" className="w-[17px] h-[17px]" />
        </button>

        {/* 12. Marker / Stamp Tool (with palette popover of emojis & arrows) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (activeTool === 'marker') {
                setIsMarkerMenuOpen((prev) => !prev);
              } else {
                handleSelectTool('marker', { markerSymbol: selectedMarkerSymbol });
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setIsMarkerMenuOpen((prev) => !prev);
            }}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors text-sm ${
              activeTool === 'marker'
                ? 'bg-[#2a2e39] text-[#2962ff] ring-1 ring-[#2962ff]'
                : 'hover:bg-[#1e222d] hover:text-[#d1d4dc]'
            }`}
            title={`Marker / Stamp (${selectedMarkerSymbol}) - Left-click to place, Right-click to change sticker`}
          >
            <span>{selectedMarkerSymbol.startsWith('▲') ? '▲' : selectedMarkerSymbol.startsWith('▼') ? '▼' : selectedMarkerSymbol}</span>
          </button>

          {isMarkerMenuOpen && (
            <div className="absolute left-full top-0 ml-2 w-52 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] uppercase font-bold text-zinc-400 px-1 pb-1.5 border-b border-[#2a2e39] mb-1.5 flex items-center justify-between">
                <span>Stamps & Markers</span>
                <button
                  type="button"
                  onClick={() => setIsMarkerMenuOpen(false)}
                  className="hover:text-white text-zinc-500"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { symbol: '▲ BUY', label: 'Buy Arrow' },
                  { symbol: '▼ SELL', label: 'Sell Arrow' },
                  { symbol: '🎯', label: 'Target' },
                  { symbol: '🛑', label: 'Stop Loss' },
                  { symbol: '🚀', label: 'Rocket' },
                  { symbol: '💡', label: 'Idea' },
                  { symbol: '⚠️', label: 'Warning' },
                  { symbol: '⭐', label: 'Star' },
                  { symbol: '🔥', label: 'Fire' },
                  { symbol: '📌', label: 'Pin' },
                  { symbol: '💰', label: 'Profit' },
                  { symbol: '✅', label: 'Check' },
                ].map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => {
                      setSelectedMarkerSymbol(item.symbol);
                      setIsMarkerMenuOpen(false);
                      handleSelectTool('marker', { markerSymbol: item.symbol });
                    }}
                    className={`h-8 flex items-center justify-center rounded-lg border text-sm transition-all hover:scale-105 ${
                      item.symbol === '▲ BUY'
                        ? 'col-span-2 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border-emerald-700/60'
                        : item.symbol === '▼ SELL'
                        ? 'col-span-2 text-[10px] font-bold text-red-400 bg-red-950/60 border-red-700/60'
                        : selectedMarkerSymbol === item.symbol
                        ? 'bg-blue-600/30 border-blue-500'
                        : 'bg-[#141824] border-[#2a2e39] hover:bg-[#2a2e39]'
                    }`}
                    title={item.label}
                  >
                    {item.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Utility Tools (Lock, Hide, Eraser) */}
        <div className="mt-auto flex flex-col items-center gap-1">
          {/* Lock Drawings */}
          <button
            type="button"
            onClick={() => {
              setIsLocked((prev) => {
                const next = !prev;
                toast.info(next ? '🔒 Drawings locked in place' : '🔓 Drawings unlocked for editing');
                return next;
              });
            }}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              isLocked ? 'text-amber-400 bg-amber-500/10' : 'hover:bg-[#1e222d] hover:text-[#d1d4dc]'
            }`}
            title={isLocked ? 'Unlock All Drawings' : 'Lock All Drawings'}
          >
            <span className="material-symbols-outlined text-[17px]">
              {isLocked ? 'lock' : 'lock_open'}
            </span>
          </button>

          {/* Hide All Drawings */}
          <button
            type="button"
            onClick={handleToggleHideAll}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              isDrawingsHidden ? 'text-rose-400 bg-rose-500/10' : 'hover:bg-[#1e222d] hover:text-[#d1d4dc]'
            }`}
            title={isDrawingsHidden ? 'Show Drawings' : 'Hide All Drawings'}
          >
            <span className="material-symbols-outlined text-[17px]">
              {isDrawingsHidden ? 'visibility_off' : 'visibility'}
            </span>
          </button>

          {/* Clear Drawings (Eraser) */}
          <button
            type="button"
            onClick={handleClearDrawings}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
            title="Remove All Drawings"
          >
            <span className="material-symbols-outlined text-[17px]">delete_sweep</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          CENTER CANVAS & TRADINGVIEW OVERLAY HUD
          ========================================================================= */}
      <div className="flex-1 relative flex flex-col min-w-0 bg-[#131722]">
        {/* =========================================================================
            FLOATING TRADINGVIEW DRAWING PROPERTIES TOOLBAR
            ========================================================================= */}
        {selectedDrawing && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc] shadow-2xl rounded-xl px-2.5 py-1.5 flex items-center gap-2 select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tool Icon & Type Badge */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-[#2a2e39] text-xs font-semibold text-zinc-200">
              <TradingViewToolIcon tool={selectedDrawing.type} className="w-4 h-4 text-[#2962FF]" />
              <span className="capitalize text-[11px] font-medium text-zinc-300">
                {getDrawingLabel(selectedDrawing.type)}
              </span>
            </div>

            {/* Quick Color Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDrawingColorPickerOpen(!isDrawingColorPickerOpen);
                  setIsThicknessPickerOpen(false);
                }}
                className="w-5 h-5 rounded-full border-2 border-white/80 shadow transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: selectedDrawing.color || '#2962FF' }}
                title="Color"
              />
              {isDrawingColorPickerOpen && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-[#1e222d] border border-[#2a2e39] shadow-2xl rounded-xl p-2 grid grid-cols-4 gap-1.5 z-50 min-w-[130px]">
                  {TRADINGVIEW_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => handleUpdateDrawingColor(c.hex)}
                      className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 cursor-pointer ${
                        selectedDrawing.color === c.hex ? 'ring-2 ring-white ring-offset-1 ring-offset-[#1e222d]' : 'border-zinc-700'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Line Thickness */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsThicknessPickerOpen(!isThicknessPickerOpen);
                  setIsDrawingColorPickerOpen(false);
                }}
                className="px-2 py-0.5 rounded text-[11px] font-mono font-medium hover:bg-[#2a2e39] text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                title="Line Thickness"
              >
                <span>{selectedDrawing.lineWidth || 2}px</span>
                <span className="material-symbols-outlined text-[13px]">expand_more</span>
              </button>
              {isThicknessPickerOpen && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-[#1e222d] border border-[#2a2e39] shadow-2xl rounded-xl p-1 flex flex-col gap-0.5 z-50 min-w-[75px]">
                  {[1, 2, 3, 4].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleUpdateDrawingWidth(w)}
                      className={`px-2 py-1 text-[11px] font-mono rounded flex items-center justify-between transition-colors cursor-pointer ${
                        (selectedDrawing.lineWidth || 2) === w ? 'bg-[#2962FF] text-white font-bold' : 'hover:bg-[#2a2e39] text-zinc-300'
                      }`}
                    >
                      <span>{w}px</span>
                      <div className="w-6 h-0 border-b border-current" style={{ borderWidth: w / 2 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Line Style (Solid / Dashed) */}
            <div className="flex items-center gap-0.5 bg-[#141824] rounded-lg p-0.5 border border-[#2a2e39]">
              <button
                type="button"
                onClick={() => handleUpdateDrawingStyle('solid')}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                  (selectedDrawing.lineStyle || 'solid') === 'solid' ? 'bg-[#2a2e39] text-white font-semibold' : 'text-[#787b86] hover:text-white'
                }`}
                title="Solid Line"
              >
                —
              </button>
              <button
                type="button"
                onClick={() => handleUpdateDrawingStyle('dashed')}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                  selectedDrawing.lineStyle === 'dashed' ? 'bg-[#2a2e39] text-white font-semibold' : 'text-[#787b86] hover:text-white'
                }`}
                title="Dashed Line"
              >
                - -
              </button>
            </div>

            <div className="w-px h-4 bg-[#2a2e39] mx-0.5" />

            {/* Lock / Unlock Toggle */}
            <button
              type="button"
              onClick={handleToggleDrawingLock}
              className={`p-1 rounded hover:bg-[#2a2e39] transition-colors cursor-pointer ${
                selectedDrawing.lock ? 'text-amber-400' : 'text-[#787b86] hover:text-zinc-200'
              }`}
              title={selectedDrawing.lock ? 'Unlock Drawing' : 'Lock Drawing'}
            >
              <span className="material-symbols-outlined text-[16px]">
                {selectedDrawing.lock ? 'lock' : 'lock_open'}
              </span>
            </button>

            {/* Delete Drawing Button */}
            <button
              type="button"
              onClick={handleDeleteSelectedDrawing}
              className="p-1 rounded text-[#787b86] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Delete Drawing (Del)"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>

            {/* Deselect / Close */}
            <button
              type="button"
              onClick={handleDeselectDrawing}
              className="p-1 rounded text-[#787b86] hover:text-zinc-200 hover:bg-[#2a2e39] transition-colors ml-0.5 cursor-pointer"
              title="Deselect (Esc)"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          </div>
        )}
        {/* =========================================================================
            TOP-LEFT TRADINGVIEW HUD: SYMBOL, OHLC & ACTIVE INDICATORS
            (pointer-events-none by default so drawing and dragging pass through smoothly)
            ========================================================================= */}
        <div
          className={`absolute top-2.5 left-3.5 z-30 flex flex-col gap-1.5 select-none max-w-[calc(100%-200px)] pointer-events-none transition-opacity duration-200 ${
            activeTool !== 'cursor' ? 'opacity-30' : 'opacity-100'
          }`}
        >
          {/* Row 1: Symbol, Timeframe, Base Dataset Meta, and OHLC Bar */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#d1d4dc] flex-wrap bg-[#131722]/85 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-[#2a2e39]/60 shadow-md pointer-events-none">
            {/* Collapse/Expand Indicators Legend Toggle (TradingView style) */}
            <button
              type="button"
              onClick={() => setIsLegendCollapsed((prev) => !prev)}
              className={`p-0.5 rounded hover:bg-[#1e222d] text-[#787b86] hover:text-[#d1d4dc] transition-colors ${
                activeTool === 'cursor' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
              }`}
              title={isLegendCollapsed ? 'Expand Indicators Legend' : 'Collapse Indicators Legend'}
            >
              <span className="material-symbols-outlined text-sm">
                {isLegendCollapsed ? 'unfold_more' : 'unfold_less'}
              </span>
            </button>

            <div className="flex items-center gap-1.5 font-bold font-sans text-xs text-white">
              <span>{symbol}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#1e222d] text-[#787b86] text-[10px] uppercase font-mono">
                {timeframe}
              </span>
            </div>

            {/* Base dataset meta badge if present */}
            {baseDatasetMeta && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1e222d]/80 border border-[#2a2e39] text-[10px] text-zinc-400 font-mono">
                <span className="font-semibold text-zinc-200">{baseDatasetMeta.symbol}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-blue-400 font-semibold">{baseDatasetMeta.baseTimeframe} base</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-300">{baseDatasetMeta.count.toLocaleString()} bars</span>
              </div>
            )}

            {/* Live / Hovered OHLC Readings */}
            {activeCandle && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[#787b86]">
                  O <span className={activeCandle.close >= activeCandle.open ? 'text-[#26a69a]' : 'text-[#ef5350]'}>{activeCandle.open.toFixed(2)}</span>
                </span>
                <span className="text-[#787b86]">
                  H <span className={activeCandle.close >= activeCandle.open ? 'text-[#26a69a]' : 'text-[#ef5350]'}>{activeCandle.high.toFixed(2)}</span>
                </span>
                <span className="text-[#787b86]">
                  L <span className={activeCandle.close >= activeCandle.open ? 'text-[#26a69a]' : 'text-[#ef5350]'}>{activeCandle.low.toFixed(2)}</span>
                </span>
                <span className="text-[#787b86]">
                  C <span className={activeCandle.close >= activeCandle.open ? 'text-[#26a69a]' : 'text-[#ef5350]'}>{activeCandle.close.toFixed(2)}</span>
                </span>
                <span className="text-[#787b86]">
                  Change{' '}
                  <span className={activeCandle.close >= activeCandle.open ? 'text-[#26a69a]' : 'text-[#ef5350]'}>
                    {(activeCandle.close - activeCandle.open >= 0 ? '+' : '') +
                      (activeCandle.close - activeCandle.open).toFixed(2)}{' '}
                    (
                    {(
                      ((activeCandle.close - activeCandle.open) / (activeCandle.open || 1)) *
                      100
                    ).toFixed(2)}
                    %)
                  </span>
                </span>
                {activeCandle.volume && (
                  <span className="text-[#787b86]">
                    Vol <span className="text-[#38bdf8]">{activeCandle.volume}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Row 2+: Active Technical Indicators on Chart with Visible Settings Buttons */}
          {!isLegendCollapsed && indicators.length > 0 && (
            <div className="flex flex-col gap-1 pointer-events-none">
              {indicators.map((ind) => (
                <div
                  key={ind.id}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-mono select-none transition-all bg-[#131722]/90 backdrop-blur-sm border border-[#2a2e39]/80 shadow-md w-fit hover:border-[#383d4a] pointer-events-none ${
                    ind.visible ? 'text-[#d1d4dc]' : 'text-zinc-500'
                  }`}
                >
                  {/* Colored indicator dot */}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: ind.color }}
                  />

                  {/* Indicator Title - Click to open settings directly */}
                  <button
                    type="button"
                    onClick={() => setEditingIndicator(ind)}
                    className={`font-semibold font-mono hover:text-white transition-colors text-left ${
                      activeTool === 'cursor' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
                    } ${
                      !ind.visible ? 'line-through text-zinc-500' : 'text-zinc-200'
                    }`}
                    title="Click to configure indicator parameters & style"
                  >
                    {formatIndicatorTitle(ind)}
                  </button>

                  {/* Live Value in Indicator Color */}
                  {ind.visible && (
                    <span
                      className="font-bold ml-1 font-mono text-[11px]"
                      style={{ color: ind.color }}
                    >
                      {computeLiveIndicatorValue(
                        ind,
                        displayedCandles,
                        hoveredCandleIndex ?? (displayedCandles.length - 1)
                      )}
                    </span>
                  )}

                  {/* Action Buttons: Settings Cog, Visibility Toggle, Remove Cross */}
                  <div className="flex items-center gap-1 ml-2 pointer-events-none">
                    {/* Settings Cog ⚙️ */}
                    <button
                      type="button"
                      onClick={() => setEditingIndicator(ind)}
                      className={`h-5 px-1.5 flex items-center gap-1 rounded bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-[#2962ff] border border-[#2a2e39] transition-all shadow-sm ${
                        activeTool === 'cursor' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
                      }`}
                      title="Settings (Period, Source, Color, Thickness)"
                    >
                      <span className="material-symbols-outlined text-[13px]">settings</span>
                      <span className="text-[10px] font-sans font-medium text-zinc-400 hover:text-zinc-200">Settings</span>
                    </button>

                    {/* Visibility Eye 👁️ */}
                    <button
                      type="button"
                      onClick={() => onToggleIndicatorVisibility?.(ind.id)}
                      className={`w-5 h-5 flex items-center justify-center rounded bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-colors ${
                        activeTool === 'cursor' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
                      }`}
                      title={ind.visible ? 'Hide Indicator' : 'Show Indicator'}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {ind.visible ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>

                    {/* Remove ✕ */}
                    <button
                      type="button"
                      onClick={() => onRemoveIndicator?.(ind.id)}
                      className={`w-5 h-5 flex items-center justify-center rounded bg-[#1e222d] hover:bg-rose-500/20 text-[#787b86] hover:text-rose-400 border border-[#2a2e39] transition-colors ${
                        activeTool === 'cursor' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
                      }`}
                      title="Remove Indicator"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* When collapsed, display small compact pill */}
          {isLegendCollapsed && indicators.length > 0 && (
            <button
              type="button"
              onClick={() => setIsLegendCollapsed(false)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[#131722]/85 border border-[#2a2e39] text-[#787b86] hover:text-zinc-200 hover:border-zinc-700 w-fit transition-colors flex items-center gap-1.5 shadow-sm ${
                activeTool === 'cursor' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
              }`}
              title="Click to expand indicator list"
            >
              <span className="font-serif italic font-bold text-blue-400">fx</span>
              <span>Indicators ({indicators.filter((i) => i.visible).length})</span>
            </button>
          )}
        </div>

        {/* Live Candle Close Countdown Badge in Upper-Right Axis Area */}
        <div className="absolute top-2.5 right-20 z-10 font-mono text-[11px] bg-[#1e222d]/90 px-2 py-0.5 rounded border border-[#2a2e39] text-[#d1d4dc] pointer-events-none flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-pulse" />
          <span className="text-[#787b86]">Bar Close:</span>
          <span className="font-bold text-white">{countdownText}</span>
        </div>

        {/* Floating Start Point Selector Indicator */}
        {isSelectingStartPoint && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-cyan-950/95 border border-cyan-500/70 text-cyan-200 text-xs px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 z-30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="font-semibold text-white">📍 Click candle to set backtest start</span>
            <button
              type="button"
              onClick={onCancelSelectStartPoint}
              className="ml-2 px-2 py-0.5 rounded bg-cyan-900/80 hover:bg-cyan-800 text-[11px] text-cyan-200 hover:text-white border border-cyan-700/60"
            >
              Cancel (Esc)
            </button>
          </div>
        )}

        {/* The KLineChart Canvas DOM container with context-aware TradingView cursors */}
        <div
          ref={containerRef}
          className={`chart-canvas-container w-full h-full flex-1 min-h-0 ${
            isSelectingStartPoint
              ? 'cursor-pointer'
              : activeTool !== 'cursor'
              ? 'cursor-crosshair'
              : isMovingDrawing
              ? 'cursor-drawing-move'
              : isHoveringPoint
              ? 'cursor-drawing-point'
              : isHoveringDrawing
              ? 'cursor-drawing-move'
              : isDraggingChart
              ? 'cursor-grabbing is-dragging'
              : 'cursor-grab'
          }`}
          style={
            isSelectingStartPoint
              ? { cursor: 'pointer' }
              : activeTool === 'cursor' && !isMovingDrawing && !isHoveringDrawing && !isHoveringPoint
              ? { cursor: isDraggingChart ? 'grabbing' : 'grab' }
              : undefined
          }
        />

        {/* Style injection: Allow axes and tools to display authentic cursors, and folding hand when panning */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Inner canvas elements inherit their parent container's cursor without being overridden */
              .chart-canvas-container canvas {
                cursor: inherit;
              }
              /* In cursor mode, chart container defaults to open hand */
              .chart-canvas-container.cursor-grab {
                cursor: grab;
              }
              /* When actively dragging to pan the chart, use closed folding hand */
              .chart-canvas-container.cursor-grabbing,
              .chart-canvas-container.is-dragging {
                cursor: grabbing !important;
              }
              .chart-canvas-container.cursor-grabbing canvas,
              .chart-canvas-container.is-dragging canvas {
                cursor: grabbing !important;
              }
              /* When moving a drawing / tool on the chart, use move cursor (4-way arrow) */
              .chart-canvas-container.cursor-drawing-move,
              .chart-canvas-container.cursor-drawing-move * {
                cursor: move !important;
              }
              /* When hovering/dragging an anchor point/handle, use crosshair */
              .chart-canvas-container.cursor-drawing-point,
              .chart-canvas-container.cursor-drawing-point * {
                cursor: crosshair !important;
              }
              /* When in drawing tool placement mode */
              .chart-canvas-container.cursor-crosshair,
              .chart-canvas-container.cursor-crosshair canvas {
                cursor: crosshair !important;
              }
            `,
          }}
        />

        {/* Camera shutter flash effect */}
        {isFlashActive && (
          <div className="absolute inset-0 z-50 bg-white/25 pointer-events-none transition-opacity duration-200" />
        )}

        {/* TradingView Bottom-Right AUTO Scale Corner Button */}
        <button
          type="button"
          onClick={() => adapterRef.current?.resetChart()}
          className="absolute right-0 bottom-0 w-[65px] h-[26px] flex items-center justify-center font-mono text-[10px] font-bold border-t border-l border-[#2a2e39] bg-[#131722] text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d] transition-colors z-20"
          title="Auto Scale & Reset Chart"
        >
          AUTO
        </button>
      </div>

      {/* =========================================================================
          RIGHT-CLICK CONTEXT MENU (RESET, REMOVE INDICATORS, REMOVE DRAWINGS)
          ========================================================================= */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl py-1 text-xs text-[#d1d4dc] min-w-[160px] animate-in fade-in duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              adapterRef.current?.resetChart();
              closeContextMenu();
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-[#2a2e39] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm text-[#787b86]">restart_alt</span>
            <span>Reset Chart</span>
          </button>

          {adapterRef.current?.getSelectedDrawingId() && (
            <button
              type="button"
              onClick={() => {
                adapterRef.current?.removeSelectedDrawing();
                closeContextMenu();
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-[#2a2e39] flex items-center gap-2 text-rose-400 hover:text-rose-300"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              <span>Delete Selected Drawing</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsLocked((prev) => {
                const next = !prev;
                toast.info(next ? '🔒 Drawings locked in place' : '🔓 Drawings unlocked for editing');
                return next;
              });
              closeContextMenu();
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-[#2a2e39] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm text-[#787b86]">
              {isLocked ? 'lock_open' : 'lock'}
            </span>
            <span>{isLocked ? 'Unlock All Drawings' : 'Lock All Drawings'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              indicators.forEach((i) => adapterRef.current?.removeIndicator(i.id));
              closeContextMenu();
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-[#2a2e39] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm text-[#787b86]">layers_clear</span>
            <span>Remove All Indicators</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleClearDrawings();
              closeContextMenu();
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-[#2a2e39] flex items-center gap-2 text-rose-400 hover:text-rose-300"
          >
            <span className="material-symbols-outlined text-sm">delete_sweep</span>
            <span>Remove All Drawings</span>
          </button>
        </div>
      )}

      {/* Embedded TradingView Indicator Settings Modal */}
      {editingIndicator && (
        <IndicatorSettingsModal
          indicator={editingIndicator}
          isOpen={true}
          onClose={() => setEditingIndicator(null)}
          onSave={(updated) => {
            onUpdateIndicator?.(updated);
            adapterRef.current?.overrideIndicator({
              id: updated.id,
              type: updated.type.toUpperCase(),
              name: updated.name,
              period: updated.period,
              color: updated.color,
              lineWidth: updated.lineWidth,
              overlay: updated.overlay,
              calcParams: updated.calcParams,
              source: updated.source,
              stdDev: updated.stdDev,
              multiplier: updated.multiplier,
            });
            setEditingIndicator(null);
          }}
        />
      )}
    </div>
  );
}
