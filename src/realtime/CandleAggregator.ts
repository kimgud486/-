// AISTOCK v13.8 REAL-TIME CANDLE AGGREGATOR
// Aggregates real-time trade ticks into OHLCV candles.
// STRICT DIRECTIVE: Uses REAL ticks ONLY. No synthetic bars, no fake gap fills.

import type { LiveTick } from "./types";

export type Timeframe = "1m" | "3m" | "5m" | "15m" | "60m" | "1D" | "D" | string;

export interface CandleTickInput {
  symbol: string;
  market: "KOREA" | "US" | "CRYPTO" | string;
  price: number;
  tradeVolume: number;
  cumulativeVolume?: number;
  providerTimestamp: number;
  receivedAt: number;
  sequence?: string;
}

export interface AggregatedCandle {
  timeframe: Timeframe;
  symbol: string;
  market: "KOREA" | "US" | "CRYPTO" | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
  startedAt: number;
  endedAt: number;
  isFinal: boolean;
  isClosed: boolean;
  source: "KIS_WS" | "KIS_REALTIME_WS" | "KIS_REST_HISTORY" | string;
  quality: "REALTIME_TICK_AGGREGATED";
  tickCount: number;
  lastSequence?: string;
}

export class CandleAggregator {
  private timeframe: Timeframe;
  private timeframeMs: number;
  private currentCandle: AggregatedCandle | null = null;
  private currentSlotMs = 0;
  private prevCumulativeVolume: number | null = null;

  constructor(timeframe: Timeframe = "1m") {
    this.timeframe = timeframe;
    this.timeframeMs = CandleAggregator.getTimeframeMs(timeframe);
  }

  public static getTimeframeMs(timeframe: Timeframe | number): number {
    if (typeof timeframe === "number") {
      return Number.isFinite(timeframe) && timeframe > 0 ? timeframe : 60_000;
    }

    switch (timeframe) {
      case "1m":
        return 60_000;
      case "3m":
        return 3 * 60_000;
      case "5m":
        return 5 * 60_000;
      case "15m":
        return 15 * 60_000;
      case "60m":
      case "1H":
        return 60 * 60_000;
      case "1D":
      case "D":
        return 24 * 60 * 60_000;
      default:
        return 60_000;
    }
  }

  private static getTimeframeLabel(timeframe: Timeframe | number, fallback: Timeframe): Timeframe {
    if (typeof timeframe === "string") return timeframe;
    if (timeframe === 60_000) return "1m";
    if (timeframe === 3 * 60_000) return "3m";
    if (timeframe === 5 * 60_000) return "5m";
    if (timeframe === 15 * 60_000) return "15m";
    if (timeframe === 60 * 60_000) return "60m";
    if (timeframe === 24 * 60 * 60_000) return "1D";
    return fallback;
  }

  public reset(timeframe?: Timeframe | number): void {
    if (timeframe !== undefined) {
      this.timeframeMs = CandleAggregator.getTimeframeMs(timeframe);
      this.timeframe = CandleAggregator.getTimeframeLabel(timeframe, this.timeframe);
    }
    this.currentCandle = null;
    this.currentSlotMs = 0;
    this.prevCumulativeVolume = null;
  }

  public getCurrentCandle(): AggregatedCandle | null {
    return this.currentCandle;
  }

  /**
   * Compatibility adapter for the browser-side LiveTick feed used by the chart.
   * If a new slot begins, `candle` is the just-completed candle so closed-bar
   * signal logic receives the confirmed bar. Otherwise it is the active candle.
   */
  public update(
    tick: LiveTick,
    market: "KOREA" | "US" | "CRYPTO" | string = "KOREA"
  ): { candle: AggregatedCandle; closed: boolean } {
    const providerTimestamp =
      tick.exchangeTimestamp ?? tick.timestamp ?? tick.receivedTimestamp ?? Date.now();
    const receivedAt = tick.receivedTimestamp ?? Date.now();

    const { updatedCandle, completedCandle } = this.processTick({
      symbol: tick.symbol,
      market,
      price: tick.price,
      tradeVolume: Math.max(0, Number(tick.volume || 0)),
      providerTimestamp,
      receivedAt,
      sequence: tick.sequence !== undefined ? String(tick.sequence) : undefined
    });

    return {
      candle: completedCandle ?? updatedCandle,
      closed: completedCandle !== null
    };
  }

  public processTick(tick: CandleTickInput): {
    updatedCandle: AggregatedCandle;
    completedCandle: AggregatedCandle | null;
  } {
    const tickTime = tick.providerTimestamp || tick.receivedAt;
    const slotStartMs = Math.floor(tickTime / this.timeframeMs) * this.timeframeMs;
    const slotStartSec = Math.floor(slotStartMs / 1000);

    let volumeToAdd = tick.tradeVolume;
    if (tick.cumulativeVolume != null && tick.cumulativeVolume > 0) {
      if (
        this.prevCumulativeVolume != null &&
        tick.cumulativeVolume >= this.prevCumulativeVolume
      ) {
        volumeToAdd = tick.cumulativeVolume - this.prevCumulativeVolume;
      }
      this.prevCumulativeVolume = tick.cumulativeVolume;
    }

    if (!this.currentCandle) {
      this.currentSlotMs = slotStartMs;
      this.currentCandle = {
        timeframe: this.timeframe,
        symbol: tick.symbol,
        market: tick.market,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: Math.max(0, volumeToAdd),
        time: slotStartSec,
        startedAt: slotStartMs,
        endedAt: slotStartMs + this.timeframeMs,
        isFinal: false,
        isClosed: false,
        source: "KIS_WS",
        quality: "REALTIME_TICK_AGGREGATED",
        tickCount: 1,
        lastSequence: tick.sequence
      };

      return {
        updatedCandle: this.currentCandle,
        completedCandle: null
      };
    }

    if (slotStartMs > this.currentSlotMs) {
      const completedCandle: AggregatedCandle = {
        ...this.currentCandle,
        isFinal: true,
        isClosed: true
      };

      this.currentSlotMs = slotStartMs;
      this.currentCandle = {
        timeframe: this.timeframe,
        symbol: tick.symbol,
        market: tick.market,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: Math.max(0, volumeToAdd),
        time: slotStartSec,
        startedAt: slotStartMs,
        endedAt: slotStartMs + this.timeframeMs,
        isFinal: false,
        isClosed: false,
        source: "KIS_WS",
        quality: "REALTIME_TICK_AGGREGATED",
        tickCount: 1,
        lastSequence: tick.sequence
      };

      return {
        updatedCandle: this.currentCandle,
        completedCandle
      };
    }

    this.currentCandle.high = Math.max(this.currentCandle.high, tick.price);
    this.currentCandle.low = Math.min(this.currentCandle.low, tick.price);
    this.currentCandle.close = tick.price;
    this.currentCandle.volume += Math.max(0, volumeToAdd);
    this.currentCandle.tickCount += 1;
    this.currentCandle.lastSequence = tick.sequence;

    return {
      updatedCandle: this.currentCandle,
      completedCandle: null
    };
  }
}
