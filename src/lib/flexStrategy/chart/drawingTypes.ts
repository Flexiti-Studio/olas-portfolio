export type DrawingToolType =
  | 'cursor'
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

export interface ChartPoint {
  time: number;
  price: number;
}

export interface ChartDrawing {
  id: string;
  type: DrawingToolType;
  points: ChartPoint[];
  color?: string;
  fillColor?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  // Position tool specifics
  entryPrice?: number;
  slPrice?: number;
  tpPrice?: number;
  side?: 'buy' | 'sell';
  name?: string;
  text?: string;
  markerSymbol?: string;
  lock?: boolean;
}

export interface PositionBoxData {
  id: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  entryTime: number;
  exitPrice?: number;
  exitTime?: number;
  sl?: number | null;
  tp?: number | null;
  pnl?: number;
  pnlPercent?: number;
  status: 'closed' | 'running';
  reason?: string;
}
