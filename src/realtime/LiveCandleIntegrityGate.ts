// AISTOCK Live Candle Integrity Gate
// Enforces source provenance, structural OHLC integrity, timestamp ordering, and gap checks on VerifiedCandle arrays.

import { VerifiedCandle, assertVerifiedCandles } from "./MarketCandle";

export interface CandleIntegrityValidationResult {
  valid: boolean;
  reason?: string;
  candleCount: number;
}

export class LiveCandleIntegrityGate {
  public validateCandles(
    candles: VerifiedCandle[],
    expectedSymbol?: string,
    expectedMarket?: "KOREA" | "US" | "CRYPTO",
    expectedTimeframe?: "1m" | "3m" | "5m" | "15m" | "60m"
  ): CandleIntegrityValidationResult {
    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      return { valid: false, reason: "EMPTY_CANDLES", candleCount: 0 };
    }

    if (candles.length < 30) {
      return { valid: false, reason: "INSUFFICIENT_CANDLES_MIN_30_REQUIRED", candleCount: candles.length };
    }

    const now = Date.now();
    let prevEndTime = 0;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];

      if (c.verified !== true) {
        return { valid: false, reason: `UNVERIFIED_CANDLE_AT_INDEX_${i}`, candleCount: candles.length };
      }

      if (c.source !== "KIS_REALTIME_WS" && c.source !== "KIS_REST_HISTORY") {
        return { valid: false, reason: `NON_REAL_CANDLE_SOURCE:${c.source}`, candleCount: candles.length };
      }

      if (expectedSymbol && c.symbol !== expectedSymbol) {
        return { valid: false, reason: `SYMBOL_MISMATCH:${c.symbol}_VS_${expectedSymbol}`, candleCount: candles.length };
      }

      if (expectedMarket && c.market !== expectedMarket) {
        return { valid: false, reason: `MARKET_MISMATCH:${c.market}_VS_${expectedMarket}`, candleCount: candles.length };
      }

      if (expectedTimeframe && c.timeframe !== expectedTimeframe) {
        return { valid: false, reason: `TIMEFRAME_MISMATCH:${c.timeframe}_VS_${expectedTimeframe}`, candleCount: candles.length };
      }

      if (
        !Number.isFinite(c.open) || !Number.isFinite(c.high) ||
        !Number.isFinite(c.low) || !Number.isFinite(c.close) ||
        !Number.isFinite(c.volume) ||
        c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0 || c.volume < 0
      ) {
        return { valid: false, reason: `INVALID_OHLC_VALUES_AT_INDEX_${i}`, candleCount: candles.length };
      }

      if (c.high < c.low || c.high < Math.max(c.open, c.close) || c.low > Math.min(c.open, c.close)) {
        return { valid: false, reason: `INVALID_OHLC_STRUCTURE_AT_INDEX_${i}`, candleCount: candles.length };
      }

      if (c.endedAt > now + 60000) {
        return { valid: false, reason: `FUTURE_TIMESTAMP_AT_INDEX_${i}`, candleCount: candles.length };
      }

      if (c.endedAt <= c.startedAt) {
        return { valid: false, reason: `INVALID_CANDLE_DURATION_AT_INDEX_${i}`, candleCount: candles.length };
      }

      if (i > 0 && c.startedAt < prevEndTime) {
        return { valid: false, reason: `OUT_OF_ORDER_CANDLE_SEQUENCE_AT_INDEX_${i}`, candleCount: candles.length };
      }

      if (i > 0) {
        const prevClose = candles[i - 1].close;
        const changeRatio = Math.abs(c.open - prevClose) / prevClose;
        if (changeRatio > 1.0) {
          return { valid: false, reason: `ABNORMAL_PRICE_GAP_AT_INDEX_${i}`, candleCount: candles.length };
        }
      }

      prevEndTime = c.endedAt;
    }

    return { valid: true, candleCount: candles.length };
  }

  public assertCandles(
    candles: VerifiedCandle[],
    expectedSymbol?: string,
    expectedMarket?: "KOREA" | "US" | "CRYPTO",
    expectedTimeframe?: "1m" | "3m" | "5m" | "15m" | "60m"
  ): void {
    assertVerifiedCandles(candles);
    const result = this.validateCandles(candles, expectedSymbol, expectedMarket, expectedTimeframe);
    if (!result.valid) {
      throw new Error(`UNVERIFIED_MARKET_DATA:${result.reason}`);
    }
  }
}

export const globalLiveCandleIntegrityGate = new LiveCandleIntegrityGate();
