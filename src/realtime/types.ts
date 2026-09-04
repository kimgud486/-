export interface LiveTick {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  bid?: number;
  ask?: number;
  bidVolume?: number;
  askVolume?: number;
}

export interface LiveCandle {
  time: number; // Unix timestamp in seconds (for Lightweight Charts) or ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bidVolume?: number;
  askVolume?: number;
  isClosed?: boolean;
}

export interface IndicatorSnapshot {
  ema9: number;
  ema20: number;
  ema50: number;
  ema200?: number;
  vwap: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  atr14: number;
  rvol: number;
  trendStrength: number;
  bollingerUpper?: number;
  bollingerMiddle?: number;
  bollingerLower?: number;
  stochK?: number;
  stochD?: number;
}

export type TradingState =
  | "BUY"
  | "BUY_WATCH"
  | "HOLD"
  | "PROFIT_HOLD"
  | "SELL_WATCH"
  | "SELL"
  | "NO_TRADE";

export interface DecisionInput {
  price: number;
  ema9: number;
  ema20: number;
  vwap: number;
  rsi: number;
  macdHistogram: number;
  hhhlValid: boolean;
  breakoutValid: boolean;
  volumeExpansion: boolean;
  modelProbability: number;
  currentState: TradingState;
  trailingExitPrice?: number;
}

export interface ForecastPoint {
  time: number; // seconds
  predicted: number;
  upper: number;
  lower: number;
  probabilityUp: number;
  probabilityDown: number;
}

export interface TradingMarker {
  time: number; // seconds
  position: "aboveBar" | "belowBar" | "inBar";
  color: string;
  shape: "arrowUp" | "arrowDown" | "circle" | "square";
  text: string;
  size?: number;
}

export interface MarketStructureSnapshot {
  trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  hhhlValid: boolean;
  lastHigherHigh?: number;
  lastHigherLow?: number;
  lastLowerHigh?: number;
  lastLowerLow?: number;
  breakoutValid: boolean;
  pullbackValid: boolean;
  vwapReclaim: boolean;
  volumeExpansion: boolean;
  chochDetected: boolean;
  bosDetected: boolean;
}
