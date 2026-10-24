import {
  init,
  dispose,
  Chart,
  KLineData,
  Nullable,
  OverlayCreate,
  registerOverlay,
  registerIndicator,
} from 'klinecharts';
import { ICandle, Timeframe, CompletedTrade, ActivePosition } from '../flexStrategy/engine/types';
import { resampleCandles, TIMEFRAME_SECONDS_MAP } from './resample';

export interface IndicatorSpec {
  id: string;
  type: string;
  name?: string;
  period?: number;
  color?: string;
  lineWidth?: number;
  overlay?: boolean; // true = main price chart, false = sub pane
  calcParams?: number[];
  source?: 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3';
  stdDev?: number;
  multiplier?: number;
}

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface ChartDrawingSpec {
  id: string;
  type:
    | 'trendline'
    | 'horizontal'
    | 'vertical'
    | 'ray'
    | 'rectangle'
    | 'fibonacci'
    | 'long_position'
    | 'short_position'
    | 'text'
    | 'measure'
    | 'marker';
  points: DrawingPoint[];
  color?: string;
  fillColor?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  entryPrice?: number;
  slPrice?: number;
  tpPrice?: number;
  text?: string;
  markerSymbol?: string;
  lock?: boolean;
}

export interface VisibleRangeData {
  from: number;
  to: number;
  fromTime?: number;
  toTime?: number;
}

/**
 * Register custom overlays for KLineChart:
 * 1. Long Position Tool (TradingView style profit & loss boxes)
 * 2. Short Position Tool
 * 3. Measure Tool (price difference, % change, and bar distance)
 * 4. Rectangle / Square Tool (Supply & Demand zones)
 */
let isCustomOverlaysRegistered = false;

function registerCustomTradingViewOverlays() {
  if (isCustomOverlaysRegistered) return;
  isCustomOverlaysRegistered = true;

  // 1. Register Rectangle / Square Overlay (Authentic TradingView Supply & Demand Zone)
  const createRectFigures = ({ coordinates, overlay }: any) => {
    const styles = (overlay.styles as any) || {};
    const borderColor =
      styles?.rect?.borderColor ||
      styles?.polygon?.borderColor ||
      styles?.line?.color ||
      overlay.extendData?.color ||
      '#2962FF';
    const borderSize = styles?.rect?.borderSize || styles?.polygon?.borderSize || styles?.line?.size || 1.5;
    const borderStyle = styles?.line?.style || 'solid';
    const dashedValue = styles?.line?.dashedValue || [4, 4];
    const fillColor =
      styles?.rect?.color ||
      styles?.polygon?.color ||
      overlay.extendData?.fillColor ||
      'rgba(41, 98, 255, 0.12)';

    // Step 1 preview handle while mouse moves before second click
    if (coordinates.length === 1) {
      return [
        {
          type: 'circle',
          attrs: { x: coordinates[0].x, y: coordinates[0].y, r: 4.5 },
          styles: {
            style: 'stroke_fill',
            color: '#ffffff',
            borderColor,
            borderSize: 2,
          },
        },
      ];
    }
    if (coordinates.length < 2) return [];

    const [c1, c2] = coordinates;
    const x = Math.min(c1.x, c2.x);
    const y = Math.min(c1.y, c2.y);
    const width = Math.max(2, Math.abs(c1.x - c2.x));
    const height = Math.max(2, Math.abs(c1.y - c2.y));

    return [
      {
        type: 'polygon',
        attrs: {
          coordinates: [
            { x, y },
            { x: x + width, y },
            { x: x + width, y: y + height },
            { x, y: y + height },
          ],
        },
        styles: {
          style: 'stroke_fill',
          color: fillColor,
          borderColor,
          borderSize,
          borderStyle,
          borderDashedValue: dashedValue,
        },
      },
      // Secondary opposite corner handles (TradingView 4-corner handles)
      {
        type: 'circle',
        attrs: { x: c1.x, y: c2.y, r: 4.5 },
        styles: {
          style: 'stroke_fill',
          color: '#ffffff',
          borderColor,
          borderSize: 2,
        },
      },
      {
        type: 'circle',
        attrs: { x: c2.x, y: c1.y, r: 4.5 },
        styles: {
          style: 'stroke_fill',
          color: '#ffffff',
          borderColor,
          borderSize: 2,
        },
      },
    ];
  };

  registerOverlay({
    name: 'rect',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: createRectFigures,
  });

  registerOverlay({
    name: 'rectangle',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: createRectFigures,
  });

  // 2. Register Authentic TradingView Multi-Colored Fibonacci Retracement
  registerOverlay({
    name: 'fibonacciLine',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, bounding, overlay }: any) => {
      const points = overlay.points;
      if (coordinates.length < 2 || !points[0] || !points[1]) return [];

      const x1 = Math.min(coordinates[0].x, coordinates[1].x);
      const x2 = Math.max(coordinates[0].x, coordinates[1].x);
      const startX = 0;
      const endX = bounding.width;

      const p0Val = points[0].value ?? 0;
      const p1Val = points[1].value ?? 0;
      const valDiff = p1Val - p0Val;
      const y0 = coordinates[0].y;
      const y1 = coordinates[1].y;
      const yDiff = y1 - y0;

      // Authentic TradingView Fibonacci levels, line colors, and shaded fills
      const fibLevels = [
        { ratio: 0.000, color: '#787b86', label: '0.000', fill: 'rgba(242, 54, 69, 0.06)' },
        { ratio: 0.236, color: '#f23645', label: '0.236', fill: 'rgba(242, 54, 69, 0.08)' },
        { ratio: 0.382, color: '#ff9800', label: '0.382', fill: 'rgba(255, 152, 0, 0.08)' },
        { ratio: 0.500, color: '#4caf50', label: '0.500', fill: 'rgba(76, 175, 80, 0.12)' }, // Golden zone
        { ratio: 0.618, color: '#089981', label: '0.618', fill: 'rgba(8, 153, 129, 0.08)' }, // Golden pocket
        { ratio: 0.786, color: '#00bcd4', label: '0.786', fill: 'rgba(0, 188, 212, 0.06)' },
        { ratio: 1.000, color: '#2962FF', label: '1.000', fill: 'transparent' },
      ];

      const figures: any[] = [];

      // A. Shaded bands between levels
      for (let i = 0; i < fibLevels.length - 1; i++) {
        const lvlA = fibLevels[i];
        const lvlB = fibLevels[i + 1];
        const topY = y0 + yDiff * lvlA.ratio;
        const botY = y0 + yDiff * lvlB.ratio;
        const ry = Math.min(topY, botY);
        const rh = Math.abs(topY - botY);

        if (lvlA.fill && lvlA.fill !== 'transparent') {
          figures.push({
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: startX, y: ry },
                { x: endX, y: ry },
                { x: endX, y: ry + rh },
                { x: startX, y: ry + rh },
              ],
            },
            styles: {
              style: 'fill',
              color: lvlA.fill,
            },
          });
        }
      }

      // B. Dashed connector trendline between anchor Point 1 and Point 2
      figures.push({
        type: 'line',
        attrs: { coordinates: [coordinates[0], coordinates[1]] },
        styles: {
          style: 'dashed',
          dashedValue: [3, 3],
          color: 'rgba(120, 123, 134, 0.6)',
          size: 1,
        },
      });

      // C. Level lines and TradingView percentage & price tags
      fibLevels.forEach((lvl) => {
        const y = y0 + yDiff * lvl.ratio;
        const price = (p0Val + valDiff * lvl.ratio).toFixed(2);

        figures.push({
          type: 'line',
          attrs: {
            coordinates: [
              { x: startX, y },
              { x: endX, y },
            ],
          },
          styles: {
            style: 'solid',
            color: lvl.color,
            size: lvl.ratio === 0.5 || lvl.ratio === 0.618 ? 1.5 : 1,
          },
        });

        figures.push({
          type: 'text',
          attrs: {
            x: Math.max(12, Math.min(x1, x2)),
            y: y - 3,
            text: `${lvl.label} (${price})`,
            align: 'left',
            baseline: 'bottom',
          },
          styles: {
            color: lvl.color,
            size: 10,
            family: 'monospace',
            weight: lvl.ratio === 0.618 || lvl.ratio === 0.5 ? 'bold' : 'normal',
          },
        });
      });

      return figures;
    },
  });

  // 3. Register Long Position Box Overlay (TradingView style R:R calculation & handles)
  registerOverlay({
    name: 'tv_long_position',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, overlay, bounding }) => {
      if (coordinates.length < 1) return [];
      const data = (overlay.extendData as any) || {};
      const entryPrice = data.entryPrice ?? overlay.points[0]?.value;
      const tpPrice = data.tpPrice ?? (overlay.points[1] ? overlay.points[1].value : (entryPrice ? entryPrice * 1.015 : 0));
      const slPrice = data.slPrice ?? (overlay.points[2] ? overlay.points[2].value : (entryPrice ? entryPrice * 0.99 : 0));

      const x1 = coordinates[0].x;
      const x2 = coordinates[1] ? Math.max(x1 + 80, coordinates[1].x) : Math.min(bounding.width, x1 + 140);

      const entryY = coordinates[0].y;
      const tpY = coordinates[1] ? coordinates[1].y : entryY - 50;
      const slY = coordinates[2] ? coordinates[2].y : (coordinates[1] ? entryY + Math.abs(entryY - coordinates[1].y) * 0.5 : entryY + 35);

      const rw = Math.max(40, x2 - x1);
      const targetDiff = Math.abs(tpPrice - entryPrice);
      const stopDiff = Math.abs(entryPrice - slPrice);
      const rr = stopDiff > 0 ? (targetDiff / stopDiff).toFixed(2) : '1.50';
      const targetPct = entryPrice > 0 ? ((targetDiff / entryPrice) * 100).toFixed(2) : '1.50';
      const stopPct = entryPrice > 0 ? ((stopDiff / entryPrice) * 100).toFixed(2) : '1.00';

      return [
        // Target Profit Zone (Green #089981)
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: x1, y: Math.min(entryY, tpY) },
              { x: x1 + rw, y: Math.min(entryY, tpY) },
              { x: x1 + rw, y: Math.max(entryY, tpY) },
              { x: x1, y: Math.max(entryY, tpY) },
            ],
          },
          styles: {
            style: 'stroke_fill',
            color: 'rgba(8, 153, 129, 0.20)',
            borderColor: '#089981',
            borderSize: 1.5,
          },
        },
        // Stop Loss Zone (Red #f23645)
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: x1, y: Math.min(entryY, slY) },
              { x: x1 + rw, y: Math.min(entryY, slY) },
              { x: x1 + rw, y: Math.max(entryY, slY) },
              { x: x1, y: Math.max(entryY, slY) },
            ],
          },
          styles: {
            style: 'stroke_fill',
            color: 'rgba(242, 54, 69, 0.20)',
            borderColor: '#f23645',
            borderSize: 1.5,
          },
        },
        // Entry line (TradingView Royal Blue)
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: x1, y: entryY },
              { x: x1 + rw, y: entryY },
            ],
          },
          styles: {
            color: '#2962FF',
            size: 2,
          },
        },
        // Central TradingView Info Card
        {
          type: 'text',
          attrs: {
            x: x1 + rw / 2,
            y: entryY - 14,
            text: `R:R ${rr}  |  Target: +${targetPct}%  |  Stop: -${stopPct}%`,
            align: 'center',
            baseline: 'bottom',
          },
          styles: {
            color: '#ffffff',
            backgroundColor: '#1e222d',
            size: 10,
            family: 'monospace',
            weight: 'bold',
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 3,
            paddingBottom: 3,
            borderRadius: 4,
          },
        },
        // TP Target Badge
        {
          type: 'text',
          attrs: {
            x: x1 + 6,
            y: tpY + (tpY < entryY ? 14 : -6),
            text: `Target: ${Number(tpPrice).toFixed(2)} (+${targetPct}%)`,
            align: 'left',
            baseline: 'middle',
          },
          styles: {
            color: '#089981',
            size: 10,
            family: 'monospace',
            weight: 'bold',
          },
        },
        // SL Stop Badge
        {
          type: 'text',
          attrs: {
            x: x1 + 6,
            y: slY + (slY > entryY ? -6 : 14),
            text: `Stop: ${Number(slPrice).toFixed(2)} (-${stopPct}%)`,
            align: 'left',
            baseline: 'middle',
          },
          styles: {
            color: '#f23645',
            size: 10,
            family: 'monospace',
            weight: 'bold',
          },
        },
        // 4 TradingView White Drag Handles
        ...[
          { x: x1 + rw / 2, y: tpY, border: '#089981' },
          { x: x1 + rw / 2, y: entryY, border: '#2962FF' },
          { x: x1 + rw / 2, y: slY, border: '#f23645' },
          { x: x1 + rw, y: entryY, border: '#2962FF' },
        ].map((h) => ({
          type: 'circle',
          attrs: { x: h.x, y: h.y, r: 4.5 },
          styles: {
            style: 'stroke_fill',
            color: '#ffffff',
            borderColor: h.border,
            borderSize: 2,
          },
        })),
      ];
    },
  });

  // 4. Register Short Position Box Overlay
  registerOverlay({
    name: 'tv_short_position',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, overlay, bounding }) => {
      if (coordinates.length < 1) return [];
      const data = (overlay.extendData as any) || {};
      const entryPrice = data.entryPrice ?? overlay.points[0]?.value;
      const tpPrice = data.tpPrice ?? (overlay.points[1] ? overlay.points[1].value : (entryPrice ? entryPrice * 0.985 : 0));
      const slPrice = data.slPrice ?? (overlay.points[2] ? overlay.points[2].value : (entryPrice ? entryPrice * 1.01 : 0));

      const x1 = coordinates[0].x;
      const x2 = coordinates[1] ? Math.max(x1 + 80, coordinates[1].x) : Math.min(bounding.width, x1 + 140);

      const entryY = coordinates[0].y;
      const tpY = coordinates[1] ? coordinates[1].y : entryY + 50;
      const slY = coordinates[2] ? coordinates[2].y : (coordinates[1] ? entryY - Math.abs(entryY - coordinates[1].y) * 0.5 : entryY - 35);

      const rw = Math.max(40, x2 - x1);
      const targetDiff = Math.abs(entryPrice - tpPrice);
      const stopDiff = Math.abs(slPrice - entryPrice);
      const rr = stopDiff > 0 ? (targetDiff / stopDiff).toFixed(2) : '1.50';
      const targetPct = entryPrice > 0 ? ((targetDiff / entryPrice) * 100).toFixed(2) : '1.50';
      const stopPct = entryPrice > 0 ? ((stopDiff / entryPrice) * 100).toFixed(2) : '1.00';

      return [
        // Stop Loss Zone (Red above entry)
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: x1, y: Math.min(entryY, slY) },
              { x: x1 + rw, y: Math.min(entryY, slY) },
              { x: x1 + rw, y: Math.max(entryY, slY) },
              { x: x1, y: Math.max(entryY, slY) },
            ],
          },
          styles: {
            style: 'stroke_fill',
            color: 'rgba(242, 54, 69, 0.20)',
            borderColor: '#f23645',
            borderSize: 1.5,
          },
        },
        // Target Profit Zone (Green below entry)
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: x1, y: Math.min(entryY, tpY) },
              { x: x1 + rw, y: Math.min(entryY, tpY) },
              { x: x1 + rw, y: Math.max(entryY, tpY) },
              { x: x1, y: Math.max(entryY, tpY) },
            ],
          },
          styles: {
            style: 'stroke_fill',
            color: 'rgba(8, 153, 129, 0.20)',
            borderColor: '#089981',
            borderSize: 1.5,
          },
        },
        // Entry line
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: x1, y: entryY },
              { x: x1 + rw, y: entryY },
            ],
          },
          styles: {
            color: '#2962FF',
            size: 2,
          },
        },
        // Central TradingView Info Card
        {
          type: 'text',
          attrs: {
            x: x1 + rw / 2,
            y: entryY - 14,
            text: `R:R ${rr}  |  Target: +${targetPct}%  |  Stop: -${stopPct}%`,
            align: 'center',
            baseline: 'bottom',
          },
          styles: {
            color: '#ffffff',
            backgroundColor: '#1e222d',
            size: 10,
            family: 'monospace',
            weight: 'bold',
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 3,
            paddingBottom: 3,
            borderRadius: 4,
          },
        },
        // SL Badge
        {
          type: 'text',
          attrs: {
            x: x1 + 6,
            y: slY + (slY < entryY ? 14 : -6),
            text: `Stop: ${Number(slPrice).toFixed(2)} (-${stopPct}%)`,
            align: 'left',
            baseline: 'middle',
          },
          styles: {
            color: '#f23645',
            size: 10,
            family: 'monospace',
            weight: 'bold',
          },
        },
        // TP Badge
        {
          type: 'text',
          attrs: {
            x: x1 + 6,
            y: tpY + (tpY > entryY ? -6 : 14),
            text: `Target: ${Number(tpPrice).toFixed(2)} (+${targetPct}%)`,
            align: 'left',
            baseline: 'middle',
          },
          styles: {
            color: '#089981',
            size: 10,
            family: 'monospace',
            weight: 'bold',
          },
        },
        // 4 TradingView White Drag Handles
        ...[
          { x: x1 + rw / 2, y: slY, border: '#f23645' },
          { x: x1 + rw / 2, y: entryY, border: '#2962FF' },
          { x: x1 + rw / 2, y: tpY, border: '#089981' },
          { x: x1 + rw, y: entryY, border: '#2962FF' },
        ].map((h) => ({
          type: 'circle',
          attrs: { x: h.x, y: h.y, r: 4.5 },
          styles: {
            style: 'stroke_fill',
            color: '#ffffff',
            borderColor: h.border,
            borderSize: 2,
          },
        })),
      ];
    },
  });

  // 5. Register Measurement Overlay (TradingView style)
  registerOverlay({
    name: 'tv_measure',
    totalStep: 3,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length < 2) return [];
      const [c1, c2] = coordinates;
      const p1 = overlay.points[0];
      const p2 = overlay.points[1];

      const val1 = p1?.value ?? 0;
      const val2 = p2?.value ?? 0;
      const diff = val2 - val1;
      const pct = val1 !== 0 ? (diff / val1) * 100 : 0;

      const rx = Math.min(c1.x, c2.x);
      const ry = Math.min(c1.y, c2.y);
      const rw = Math.max(2, Math.abs(c1.x - c2.x));
      const rh = Math.max(2, Math.abs(c1.y - c2.y));

      return [
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: rx, y: ry },
              { x: rx + rw, y: ry },
              { x: rx + rw, y: ry + rh },
              { x: rx, y: ry + rh },
            ],
          },
          styles: {
            style: 'stroke_fill',
            color: 'rgba(41, 98, 255, 0.12)',
            borderColor: '#2962FF',
            borderSize: 1.5,
            borderStyle: 'dashed',
            borderDashedValue: [4, 4],
          },
        },
        {
          type: 'text',
          attrs: {
            x: rx + rw / 2,
            y: ry + rh / 2,
            text: `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`,
            align: 'center',
            baseline: 'middle',
          },
          styles: {
            color: '#ffffff',
            backgroundColor: '#131722',
            size: 11,
            family: 'monospace',
            weight: 'bold',
            paddingLeft: 8,
            paddingRight: 8,
            paddingTop: 4,
            paddingBottom: 4,
            borderRadius: 4,
          },
        },
        // Handles at Start & End
        ...coordinates.slice(0, 2).map((pt: any) => ({
          type: 'circle',
          attrs: { x: pt.x, y: pt.y, r: 4.5 },
          styles: {
            style: 'stroke_fill',
            color: '#ffffff',
            borderColor: '#2962FF',
            borderSize: 2,
          },
        })),
      ];
    },
  });

  // 6. Register Marker / Sticker Overlay (TradingView style stamps, arrows & emojis)
  registerOverlay({
    name: 'tv_marker',
    totalStep: 2,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length < 1) return [];
      const pt = coordinates[0];
      const data = (overlay.extendData as any) || {};
      const symbol = data.markerSymbol || (typeof overlay.extendData === 'string' ? overlay.extendData : '🎯');
      const isBuyArrow = symbol === 'arrow_up' || symbol === '▲' || symbol === 'buy';
      const isSellArrow = symbol === 'arrow_down' || symbol === '▼' || symbol === 'sell';

      if (isBuyArrow) {
        return [
          {
            type: 'text',
            attrs: {
              x: pt.x,
              y: pt.y - 12,
              text: '▲ BUY',
              align: 'center',
              baseline: 'bottom',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: '#089981',
              size: 11,
              weight: 'bold',
              family: 'monospace',
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 4,
            },
          },
        ];
      }

      if (isSellArrow) {
        return [
          {
            type: 'text',
            attrs: {
              x: pt.x,
              y: pt.y + 12,
              text: '▼ SELL',
              align: 'center',
              baseline: 'top',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: '#f23645',
              size: 11,
              weight: 'bold',
              family: 'monospace',
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 4,
            },
          },
        ];
      }

      // Emojis / Sticker markers
      return [
        {
          type: 'text',
          attrs: {
            x: pt.x,
            y: pt.y,
            text: symbol,
            align: 'center',
            baseline: 'middle',
          },
          styles: {
            size: 22,
          },
        },
      ];
    },
  });
}

/**
 * Register custom indicators for KLineChart:
 * 1. ATR (Average True Range with Wilder smoothing)
 * 2. VWAP (Volume Weighted Average Price)
 * 3. RANGE_HL (Donchian / Highest High & Lowest Low channel)
 * 4. SuperTrend (Dynamic trendline and ATR band)
 * 5. WMA (Weighted Moving Average)
 */
let isCustomIndicatorsRegistered = false;

function registerCustomTradingViewIndicators() {
  if (isCustomIndicatorsRegistered) return;
  isCustomIndicatorsRegistered = true;

  // 1. ATR
  registerIndicator({
    name: 'ATR',
    shortName: 'ATR',
    calcParams: [14],
    precision: 2,
    figures: [{ key: 'atr', title: 'ATR: ', type: 'line' }],
    regenerateFigures: (params) => [
      { key: 'atr', title: `ATR${params[0] ? ` (${params[0]})` : ''}: `, type: 'line' },
    ],
    calc: (dataList, indicator) => {
      const period = (indicator.calcParams?.[0] as number) || 14;
      let trSum = 0;
      const trs: number[] = [];
      let atrVal = 0;
      return dataList.map((kLine, i) => {
        if (i === 0) {
          trs.push(kLine.high - kLine.low);
          return {};
        }
        const prevClose = dataList[i - 1].close;
        const tr = Math.max(
          kLine.high - kLine.low,
          Math.abs(kLine.high - prevClose),
          Math.abs(kLine.low - prevClose)
        );
        trs.push(tr);
        if (i < period) {
          trSum += tr;
          if (i === period - 1) {
            atrVal = trSum / period;
            return { atr: atrVal };
          }
          return {};
        }
        atrVal = (atrVal * (period - 1) + tr) / period;
        return { atr: atrVal };
      });
    },
  });

  // 2. VWAP
  registerIndicator({
    name: 'VWAP',
    shortName: 'VWAP',
    series: 'price',
    calcParams: [],
    precision: 2,
    shouldOhlc: true,
    figures: [{ key: 'vwap', title: 'VWAP: ', type: 'line' }],
    calc: (dataList) => {
      let cumVol = 0;
      let cumTypVol = 0;
      return dataList.map((kLine) => {
        const vol = kLine.volume || 100;
        const typ = (kLine.high + kLine.low + kLine.close) / 3;
        cumVol += vol;
        cumTypVol += typ * vol;
        return { vwap: cumVol > 0 ? cumTypVol / cumVol : kLine.close };
      });
    },
  });

  // 3. RANGE_HL (Donchian channel)
  registerIndicator({
    name: 'RANGE_HL',
    shortName: 'Range H/L',
    series: 'price',
    calcParams: [20],
    precision: 2,
    shouldOhlc: true,
    figures: [
      { key: 'upper', title: 'Upper: ', type: 'line' },
      { key: 'mid', title: 'Mid: ', type: 'line' },
      { key: 'lower', title: 'Lower: ', type: 'line' },
    ],
    regenerateFigures: (params) => {
      const p = params[0] || 20;
      return [
        { key: 'upper', title: `High (${p}): `, type: 'line' },
        { key: 'mid', title: `Mid (${p}): `, type: 'line' },
        { key: 'lower', title: `Low (${p}): `, type: 'line' },
      ];
    },
    calc: (dataList, indicator) => {
      const period = (indicator.calcParams?.[0] as number) || 20;
      return dataList.map((_, i) => {
        if (i < period - 1) return {};
        let max = -Infinity;
        let min = Infinity;
        for (let j = i - period + 1; j <= i; j++) {
          if (dataList[j].high > max) max = dataList[j].high;
          if (dataList[j].low < min) min = dataList[j].low;
        }
        return {
          upper: max,
          mid: (max + min) / 2,
          lower: min,
        };
      });
    },
  });

  // 4. SuperTrend
  registerIndicator({
    name: 'SuperTrend',
    shortName: 'SuperTrend',
    series: 'price',
    calcParams: [10, 3],
    precision: 2,
    shouldOhlc: true,
    figures: [{ key: 'trend', title: 'SuperTrend: ', type: 'line' }],
    calc: (dataList, indicator) => {
      const period = (indicator.calcParams?.[0] as number) || 10;
      const mult = (indicator.calcParams?.[1] as number) || 3;
      const trs: number[] = [];
      let atr = 0;
      let upperBand = 0;
      let lowerBand = 0;
      let inUpTrend = true;
      let supertrend = 0;

      return dataList.map((kLine, i) => {
        if (i === 0) {
          trs.push(kLine.high - kLine.low);
          return {};
        }
        const prevClose = dataList[i - 1].close;
        const tr = Math.max(
          kLine.high - kLine.low,
          Math.abs(kLine.high - prevClose),
          Math.abs(kLine.low - prevClose)
        );
        trs.push(tr);
        if (i < period) {
          if (i === period - 1) {
            let s = 0;
            for (let k = 0; k < period; k++) s += trs[k];
            atr = s / period;
          }
          return {};
        }
        atr = (atr * (period - 1) + tr) / period;
        const hl2 = (kLine.high + kLine.low) / 2;
        const basicUpper = hl2 + mult * atr;
        const basicLower = hl2 - mult * atr;

        if (basicUpper < upperBand || prevClose > upperBand) upperBand = basicUpper;
        if (basicLower > lowerBand || prevClose < lowerBand) lowerBand = basicLower;

        if (inUpTrend) {
          if (kLine.close < lowerBand) {
            inUpTrend = false;
            supertrend = upperBand;
          } else {
            supertrend = lowerBand;
          }
        } else {
          if (kLine.close > upperBand) {
            inUpTrend = true;
            supertrend = lowerBand;
          } else {
            supertrend = upperBand;
          }
        }
        return { trend: supertrend };
      });
    },
  });

  // 5. WMA
  registerIndicator({
    name: 'WMA',
    shortName: 'WMA',
    series: 'price',
    calcParams: [20],
    precision: 2,
    shouldOhlc: true,
    figures: [{ key: 'wma', title: 'WMA: ', type: 'line' }],
    calc: (dataList, indicator) => {
      const period = (indicator.calcParams?.[0] as number) || 20;
      const weightSum = (period * (period + 1)) / 2;
      return dataList.map((_, i) => {
        if (i < period - 1) return {};
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += dataList[i - period + 1 + j].close * (j + 1);
        }
        return { wma: sum / weightSum };
      });
    },
  });

  // 6. SMA (Standard Simple Moving Average)
  registerIndicator({
    name: 'SMA',
    shortName: 'SMA',
    series: 'price',
    calcParams: [20],
    precision: 2,
    shouldOhlc: true,
    figures: [{ key: 'sma', title: 'SMA: ', type: 'line' }],
    regenerateFigures: (params) => {
      const p = params[0] || 20;
      return [{ key: 'sma', title: `SMA (${p}): `, type: 'line' }];
    },
    calc: (dataList, indicator) => {
      const period = (indicator.calcParams?.[0] as number) || 20;
      let sum = 0;
      return dataList.map((kLine, i) => {
        sum += kLine.close;
        if (i < period - 1) return {};
        if (i >= period) {
          sum -= dataList[i - period].close;
        }
        return { sma: sum / period };
      });
    },
  });

  // 7. EMA (Single Period Exponential Moving Average)
  registerIndicator({
    name: 'EMA',
    shortName: 'EMA',
    series: 'price',
    calcParams: [20],
    precision: 2,
    shouldOhlc: true,
    figures: [{ key: 'ema', title: 'EMA: ', type: 'line' }],
    regenerateFigures: (params) => {
      const p = params[0] || 20;
      return [{ key: 'ema', title: `EMA (${p}): `, type: 'line' }];
    },
    calc: (dataList, indicator) => {
      const period = (indicator.calcParams?.[0] as number) || 20;
      const k = 2 / (period + 1);
      let ema = 0;
      let sum = 0;
      return dataList.map((kLine, i) => {
        sum += kLine.close;
        if (i < period - 1) return {};
        if (i === period - 1) {
          ema = sum / period;
          return { ema };
        }
        ema = kLine.close * k + ema * (1 - k);
        return { ema };
      });
    },
  });

  // 8. RSI (Wilder's Relative Strength Index with single period)
  registerIndicator({
    name: 'RSI',
    shortName: 'RSI',
    series: 'normal',
    calcParams: [14],
    precision: 2,
    shouldOhlc: false,
    minValue: 0,
    maxValue: 100,
    figures: [{ key: 'rsi', title: 'RSI: ', type: 'line' }],
    regenerateFigures: (params) => {
      const p = params[0] || 14;
      return [{ key: 'rsi', title: `RSI (${p}): `, type: 'line' }];
    },
    calc: (dataList, indicator) => {
      const period = (indicator.calcParams?.[0] as number) || 14;
      let gainSum = 0;
      let lossSum = 0;
      let prevClose = 0;
      let avgGain = 0;
      let avgLoss = 0;
      return dataList.map((kLine, i) => {
        if (i === 0) {
          prevClose = kLine.close;
          return {};
        }
        const change = kLine.close - prevClose;
        prevClose = kLine.close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        if (i < period) {
          gainSum += gain;
          lossSum += loss;
          if (i === period - 1) {
            avgGain = gainSum / period;
            avgLoss = lossSum / period;
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            return { rsi: 100 - (100 / (1 + rs)) };
          }
          return {};
        }

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        if (avgLoss === 0) return { rsi: 100 };
        const rs = avgGain / avgLoss;
        return { rsi: 100 - (100 / (1 + rs)) };
      });
    },
  });

  // 9. BOLL (Bollinger Bands with Upper, Mid, Lower)
  registerIndicator({
    name: 'BOLL',
    shortName: 'BB',
    series: 'price',
    calcParams: [20, 2],
    precision: 2,
    shouldOhlc: true,
    figures: [
      { key: 'upper', title: 'Upper: ', type: 'line' },
      { key: 'mid', title: 'Basis: ', type: 'line' },
      { key: 'lower', title: 'Lower: ', type: 'line' },
    ],
    regenerateFigures: (params) => {
      const p = params[0] || 20;
      const m = params[1] || 2;
      return [
        { key: 'upper', title: `Upper (${p}, ${m}): `, type: 'line' },
        { key: 'mid', title: `Basis (${p}): `, type: 'line' },
        { key: 'lower', title: `Lower (${p}, ${m}): `, type: 'line' },
      ];
    },
    calc: (dataList, indicator) => {
      const period = (indicator.calcParams?.[0] as number) || 20;
      const mult = (indicator.calcParams?.[1] as number) || 2;
      return dataList.map((_, i) => {
        if (i < period - 1) return {};
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) {
          sum += dataList[j].close;
        }
        const ma = sum / period;
        let sumSq = 0;
        for (let j = i - period + 1; j <= i; j++) {
          const diff = dataList[j].close - ma;
          sumSq += diff * diff;
        }
        const std = Math.sqrt(sumSq / period);
        return {
          upper: ma + mult * std,
          mid: ma,
          lower: ma - mult * std,
        };
      });
    },
  });
}

/**
 * Standard TradingView Dark Theme styling definition
 */
export const TRADINGVIEW_DARK_THEME = {
  grid: {
    show: true,
    horizontal: {
      show: true,
      size: 1,
      color: '#1e222d',
      style: 'solid' as const,
      dashedValue: [2, 2],
    },
    vertical: {
      show: true,
      size: 1,
      color: '#1e222d',
      style: 'solid' as const,
      dashedValue: [2, 2],
    },
  },
  candle: {
    type: 'candle_solid' as const,
    bar: {
      upColor: '#26a69a',
      downColor: '#ef5350',
      noChangeColor: '#888888',
      upBorderColor: '#26a69a',
      downBorderColor: '#ef5350',
      noChangeBorderColor: '#888888',
      upWickColor: '#26a69a',
      downWickColor: '#ef5350',
      noChangeWickColor: '#888888',
    },
    area: {
      lineSize: 2,
      lineColor: '#26a69a',
      value: 'close',
      backgroundColor: [
        { offset: 0, color: 'rgba(38, 166, 154, 0.35)' },
        { offset: 1, color: 'rgba(38, 166, 154, 0.00)' },
      ],
      point: {
        show: true,
        color: '#26a69a',
        radius: 3,
        rippleColor: 'rgba(38, 166, 154, 0.4)',
        rippleRadius: 6,
        animation: true,
        animationDuration: 1000,
      },
    },
    priceMark: {
      show: true,
      high: {
        show: true,
        color: '#d1d4dc',
        textSize: 10,
        textFamily: 'monospace',
        textWeight: 'normal',
      },
      low: {
        show: true,
        color: '#d1d4dc',
        textSize: 10,
        textFamily: 'monospace',
        textWeight: 'normal',
      },
      last: {
        show: true,
        upColor: '#26a69a',
        downColor: '#ef5350',
        noChangeColor: '#888888',
        line: {
          show: true,
          style: 'dashed' as const,
          dashedValue: [4, 4],
          size: 1,
        },
        text: {
          show: true,
          style: 'fill' as const,
          size: 11,
          paddingLeft: 4,
          paddingTop: 4,
          paddingRight: 4,
          paddingBottom: 4,
          borderColor: 'transparent',
          borderRadius: 2,
          borderSize: 0,
          color: '#ffffff',
          family: 'monospace',
          weight: 'bold',
        },
      },
    },
    tooltip: {
      showRule: 'always' as const,
      showType: 'standard' as const,
      rect: {
        position: 'fixed' as const,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 6,
        paddingBottom: 6,
        offsetLeft: 10,
        offsetTop: 10,
        backgroundColor: 'rgba(19, 23, 34, 0.85)',
        borderRadius: 4,
        borderColor: '#2a2e39',
        borderSize: 1,
      },
      legend: {
        size: 11,
        color: '#d1d4dc',
        family: 'monospace',
        weight: 'normal',
      },
    },
  },
  xAxis: {
    show: true,
    size: 'auto' as const,
    axisLine: {
      show: true,
      color: '#2a2e39',
      size: 1,
    },
    tickText: {
      show: true,
      color: '#787b86',
      size: 11,
      family: 'sans-serif',
      weight: 'normal',
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: '#2a2e39',
    },
  },
  yAxis: {
    show: true,
    size: 'auto' as const,
    position: 'right' as const,
    inside: false,
    axisLine: {
      show: true,
      color: '#2a2e39',
      size: 1,
    },
    tickText: {
      show: true,
      color: '#787b86',
      size: 11,
      family: 'monospace',
      weight: 'normal',
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: '#2a2e39',
    },
  },
  separator: {
    size: 1,
    color: '#2a2e39',
    fill: true,
    activeBackgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  crosshair: {
    show: true,
    horizontal: {
      show: true,
      line: {
        show: true,
        style: 'dashed' as const,
        dashedValue: [3, 3],
        size: 1,
        color: '#787b86',
      },
      text: {
        show: true,
        style: 'fill' as const,
        color: '#ffffff',
        size: 11,
        family: 'monospace',
        weight: 'normal',
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 3,
        paddingBottom: 3,
        borderRadius: 2,
        backgroundColor: '#2a2e39',
      },
    },
    vertical: {
      show: true,
      line: {
        show: true,
        style: 'dashed' as const,
        dashedValue: [3, 3],
        size: 1,
        color: '#787b86',
      },
      text: {
        show: true,
        style: 'fill' as const,
        color: '#ffffff',
        size: 11,
        family: 'sans-serif',
        weight: 'normal',
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 3,
        paddingBottom: 3,
        borderRadius: 2,
        backgroundColor: '#2a2e39',
      },
    },
  },
  indicator: {
    tooltip: {
      showRule: 'none' as const,
    },
    lastValueMark: {
      show: true,
      text: {
        show: true,
        style: 'fill' as const,
        color: '#ffffff',
        size: 10,
        family: 'monospace',
        weight: 'bold',
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 2,
        paddingBottom: 2,
        borderRadius: 2,
      },
    },
    bars: [
      {
        style: 'fill' as const,
        borderStyle: 'solid' as const,
        borderSize: 1,
        borderDashedValue: [2, 2],
        upColor: 'rgba(38, 166, 154, 0.7)',
        downColor: 'rgba(239, 83, 80, 0.7)',
        noChangeColor: '#888888',
      },
    ],
    lines: [
      {
        style: 'solid' as const,
        smooth: false,
        size: 1.5,
        color: '#f59e0b',
      },
      {
        style: 'solid' as const,
        smooth: false,
        size: 1.5,
        color: '#2962ff',
      },
      {
        style: 'solid' as const,
        smooth: false,
        size: 1.5,
        color: '#ec4899',
      },
    ],
  },
  overlay: {
    point: {
      color: '#ffffff',
      borderColor: '#2962FF',
      borderSize: 2,
      radius: 4.5,
      activeColor: '#ffffff',
      activeBorderColor: '#2962FF',
      activeBorderSize: 2.5,
      activeRadius: 5.5,
    },
    line: {
      style: 'solid' as const,
      smooth: false,
      color: '#2962FF',
      size: 2,
      dashedValue: [4, 4],
    },
    rect: {
      style: 'stroke_fill' as const,
      color: 'rgba(41, 98, 255, 0.12)',
      borderColor: '#2962FF',
      borderSize: 1.5,
    },
    polygon: {
      style: 'stroke_fill' as const,
      color: 'rgba(41, 98, 255, 0.12)',
      borderColor: '#2962FF',
      borderSize: 1.5,
    },
    circle: {
      style: 'stroke_fill' as const,
      color: '#ffffff',
      borderColor: '#2962FF',
      borderSize: 2,
    },
    text: {
      color: '#d1d4dc',
      size: 11,
      family: 'sans-serif',
      weight: 'normal',
    },
  },
};

export interface ChartScreenshotIndicatorMeta {
  id: string;
  name: string;
  title: string;
  color: string;
  value: string;
  visible?: boolean;
}

export interface ChartScreenshotMeta {
  symbol?: string;
  timeframe?: string;
  baseDatasetMeta?: {
    symbol: string;
    baseTimeframe: string;
    count: number;
  } | null;
  candle?: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  } | null;
  indicators?: ChartScreenshotIndicatorMeta[];
  countdownText?: string;
}

/**
 * ChartAdapter Interface for interchangeable charting engines
 */
export interface IChartAdapter {
  setCandles(candles: ICandle[]): void;
  appendCandle(candle: ICandle): void;
  setTimeframe(tf: Timeframe): void;
  addIndicator(spec: IndicatorSpec): void;
  overrideIndicator(spec: IndicatorSpec): void;
  removeIndicator(id: string): void;
  setTradeMarkers(trades: CompletedTrade[], currentTime?: number): void;
  setRunningPosition(pos: ActivePosition | null): void;
  focusTrade(tradeId: string): void;
  clearTradeFocus(): void;
  addDrawing(drawing: ChartDrawingSpec): void;
  removeDrawing(id: string): void;
  loadDrawings(drawings: ChartDrawingSpec[]): void;
  getDrawings(): ChartDrawingSpec[];
  setDrawingsLocked(locked: boolean): void;
  isDrawingsLocked(): boolean;
  removeSelectedDrawing(): boolean;
  getSelectedDrawingId(): string | null;
  updateDrawing(id: string, updates: Partial<ChartDrawingSpec>): void;
  onDrawingSelect(cb: (drawing: ChartDrawingSpec | null) => void): void;
  onDrawingMoveState(cb: (isMoving: boolean, figureType?: string) => void): void;
  onDrawingHover(cb: (isHovering: boolean, figureType?: string) => void): void;
  isUserMovingDrawing(): boolean;
  isUserHoveringDrawing(): boolean;
  deselectDrawing(): void;
  createDrawingTool(
    type: ChartDrawingSpec['type'],
    options?: { color?: string; lineWidth?: number; markerSymbol?: string; onComplete?: () => void }
  ): void;
  cancelDrawing(): void;
  onVisibleRangeChange(cb: (range: VisibleRangeData) => void): void;
  onCrosshairChange(cb: (data: { candle?: ICandle | null; dataIndex?: number }) => void): void;
  onDrawingChange(cb: (drawings: ChartDrawingSpec[]) => void): void;
  setChartType(type: 'candles' | 'line'): void;
  resetChart(): void;
  getDataIndexFromCoordinates(x: number, y: number): number | null;
  takeScreenshot(meta?: ChartScreenshotMeta): Promise<string> | string;
  destroy(): void;
}

/**
 * Concrete implementation using KLineChart
 */
export class KLineChartAdapter implements IChartAdapter {
  private chart: Nullable<Chart> = null;
  private container: HTMLElement;
  private baseCandles: ICandle[] = [];
  private currentCandles: ICandle[] = [];
  private currentTimeframe: Timeframe = '5m';
  private indicatorsMap = new Map<string, { paneId: string; name: string; spec: IndicatorSpec }>();
  private activeCreatingOverlayId: string | null = null;
  private trades: CompletedTrade[] = [];
  private tradeOverlayIds: string[] = [];
  private focusTradeOverlayIds: string[] = [];
  private runningOverlayIds: string[] = [];
  private drawingsMap = new Map<string, ChartDrawingSpec>();
  private drawingOverlayMap = new Map<string, string>(); // drawingId -> kline overlayId
  private drawingsLocked = false;
  private selectedDrawingId: string | null = null;
  private onVisibleRangeCallback: ((range: VisibleRangeData) => void) | null = null;
  private onCrosshairCallback: ((data: { candle?: ICandle | null; dataIndex?: number }) => void) | null = null;
  private onDrawingChangeCallback: ((drawings: ChartDrawingSpec[]) => void) | null = null;
  private onDrawingSelectCallback: ((drawing: ChartDrawingSpec | null) => void) | null = null;
  private onDrawingMoveStateCallback: ((isMoving: boolean, figureType?: string) => void) | null = null;
  private onDrawingHoverCallback: ((isHovering: boolean, figureType?: string) => void) | null = null;
  private isMovingDrawing = false;
  private isHoveringDrawing = false;
  private volumePaneId: string | null = null;

  constructor(container: HTMLElement, options?: { timeframe?: Timeframe }) {
    this.container = container;
    this.currentTimeframe = options?.timeframe || '5m';

    // Register custom TV overlays and indicators
    registerCustomTradingViewOverlays();
    registerCustomTradingViewIndicators();

    // Initialize KLineChart with TradingView Dark palette
    this.chart = init(container, {
      locale: 'en-US',
      styles: TRADINGVIEW_DARK_THEME,
      zoomAnchor: 'cursor',
    });

    if (this.chart) {
      // Hook up visible range observer
      this.chart.subscribeAction('onVisibleRangeChange', (data: any) => {
        if (this.onVisibleRangeCallback && data) {
          const dl = this.chart?.getDataList() || [];
          const fromBar = dl[data.from];
          const toBar = dl[data.to];
          this.onVisibleRangeCallback({
            from: data.from,
            to: data.to,
            fromTime: fromBar?.timestamp,
            toTime: toBar?.timestamp,
          });
        }
      });

      // Hook up crosshair & hover observer for live indicator values and OHLC HUD
      this.chart.subscribeAction('onCrosshairChange', (data: any) => {
        if (this.onCrosshairCallback) {
          if (data && data.kLineData) {
            const kd = data.kLineData;
            this.onCrosshairCallback({
              candle: {
                time: Math.floor(kd.timestamp / 1000),
                open: kd.open,
                high: kd.high,
                low: kd.low,
                close: kd.close,
                volume: kd.volume,
              },
              dataIndex: data.dataIndex,
            });
          } else {
            this.onCrosshairCallback({ candle: null, dataIndex: undefined });
          }
        }
      });
    }
  }

  /**
   * Transforms unified ICandle into KLineData format
   */
  private toKLineData(c: ICandle): KLineData {
    // Ensure timestamp is in milliseconds
    const timestamp = c.time < 1e11 ? c.time * 1000 : c.time;
    return {
      timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume ?? 100,
    };
  }

  private subscribeCallback: ((candle: KLineData) => void) | null = null;

  private tfToPeriod(tf: Timeframe): { type: 'minute' | 'hour' | 'day'; span: number } {
    switch (tf) {
      case '1m': return { type: 'minute', span: 1 };
      case '3m': return { type: 'minute', span: 3 };
      case '5m': return { type: 'minute', span: 5 };
      case '15m': return { type: 'minute', span: 15 };
      case '30m': return { type: 'minute', span: 30 };
      case '1h': return { type: 'hour', span: 1 };
      case '4h': return { type: 'hour', span: 4 };
      case '1d': return { type: 'day', span: 1 };
      default: return { type: 'minute', span: 5 };
    }
  }

  /** Center timestamp (ms) of the current visible range, used to keep the same date in view across timeframes */
  private getVisibleCenterTimestamp(): number | null {
    const c: any = this.chart;
    if (!c) return null;
    try {
      const range = c.getVisibleRange?.();
      const dl = c.getDataList?.() || [];
      if (!range || dl.length === 0) return null;
      const mid = Math.min(dl.length - 1, Math.max(0, Math.floor((range.from + range.to) / 2)));
      return dl[mid]?.timestamp ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Pushes candles into KLineChart v10.
   * v10 only invokes getBars once BOTH symbol and period are set, so we always set them first.
   */
  private pushData(candles: ICandle[], keepCenter: number | null = null) {
    const c: any = this.chart;
    if (!c) return;
    const dataList = candles.map((k) => this.toKLineData(k));

    c.setSymbol?.({ ticker: 'FS', pricePrecision: 2, volumePrecision: 0 });
    c.setPeriod?.(this.tfToPeriod(this.currentTimeframe));
    c.setDataLoader({
      getBars: (params: any) => {
        params.callback(dataList, false);
        if (keepCenter != null) {
          setTimeout(() => c.scrollToTimestamp?.(keepCenter), 0);
        }
      },
      subscribeBar: (params: any) => {
        this.subscribeCallback = params.callback;
      },
      unsubscribeBar: () => {
        this.subscribeCallback = null;
      },
    });
  }

  public setCandles(candles: ICandle[]) {
    const center = this.currentCandles.length > 0 ? this.getVisibleCenterTimestamp() : null;
    this.baseCandles = candles;
    this.currentCandles = candles;
    if (!this.chart) return;
    this.pushData(candles, center);
    this.setTradeMarkers(this.trades);
    this.reapplyDrawings();

    // Re-override indicators on candle data update so calculation evaluates immediately
    if (this.indicatorsMap.size > 0) {
      this.indicatorsMap.forEach((entry) => {
        this.overrideIndicator(entry.spec);
      });
    }
  }

  public appendCandle(candle: ICandle) {
    this.baseCandles.push(candle);
    this.currentCandles.push(candle);
    if (this.subscribeCallback) {
      this.subscribeCallback(this.toKLineData(candle));
    }
  }

  /**
   * Resamples candle series to new timeframe while preserving visible date position
   */
  public setTimeframe(tf: Timeframe) {
    if (tf === this.currentTimeframe && this.currentCandles.length > 0) return;
    const center = this.getVisibleCenterTimestamp();
    this.currentTimeframe = tf;
    if (!this.chart || this.baseCandles.length === 0) return;

    // Candles passed in are already resampled by the app; resampling again to the same tf is idempotent.
    const resampled = resampleCandles(this.baseCandles, tf);
    this.currentCandles = resampled.length > 0 ? resampled : this.baseCandles;
    this.pushData(this.currentCandles, center);

    // Refresh trade markers & drawings onto the resampled timeframe
    this.setTradeMarkers(this.trades);
    this.reapplyDrawings();
  }

  public setChartType(type: 'candles' | 'line') {
    if (!this.chart) return;
    this.chart.setStyles({
      candle: {
        type: type === 'line' ? 'area' : 'candle_solid',
      },
    });
  }

  private buildIndicatorStyles(name: string, spec: IndicatorSpec) {
    const mainColor = spec.color || '#f59e0b';
    const mainSize = spec.lineWidth || 1.5;

    if (name === 'BOLL') {
      return {
        lines: [
          { color: mainColor, size: 1, style: 'solid' as const },
          { color: mainColor, size: mainSize, style: 'solid' as const },
          { color: mainColor, size: 1, style: 'solid' as const },
        ],
      };
    }

    if (name === 'RANGE_HL') {
      return {
        lines: [
          { color: '#10b981', size: mainSize, style: 'solid' as const },
          { color: '#787b86', size: 1, style: 'dashed' as const },
          { color: '#ef5350', size: mainSize, style: 'solid' as const },
        ],
      };
    }

    if (name === 'MACD') {
      return {
        lines: [
          { color: '#2962ff', size: 1.5, style: 'solid' as const },
          { color: '#f59e0b', size: 1.5, style: 'solid' as const },
        ],
        bars: [
          {
            upColor: 'rgba(38, 166, 154, 0.75)',
            downColor: 'rgba(239, 83, 80, 0.75)',
            noChangeColor: '#888888',
          },
        ],
      };
    }

    return {
      lines: [
        {
          color: mainColor,
          size: mainSize,
          style: 'solid' as const,
        },
      ],
    };
  }

  public addIndicator(spec: IndicatorSpec) {
    if (!this.chart) return;
    try {
      const typeUpper = spec.type.toUpperCase();
      let indicatorName = typeUpper;

      if (typeUpper === 'SMA' || typeUpper === 'EMA') {
        indicatorName = typeUpper;
      } else if (typeUpper === 'WMA') {
        indicatorName = 'WMA';
      } else if (typeUpper === 'RSI') {
        indicatorName = 'RSI';
      } else if (typeUpper === 'ATR') {
        indicatorName = 'ATR';
      } else if (typeUpper === 'VWAP') {
        indicatorName = 'VWAP';
      } else if (typeUpper === 'BOLL') {
        indicatorName = 'BOLL';
      } else if (typeUpper === 'MACD') {
        indicatorName = 'MACD';
      } else if (typeUpper === 'SUPERTREND') {
        indicatorName = 'SuperTrend';
      } else if (
        typeUpper === 'RANGE_HL' ||
        typeUpper === 'HIGHEST' ||
        typeUpper === 'LOWEST'
      ) {
        indicatorName = 'RANGE_HL';
      }

      // Check if this indicator already exists in our map; if so, override instead
      if (this.indicatorsMap.has(spec.id)) {
        this.overrideIndicator(spec);
        return;
      }

      const isSubPane =
        spec.overlay === false ||
        ['RSI', 'ATR', 'MACD', 'KDJ', 'VOL'].includes(typeUpper);
      const isOverlay = !isSubPane;
      const targetPane = isOverlay ? 'candle_pane' : `pane_sub_${spec.id}`;

      let calcParams = spec.calcParams;
      if (!calcParams && spec.period) {
        if (indicatorName === 'BOLL') {
          calcParams = [spec.period, spec.stdDev ?? 2];
        } else if (indicatorName === 'SuperTrend') {
          calcParams = [spec.period, spec.multiplier ?? 3];
        } else {
          calcParams = [spec.period];
        }
      }

      const indicatorStyles = this.buildIndicatorStyles(indicatorName, spec);

      // In KLineCharts v10, createIndicator takes (IndicatorCreate, isStack).
      // isStack = true allows multiple overlays to coexist in candle_pane.
      this.chart.createIndicator(
        {
          id: spec.id,
          name: indicatorName,
          calcParams,
          paneId: targetPane,
          styles: indicatorStyles,
        },
        true
      );

      this.indicatorsMap.set(spec.id, {
        paneId: targetPane,
        name: indicatorName,
        spec,
      });
    } catch (e) {
      console.warn('Failed adding indicator:', e);
    }
  }

  public overrideIndicator(spec: IndicatorSpec) {
    if (!this.chart) return;
    const existing = this.indicatorsMap.get(spec.id);
    if (!existing) {
      this.addIndicator(spec);
      return;
    }

    try {
      let calcParams = spec.calcParams;
      if (!calcParams && spec.period) {
        if (existing.name === 'BOLL') {
          calcParams = [spec.period, spec.stdDev ?? 2];
        } else if (existing.name === 'SuperTrend') {
          calcParams = [spec.period, spec.multiplier ?? 3];
        } else {
          calcParams = [spec.period];
        }
      }

      const styles = this.buildIndicatorStyles(existing.name, spec);
      this.chart.overrideIndicator({
        id: spec.id,
        name: existing.name,
        paneId: existing.paneId,
        calcParams,
        styles,
      });
      this.indicatorsMap.set(spec.id, { ...existing, spec });
    } catch (e) {
      console.warn('Failed overriding indicator:', e);
    }
  }

  public removeIndicator(id: string) {
    if (!this.chart) return;
    const existing = this.indicatorsMap.get(id);
    if (existing) {
      this.chart.removeIndicator({
        id,
        name: existing.name,
        paneId: existing.paneId,
      });
      this.indicatorsMap.delete(id);
    }
    // Also remove by id directly to catch any pane or overlay
    this.chart.removeIndicator({ id });
  }

  /**
   * Renders small Buy/Sell arrows on chart canvas only, optionally filtered up to currentTime for replay
   */
  public setTradeMarkers(trades: CompletedTrade[], currentTime?: number) {
    this.trades = trades;
    if (!this.chart) return;

    // Remove existing trade markers
    this.tradeOverlayIds.forEach((id) => this.chart?.removeOverlay({ id }));
    this.tradeOverlayIds = [];

    // Remove active trade focus lines
    this.clearTradeFocus();

    const currentMs = currentTime !== undefined
      ? (currentTime < 1e11 ? currentTime * 1000 : currentTime)
      : undefined;

    // Draw small Buy/Sell entry and exit arrows
    trades.forEach((trade) => {
      const entryMs = trade.entryTime < 1e11 ? trade.entryTime * 1000 : trade.entryTime;
      const exitMs = trade.exitTime < 1e11 ? trade.exitTime * 1000 : trade.exitTime;

      // In replay mode, do not show trades that have not entered yet
      if (currentMs !== undefined && entryMs > currentMs) {
        return;
      }

      const isBuy = trade.side === 'buy';

      // Entry Marker
      const entryId = this.chart?.createOverlay({
        name: 'simpleAnnotation',
        id: `marker_entry_${trade.id}`,
        groupId: 'trade_markers',
        points: [{ timestamp: entryMs, value: trade.entryPrice }],
        extendData: isBuy ? '▲ BUY' : '▼ SELL',
        styles: {
          line: { style: 'solid', size: 1, color: isBuy ? '#26a69a' : '#ef5350' },
          text: {
            color: '#ffffff',
            backgroundColor: isBuy ? '#26a69a' : '#ef5350',
            size: 9,
            family: 'monospace',
            weight: 'bold',
            paddingLeft: 3,
            paddingRight: 3,
            paddingTop: 1,
            paddingBottom: 1,
            borderRadius: 2,
          },
        },
      });
      if (typeof entryId === 'string') this.tradeOverlayIds.push(entryId);

      // Exit Marker - only render if trade has already exited at current replay time
      if (currentMs !== undefined && exitMs > currentMs) {
        return;
      }

      const isWin = trade.pnl >= 0;
      const exitId = this.chart?.createOverlay({
        name: 'simpleAnnotation',
        id: `marker_exit_${trade.id}`,
        groupId: 'trade_markers',
        points: [{ timestamp: exitMs, value: trade.exitPrice }],
        extendData: `${trade.reason === 'TP' ? '🎯 TP' : trade.reason === 'SL' ? '🛑 SL' : '✕ Exit'} (${isWin ? '+' : ''}$${trade.pnl.toFixed(1)})`,
        styles: {
          line: { style: 'dashed', size: 1, color: isWin ? '#26a69a' : '#ef5350' },
          text: {
            color: isWin ? '#26a69a' : '#ef5350',
            backgroundColor: 'rgba(19, 23, 34, 0.9)',
            size: 9,
            family: 'monospace',
            weight: 'bold',
            paddingLeft: 3,
            paddingRight: 3,
            paddingTop: 1,
            paddingBottom: 1,
            borderRadius: 2,
          },
        },
      });
      if (typeof exitId === 'string') this.tradeOverlayIds.push(exitId);
    });
  }

  /**
   * Scrolls to a trade and renders SL/TP lines & full P&L box
   */
  public focusTrade(tradeId: string) {
    if (!this.chart) return;
    const trade = this.trades.find((t) => t.id === tradeId);
    if (!trade) return;

    this.clearTradeFocus();

    const entryMs = trade.entryTime < 1e11 ? trade.entryTime * 1000 : trade.entryTime;
    const exitMs = trade.exitTime < 1e11 ? trade.exitTime * 1000 : trade.exitTime;
    const isBuy = trade.side === 'buy';

    // 1. Scroll and zoom into trade
    this.chart.scrollToTimestamp(entryMs);

    // 2. Draw SL / TP zone box using custom overlay
    const positionOverlayId = this.chart.createOverlay({
      name: isBuy ? 'tv_long_position' : 'tv_short_position',
      id: `focus_position_${trade.id}`,
      groupId: 'trade_focus',
      points: [
        { timestamp: entryMs, value: trade.entryPrice },
        { timestamp: exitMs, value: trade.tp ?? (isBuy ? trade.entryPrice + 10 : trade.entryPrice - 10) },
        { timestamp: exitMs, value: trade.sl ?? (isBuy ? trade.entryPrice - 5 : trade.entryPrice + 5) },
      ],
      extendData: {
        entryPrice: trade.entryPrice,
        tpPrice: trade.tp,
        slPrice: trade.sl,
        pnl: trade.pnl,
      },
    });
    if (typeof positionOverlayId === 'string') this.focusTradeOverlayIds.push(positionOverlayId);

    // 3. Draw trade connector line between entry and exit
    const connectorId = this.chart.createOverlay({
      name: 'segment',
      id: `focus_connector_${trade.id}`,
      groupId: 'trade_focus',
      points: [
        { timestamp: entryMs, value: trade.entryPrice },
        { timestamp: exitMs, value: trade.exitPrice },
      ],
      styles: {
        line: {
          style: 'dashed',
          size: 1.5,
          color: trade.pnl >= 0 ? '#26a69a' : '#ef5350',
          dashedValue: [3, 3],
        },
      },
    });
    if (typeof connectorId === 'string') this.focusTradeOverlayIds.push(connectorId);
  }

  public clearTradeFocus() {
    this.focusTradeOverlayIds.forEach((id) => this.chart?.removeOverlay({ id }));
    this.focusTradeOverlayIds = [];
  }

  public setRunningPosition(pos: ActivePosition | null) {
    if (!this.chart) return;
    this.runningOverlayIds.forEach((id) => this.chart?.removeOverlay({ id }));
    this.runningOverlayIds = [];

    if (!pos) return;

    const entryMs = pos.entryTime < 1e11 ? pos.entryTime * 1000 : pos.entryTime;
    const isBuy = pos.side === 'buy';

    const overlayId = this.chart.createOverlay({
      name: 'simpleAnnotation',
      id: 'active_running_position',
      groupId: 'active_position',
      points: [{ timestamp: entryMs, value: pos.entryPrice }],
      extendData: isBuy ? '● ACTIVE BUY 1.00' : '● ACTIVE SELL 1.00',
      styles: {
        line: { style: 'solid', size: 1.5, color: '#38bdf8' },
        text: {
          color: '#ffffff',
          backgroundColor: '#0284c7',
          size: 9,
          family: 'monospace',
          weight: 'bold',
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2,
          borderRadius: 3,
        },
      },
    });
    if (typeof overlayId === 'string') this.runningOverlayIds.push(overlayId);
  }

  public setDrawingsLocked(locked: boolean): void {
    this.drawingsLocked = locked;
    if (!this.chart) return;
    this.drawingOverlayMap.forEach((overlayId) => {
      this.chart?.overrideOverlay({
        id: overlayId,
        lock: locked,
      });
    });
  }

  public isDrawingsLocked(): boolean {
    return this.drawingsLocked;
  }

  public onDrawingSelect(cb: (drawing: ChartDrawingSpec | null) => void) {
    this.onDrawingSelectCallback = cb;
  }

  public onDrawingMoveState(cb: (isMoving: boolean, figureType?: string) => void) {
    this.onDrawingMoveStateCallback = cb;
  }

  public onDrawingHover(cb: (isHovering: boolean, figureType?: string) => void) {
    this.onDrawingHoverCallback = cb;
  }

  public isUserMovingDrawing(): boolean {
    return this.isMovingDrawing;
  }

  public isUserHoveringDrawing(): boolean {
    return this.isHoveringDrawing;
  }

  public deselectDrawing() {
    this.selectedDrawingId = null;
    if (this.onDrawingSelectCallback) {
      this.onDrawingSelectCallback(null);
    }
  }

  public updateDrawing(id: string, updates: Partial<ChartDrawingSpec>) {
    const existing = this.drawingsMap.get(id);
    if (!existing) return;
    const updated: ChartDrawingSpec = { ...existing, ...updates };
    this.drawingsMap.set(id, updated);

    const overlayId = this.drawingOverlayMap.get(id);
    if (overlayId && this.chart) {
      const styles: any = {
        line: {
          color: updated.color || '#2962FF',
          size: updated.lineWidth || 2,
          style: updated.lineStyle || 'solid',
        },
      };
      if (updated.type === 'rectangle') {
        styles.rect = {
          style: 'stroke_fill',
          color: updated.fillColor || (updated.color ? `${updated.color}22` : 'rgba(41, 98, 255, 0.12)'),
          borderColor: updated.color || '#2962FF',
          borderSize: updated.lineWidth || 1.5,
          borderStyle: updated.lineStyle || 'solid',
        };
        styles.polygon = {
          style: 'stroke_fill',
          color: updated.fillColor || (updated.color ? `${updated.color}22` : 'rgba(41, 98, 255, 0.12)'),
          borderColor: updated.color || '#2962FF',
          borderSize: updated.lineWidth || 1.5,
          borderStyle: updated.lineStyle || 'solid',
        };
      }
      this.chart.overrideOverlay({
        id: overlayId,
        styles,
        lock: updated.lock,
      });
    }

    if (this.selectedDrawingId === id && this.onDrawingSelectCallback) {
      this.onDrawingSelectCallback(updated);
    }
    this.notifyDrawingChange();
  }

  public removeSelectedDrawing(): boolean {
    if (!this.selectedDrawingId) return false;
    const id = this.selectedDrawingId;
    this.removeDrawing(id);
    this.selectedDrawingId = null;
    if (this.onDrawingSelectCallback) {
      this.onDrawingSelectCallback(null);
    }
    return true;
  }

  public getSelectedDrawingId(): string | null {
    return this.selectedDrawingId;
  }

  public getDrawings(): ChartDrawingSpec[] {
    if (this.chart) {
      try {
        const liveOverlays = this.chart.getOverlays({ groupId: 'user_drawings' });
        liveOverlays.forEach((ov) => {
          this.drawingOverlayMap.forEach((ovId, dId) => {
            if (ovId === ov.id && ov.points && ov.points.length > 0) {
              const existing = this.drawingsMap.get(dId);
              if (existing) {
                const pts: DrawingPoint[] = ov.points.map((p: any) => ({
                  time: p.timestamp
                    ? p.timestamp > 1e11
                      ? Math.floor(p.timestamp / 1000)
                      : p.timestamp
                    : (existing.points[0]?.time ?? 0),
                  price: typeof p.value === 'number' ? Number(p.value.toFixed(2)) : (existing.points[0]?.price ?? 0),
                }));
                existing.points = pts;
                this.drawingsMap.set(dId, existing);
              }
            }
          });
        });
      } catch (e) {}
    }
    return Array.from(this.drawingsMap.values());
  }

  private handleOverlayPointUpdate(drawingId: string, type: ChartDrawingSpec['type'], overlay: any) {
    if (!overlay) return;
    const existing = this.drawingsMap.get(drawingId);

    let pts: DrawingPoint[] = [];
    if (Array.isArray(overlay.points) && overlay.points.length > 0) {
      pts = overlay.points.map((p: any) => {
        let t = 0;
        if (p.timestamp) {
          t = p.timestamp > 1e11 ? Math.floor(p.timestamp / 1000) : p.timestamp;
        } else if (p.dataIndex !== undefined && this.chart) {
          const dl = this.chart.getDataList() || [];
          const bar = dl[p.dataIndex];
          if (bar) {
            t = bar.timestamp > 1e11 ? Math.floor(bar.timestamp / 1000) : bar.timestamp;
          }
        }
        return {
          time: t,
          price: typeof p.value === 'number' ? Number(p.value.toFixed(2)) : (existing?.points[0]?.price ?? 0),
        };
      });
    } else if (existing) {
      pts = existing.points;
    }

    const updatedDrawing: ChartDrawingSpec = {
      id: drawingId,
      type: existing?.type || type,
      points: pts,
      color: existing?.color || (overlay.styles?.line?.color ?? '#2962FF'),
      lineWidth: existing?.lineWidth || (overlay.styles?.line?.size ?? 2),
      lineStyle: existing?.lineStyle || (overlay.styles?.line?.style ?? 'solid'),
      text: overlay.extendData?.text || (typeof overlay.extendData === 'string' ? overlay.extendData : existing?.text),
      entryPrice: overlay.extendData?.entryPrice ?? (pts[0] ? pts[0].price : existing?.entryPrice),
      tpPrice: overlay.extendData?.tpPrice ?? (pts[1] ? pts[1].price : existing?.tpPrice),
      slPrice: overlay.extendData?.slPrice ?? (pts[2] ? pts[2].price : existing?.slPrice),
      markerSymbol: overlay.extendData?.markerSymbol || existing?.markerSymbol,
      lock: this.drawingsLocked,
    };

    this.drawingsMap.set(drawingId, updatedDrawing);
    this.drawingOverlayMap.set(drawingId, overlay.id);
    this.notifyDrawingChange();

    if (this.selectedDrawingId === drawingId && this.onDrawingSelectCallback) {
      this.onDrawingSelectCallback(updatedDrawing);
    }
  }

  private handleOverlayRemoved(drawingId: string) {
    this.drawingsMap.delete(drawingId);
    this.drawingOverlayMap.delete(drawingId);
    if (this.selectedDrawingId === drawingId) {
      this.selectedDrawingId = null;
      if (this.onDrawingSelectCallback) {
        this.onDrawingSelectCallback(null);
      }
    }
    this.notifyDrawingChange();
  }

  public addDrawing(drawing: ChartDrawingSpec) {
    this.drawingsMap.set(drawing.id, drawing);
    this.applyDrawingToChart(drawing);
    this.notifyDrawingChange();
  }

  public removeDrawing(id: string) {
    this.drawingsMap.delete(id);
    const overlayId = this.drawingOverlayMap.get(id);
    if (overlayId && this.chart) {
      this.chart.removeOverlay({ id: overlayId });
      this.drawingOverlayMap.delete(id);
    }
    if (this.selectedDrawingId === id) {
      this.selectedDrawingId = null;
      if (this.onDrawingSelectCallback) {
        this.onDrawingSelectCallback(null);
      }
    }
    this.notifyDrawingChange();
  }

  public loadDrawings(drawings: ChartDrawingSpec[]) {
    // Clear existing
    this.drawingOverlayMap.forEach((overlayId) => this.chart?.removeOverlay({ id: overlayId }));
    this.drawingOverlayMap.clear();
    this.drawingsMap.clear();

    drawings.forEach((d) => {
      this.drawingsMap.set(d.id, d);
      this.applyDrawingToChart(d);
    });
  }

  private applyDrawingToChart(drawing: ChartDrawingSpec) {
    if (!this.chart || drawing.points.length === 0) return;

    // Convert points to milliseconds timestamps
    const kPoints = drawing.points.map((p) => ({
      timestamp: p.time < 1e11 ? p.time * 1000 : p.time,
      value: p.price,
    }));

    let kOverlayName = 'segment';
    switch (drawing.type) {
      case 'trendline':
        kOverlayName = 'segment';
        break;
      case 'horizontal':
        kOverlayName = 'horizontalStraightLine';
        break;
      case 'vertical':
        kOverlayName = 'verticalStraightLine';
        break;
      case 'ray':
        kOverlayName = 'rayLine';
        break;
      case 'fibonacci':
        kOverlayName = 'fibonacciLine';
        break;
      case 'rectangle':
        kOverlayName = 'rect';
        break;
      case 'long_position':
        kOverlayName = 'tv_long_position';
        break;
      case 'short_position':
        kOverlayName = 'tv_short_position';
        break;
      case 'measure':
        kOverlayName = 'tv_measure';
        break;
      case 'text':
        kOverlayName = 'simpleAnnotation';
        break;
      case 'marker':
        kOverlayName = 'tv_marker';
        break;
    }

    let extendData: any = drawing.text || '';
    if (drawing.type === 'marker') {
      extendData = { markerSymbol: drawing.markerSymbol || '🎯' };
    } else if (drawing.type === 'long_position' || drawing.type === 'short_position') {
      extendData = {
        entryPrice: drawing.entryPrice ?? drawing.points[0]?.price,
        tpPrice: drawing.tpPrice ?? (drawing.points[1] ? drawing.points[1].price : (drawing.type === 'long_position' ? (drawing.points[0]?.price || 0) * 1.015 : (drawing.points[0]?.price || 0) * 0.985)),
        slPrice: drawing.slPrice ?? (drawing.points[2] ? drawing.points[2].price : (drawing.type === 'long_position' ? (drawing.points[0]?.price || 0) * 0.99 : (drawing.points[0]?.price || 0) * 1.01)),
      };
    }

    const styles: any = {
      line: {
        color: drawing.color || '#2962FF',
        size: drawing.lineWidth || 2,
        style: drawing.lineStyle || 'solid',
      },
    };
    if (drawing.type === 'rectangle') {
      styles.rect = {
        style: 'stroke_fill',
        color: drawing.fillColor || (drawing.color ? `${drawing.color}22` : 'rgba(41, 98, 255, 0.12)'),
        borderColor: drawing.color || '#2962FF',
        borderSize: drawing.lineWidth || 1.5,
        borderStyle: drawing.lineStyle || 'solid',
      };
      styles.polygon = {
        style: 'stroke_fill',
        color: drawing.fillColor || (drawing.color ? `${drawing.color}22` : 'rgba(41, 98, 255, 0.12)'),
        borderColor: drawing.color || '#2962FF',
        borderSize: drawing.lineWidth || 1.5,
        borderStyle: drawing.lineStyle || 'solid',
      };
    }

    const overlayId = this.chart.createOverlay({
      name: kOverlayName,
      id: `drawing_${drawing.id}`,
      groupId: 'user_drawings',
      points: kPoints,
      extendData,
      lock: this.drawingsLocked,
      styles,
      onDrawEnd: (event: any) => {
        this.handleOverlayPointUpdate(drawing.id, drawing.type, event.overlay);
        this.selectedDrawingId = drawing.id;
        const d = this.drawingsMap.get(drawing.id);
        if (this.onDrawingSelectCallback) {
          this.onDrawingSelectCallback(d || null);
        }
      },
      onMouseEnter: (event: any) => {
        this.isHoveringDrawing = true;
        const fType = event?.figure?.type || event?.figureType;
        if (this.onDrawingHoverCallback) {
          this.onDrawingHoverCallback(true, fType);
        }
      },
      onMouseLeave: () => {
        this.isHoveringDrawing = false;
        if (this.onDrawingHoverCallback) {
          this.onDrawingHoverCallback(false);
        }
      },
      onPressedMoveStart: (event: any) => {
        this.isMovingDrawing = true;
        const fType = event?.figure?.type || event?.figureType;
        if (this.onDrawingMoveStateCallback) {
          this.onDrawingMoveStateCallback(true, fType);
        }
      },
      onPressedMoveEnd: (event: any) => {
        this.isMovingDrawing = false;
        this.handleOverlayPointUpdate(drawing.id, drawing.type, event.overlay);
        if (this.onDrawingMoveStateCallback) {
          this.onDrawingMoveStateCallback(false);
        }
      },
      onPressedMoving: (event: any) => {
        this.isMovingDrawing = true;
        this.handleOverlayPointUpdate(drawing.id, drawing.type, event.overlay);
        const fType = event?.figure?.type || event?.figureType;
        if (this.onDrawingMoveStateCallback) {
          this.onDrawingMoveStateCallback(true, fType);
        }
      },
      onRemoved: () => {
        this.handleOverlayRemoved(drawing.id);
      },
      onSelected: () => {
        this.selectedDrawingId = drawing.id;
        const d = this.drawingsMap.get(drawing.id);
        if (this.onDrawingSelectCallback) {
          this.onDrawingSelectCallback(d || null);
        }
      },
      onDeselected: () => {
        if (this.selectedDrawingId === drawing.id) {
          this.selectedDrawingId = null;
          if (this.onDrawingSelectCallback) {
            this.onDrawingSelectCallback(null);
          }
        }
      },
    });

    if (typeof overlayId === 'string') {
      this.drawingOverlayMap.set(drawing.id, overlayId);
    }
  }

  private reapplyDrawings() {
    this.drawingOverlayMap.forEach((overlayId) => this.chart?.removeOverlay({ id: overlayId }));
    this.drawingOverlayMap.clear();
    this.drawingsMap.forEach((d) => this.applyDrawingToChart(d));
  }

  private notifyDrawingChange() {
    if (this.onDrawingChangeCallback) {
      this.onDrawingChangeCallback(Array.from(this.drawingsMap.values()));
    }
  }

  public createDrawingTool(
    type: ChartDrawingSpec['type'],
    options?: { color?: string; lineWidth?: number; markerSymbol?: string; onComplete?: () => void }
  ) {
    if (!this.chart) return;
    let kOverlayName = 'segment';
    switch (type) {
      case 'trendline':
        kOverlayName = 'segment';
        break;
      case 'horizontal':
        kOverlayName = 'horizontalStraightLine';
        break;
      case 'vertical':
        kOverlayName = 'verticalStraightLine';
        break;
      case 'ray':
        kOverlayName = 'rayLine';
        break;
      case 'fibonacci':
        kOverlayName = 'fibonacciLine';
        break;
      case 'rectangle':
        kOverlayName = 'rect';
        break;
      case 'long_position':
        kOverlayName = 'tv_long_position';
        break;
      case 'short_position':
        kOverlayName = 'tv_short_position';
        break;
      case 'measure':
        kOverlayName = 'tv_measure';
        break;
      case 'text':
        kOverlayName = 'simpleAnnotation';
        break;
      case 'marker':
        kOverlayName = 'tv_marker';
        break;
    }

    const drawingId = `draw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const drawingColor = options?.color || '#2962FF';
    const drawingWidth = options?.lineWidth || 2;
    const extendData: any = type === 'marker' ? { markerSymbol: options?.markerSymbol || '🎯' } : undefined;
    const styles: any = {
      line: {
        color: drawingColor,
        size: drawingWidth,
      },
    };
    if (type === 'rectangle') {
      styles.rect = {
        style: 'stroke_fill',
        color: 'rgba(41, 98, 255, 0.12)',
        borderColor: drawingColor,
        borderSize: drawingWidth,
      };
      styles.polygon = {
        style: 'stroke_fill',
        color: 'rgba(41, 98, 255, 0.12)',
        borderColor: drawingColor,
        borderSize: drawingWidth,
      };
    }

    const overlayId = this.chart.createOverlay({
      name: kOverlayName,
      id: `drawing_${drawingId}`,
      groupId: 'user_drawings',
      lock: this.drawingsLocked,
      styles,
      onDrawEnd: (event: any) => {
        this.activeCreatingOverlayId = null;
        this.handleOverlayPointUpdate(drawingId, type, event.overlay);
        this.selectedDrawingId = drawingId;
        const d = this.drawingsMap.get(drawingId);
        if (this.onDrawingSelectCallback) {
          this.onDrawingSelectCallback(d || null);
        }
        if (options?.onComplete) {
          options.onComplete();
        }
      },
      onMouseEnter: (event: any) => {
        this.isHoveringDrawing = true;
        const fType = event?.figure?.type || event?.figureType;
        if (this.onDrawingHoverCallback) {
          this.onDrawingHoverCallback(true, fType);
        }
      },
      onMouseLeave: () => {
        this.isHoveringDrawing = false;
        if (this.onDrawingHoverCallback) {
          this.onDrawingHoverCallback(false);
        }
      },
      onPressedMoveStart: (event: any) => {
        this.isMovingDrawing = true;
        const fType = event?.figure?.type || event?.figureType;
        if (this.onDrawingMoveStateCallback) {
          this.onDrawingMoveStateCallback(true, fType);
        }
      },
      onPressedMoveEnd: (event: any) => {
        this.isMovingDrawing = false;
        this.handleOverlayPointUpdate(drawingId, type, event.overlay);
        if (this.onDrawingMoveStateCallback) {
          this.onDrawingMoveStateCallback(false);
        }
      },
      onPressedMoving: (event: any) => {
        this.isMovingDrawing = true;
        this.handleOverlayPointUpdate(drawingId, type, event.overlay);
        const fType = event?.figure?.type || event?.figureType;
        if (this.onDrawingMoveStateCallback) {
          this.onDrawingMoveStateCallback(true, fType);
        }
      },
      onRemoved: () => {
        this.handleOverlayRemoved(drawingId);
      },
      onSelected: () => {
        this.selectedDrawingId = drawingId;
        const d = this.drawingsMap.get(drawingId);
        if (this.onDrawingSelectCallback) {
          this.onDrawingSelectCallback(d || null);
        }
      },
      onDeselected: () => {
        if (this.selectedDrawingId === drawingId) {
          this.selectedDrawingId = null;
          if (this.onDrawingSelectCallback) {
            this.onDrawingSelectCallback(null);
          }
        }
      },
    });

    if (typeof overlayId === 'string') {
      this.activeCreatingOverlayId = overlayId;
      this.drawingOverlayMap.set(drawingId, overlayId);
    }
  }

  public cancelDrawing() {
    if (this.activeCreatingOverlayId && this.chart) {
      this.chart.removeOverlay({ id: this.activeCreatingOverlayId });
      this.drawingOverlayMap.forEach((ovId, dId) => {
        if (ovId === this.activeCreatingOverlayId) {
          this.drawingOverlayMap.delete(dId);
          this.drawingsMap.delete(dId);
        }
      });
      this.activeCreatingOverlayId = null;
    }
  }

  public onVisibleRangeChange(cb: (range: VisibleRangeData) => void) {
    this.onVisibleRangeCallback = cb;
  }

  public onCrosshairChange(cb: (data: { candle?: ICandle | null; dataIndex?: number }) => void) {
    this.onCrosshairCallback = cb;
  }

  public onDrawingChange(cb: (drawings: ChartDrawingSpec[]) => void) {
    this.onDrawingChangeCallback = cb;
  }

  public resetChart() {
    if (!this.chart) return;
    this.chart.scrollToRealTime();
    this.chart.setBarSpace(8);
  }

  public async takeScreenshot(meta?: ChartScreenshotMeta): Promise<string> {
    if (!this.chart) return '';
    const rawUrl = this.chart.getConvertPictureUrl(true, 'png', '#131722');
    if (!rawUrl || typeof window === 'undefined') return rawUrl;

    try {
      const img = new Image();
      img.src = rawUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return rawUrl;

      // 1. Draw base chart capture (all panes, indicators, drawings, axes, order markers)
      ctx.drawImage(img, 0, 0);

      // Helper function to draw rounded rectangle with cross-browser fallback
      const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, r);
        } else {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
        }
      };

      // Calculate logical CSS dimensions so overlay sizes match exact viewport proportions
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      const domWidth = (this.container && this.container.clientWidth > 0) ? this.container.clientWidth : (img.width / dpr);
      const domHeight = (this.container && this.container.clientHeight > 0) ? this.container.clientHeight : (img.height / dpr);
      const scale = img.width / domWidth;

      ctx.save();
      ctx.scale(scale, scale);

      // -----------------------------------------------------------------------
      // A. TOP-LEFT HUD: SYMBOL + TIMEFRAME + BASE DATASET + OHLC READINGS
      // -----------------------------------------------------------------------
      const startX = 14;
      const startY = 10;
      const symbolText = meta?.symbol || 'XAUUSD';
      const tfText = (meta?.timeframe || this.currentTimeframe || '5M').toUpperCase();

      // Measure components for Row 1
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const symbolWidth = ctx.measureText(symbolText).width;

      ctx.font = 'bold 10px monospace';
      const tfWidth = ctx.measureText(tfText).width;

      let baseDatasetWidth = 0;
      let baseDatasetText = '';
      if (meta?.baseDatasetMeta) {
        baseDatasetText = `${meta.baseDatasetMeta.symbol} • ${meta.baseDatasetMeta.baseTimeframe} • ${meta.baseDatasetMeta.count.toLocaleString()} bars`;
        baseDatasetWidth = ctx.measureText(baseDatasetText).width + 16;
      }

      // OHLC text formatting
      let ohlcWidth = 0;
      let candleParts: { label: string; value: string; color: string }[] = [];
      if (meta?.candle) {
        const c = meta.candle;
        const isUp = c.close >= c.open;
        const numColor = isUp ? '#26a69a' : '#ef5350';
        const diff = c.close - c.open;
        const diffSign = diff >= 0 ? '+' : '';
        const pct = ((diff / (c.open || 1)) * 100);
        const changeStr = `${diffSign}${diff.toFixed(2)} (${diffSign}${pct.toFixed(2)}%)`;

        candleParts = [
          { label: 'O', value: c.open.toFixed(2), color: numColor },
          { label: 'H', value: c.high.toFixed(2), color: numColor },
          { label: 'L', value: c.low.toFixed(2), color: numColor },
          { label: 'C', value: c.close.toFixed(2), color: numColor },
          { label: 'Change', value: changeStr, color: numColor },
        ];
        if (c.volume != null) {
          candleParts.push({ label: 'Vol', value: c.volume.toLocaleString(), color: '#38bdf8' });
        }

        ctx.font = '11px monospace';
        candleParts.forEach((p) => {
          ohlcWidth += ctx.measureText(`${p.label} ${p.value}`).width + 10;
        });
      }

      const row1Width = 14 + symbolWidth + 8 + (tfWidth + 12) + (baseDatasetWidth > 0 ? baseDatasetWidth + 8 : 0) + (ohlcWidth > 0 ? ohlcWidth + 8 : 0) + 10;
      const row1Height = 28;

      // Draw Row 1 Background Capsule
      ctx.fillStyle = 'rgba(19, 23, 34, 0.88)';
      ctx.strokeStyle = 'rgba(42, 46, 57, 0.85)';
      ctx.lineWidth = 1;
      drawRoundRect(startX, startY, row1Width, row1Height, 6);
      ctx.fill();
      ctx.stroke();

      // Render Row 1 contents
      let curX = startX + 10;
      const textBaselineY = startY + 18;

      // Symbol
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(symbolText, curX, textBaselineY);
      curX += symbolWidth + 8;

      // Timeframe pill
      ctx.fillStyle = 'rgba(30, 34, 45, 0.9)';
      drawRoundRect(curX, startY + 5, tfWidth + 12, 18, 4);
      ctx.fill();
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#787b86';
      ctx.fillText(tfText, curX + 6, startY + 17);
      curX += tfWidth + 12 + 10;

      // Base dataset meta if present
      if (meta?.baseDatasetMeta && baseDatasetWidth > 0) {
        ctx.fillStyle = 'rgba(30, 34, 45, 0.85)';
        ctx.strokeStyle = 'rgba(42, 46, 57, 0.7)';
        drawRoundRect(curX, startY + 5, baseDatasetWidth, 18, 4);
        ctx.fill();
        ctx.stroke();
        ctx.font = '10px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(baseDatasetText, curX + 8, startY + 17);
        curX += baseDatasetWidth + 10;
      }

      // OHLC entries
      if (candleParts.length > 0) {
        ctx.font = '11px monospace';
        candleParts.forEach((part) => {
          ctx.fillStyle = '#787b86';
          ctx.fillText(part.label, curX, textBaselineY);
          const lblW = ctx.measureText(part.label + ' ').width;
          ctx.fillStyle = part.color;
          ctx.fillText(part.value, curX + lblW, textBaselineY);
          const valW = ctx.measureText(part.value).width;
          curX += lblW + valW + 10;
        });
      }

      // -----------------------------------------------------------------------
      // B. ACTIVE TECHNICAL INDICATORS LEGENDS (ROWS 2+)
      // -----------------------------------------------------------------------
      let indY = startY + row1Height + 6;
      if (meta?.indicators && meta.indicators.length > 0) {
        meta.indicators.forEach((ind) => {
          if (ind.visible === false) return;

          ctx.font = 'bold 11px monospace';
          const titleWidth = ctx.measureText(ind.title).width;
          const valWidth = ind.value ? ctx.measureText(ind.value).width : 0;
          const indPillWidth = 10 + 8 + 6 + titleWidth + (valWidth > 0 ? 8 + valWidth : 0) + 10;
          const indPillHeight = 22;

          // Capsule background
          ctx.fillStyle = 'rgba(19, 23, 34, 0.88)';
          ctx.strokeStyle = 'rgba(42, 46, 57, 0.8)';
          ctx.lineWidth = 1;
          drawRoundRect(startX, indY, indPillWidth, indPillHeight, 5);
          ctx.fill();
          ctx.stroke();

          // Indicator color dot
          ctx.fillStyle = ind.color || '#38bdf8';
          ctx.beginPath();
          ctx.arc(startX + 12, indY + indPillHeight / 2, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Title
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = '#d1d4dc';
          ctx.fillText(ind.title, startX + 22, indY + 15);

          // Live Value in Indicator Color
          if (ind.value) {
            ctx.fillStyle = ind.color || '#38bdf8';
            ctx.fillText(ind.value, startX + 22 + titleWidth + 8, indY + 15);
          }

          indY += indPillHeight + 4;
        });
      }

      // -----------------------------------------------------------------------
      // C. TOP-RIGHT BAR CLOSE COUNTDOWN
      // -----------------------------------------------------------------------
      if (meta?.countdownText) {
        const cdW = 135;
        const cdH = 24;
        const cdX = domWidth - cdW - 65; // Positioned before right-scale axis
        const cdY = 10;

        ctx.fillStyle = 'rgba(30, 34, 45, 0.9)';
        ctx.strokeStyle = 'rgba(42, 46, 57, 0.85)';
        ctx.lineWidth = 1;
        drawRoundRect(cdX, cdY, cdW, cdH, 5);
        ctx.fill();
        ctx.stroke();

        // Pulsing green dot
        ctx.fillStyle = '#26a69a';
        ctx.beginPath();
        ctx.arc(cdX + 12, cdY + cdH / 2, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.font = '10px monospace';
        ctx.fillStyle = '#787b86';
        ctx.fillText('Bar Close:', cdX + 22, cdY + 16);

        // Value
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(meta.countdownText, cdX + 85, cdY + 16);
      }

      // -----------------------------------------------------------------------
      // D. BOTTOM-RIGHT AUTHENTIC WATERMARK
      // -----------------------------------------------------------------------
      const dateText = new Date().toLocaleString();
      const watermarkText = `FlexStrategy · ${symbolText} · ${dateText}`;
      ctx.font = '10px monospace';
      const wmW = ctx.measureText(watermarkText).width + 18;
      const wmH = 20;
      const wmX = domWidth - wmW - 70;
      const wmY = domHeight - wmH - 6;

      ctx.fillStyle = 'rgba(19, 23, 34, 0.85)';
      ctx.strokeStyle = 'rgba(42, 46, 57, 0.7)';
      ctx.lineWidth = 1;
      drawRoundRect(wmX, wmY, wmW, wmH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#787b86';
      ctx.fillText(watermarkText, wmX + 9, wmY + 14);

      ctx.restore();
      return canvas.toDataURL('image/png');
    } catch {
      return rawUrl;
    }
  }

  public getDataIndexFromCoordinates(x: number, y: number): number | null {
    if (!this.chart) return null;
    try {
      const res = this.chart.convertFromPixel([{ x, y }], { paneId: 'candle_pane' });
      const point = Array.isArray(res) ? res[0] : res;
      if (point && typeof point.dataIndex === 'number' && point.dataIndex >= 0) {
        return point.dataIndex;
      }
    } catch {
      try {
        const res2 = this.chart.convertFromPixel([{ x, y }]);
        const p2 = Array.isArray(res2) ? res2[0] : res2;
        if (p2 && typeof p2.dataIndex === 'number' && p2.dataIndex >= 0) {
          return p2.dataIndex;
        }
      } catch {}
    }
    return null;
  }

  public destroy() {
    if (this.chart) {
      dispose(this.chart);
      this.chart = null;
    }
  }
}
