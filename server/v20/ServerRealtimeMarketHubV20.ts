// ----------------------------------------------------------------------
// AISTOCK V20 SERVER REALTIME MARKET HUB
// Multi-market (Korea, US, Upbit) centralized quote & candle store with data grades
// ----------------------------------------------------------------------

import { DataGradeV20 } from "./KISOverseasParserV20";
import { Candle } from "../../src/services/StructureBrain";

export interface ServerMarketQuoteV20 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "UPBIT";
  price: number;
  changeAmount: number;
  changePct: number;
  /** Provider cumulative session/24h volume. Never summed into minute candles. */
  volume: number;
  tradeValue: number;
  askPrice?: number;
  bidPrice?: number;
  source: string;
  grade: DataGradeV20;
  updatedAt: number;
  sequence: number;
}

export interface ServerRealtimeHubStatusV20 {
  quoteCount: number;
  candleSymbolCount: number;
  executionGradeCount: number;
  staleQuoteCount: number;
  lastQuoteAt: number | null;
  sequence: number;
}

const QUOTE_FRESHNESS_MS = 15_000;

export class ServerRealtimeMarketHubV20 {
  private static instance: ServerRealtimeMarketHubV20;
  private quotes: Map<string, ServerMarketQuoteV20> = new Map();
  private candleHistory: Map<string, Candle[]> = new Map();
  private sequenceCounter = 0;

  private constructor() {}

  public static getInstance(): ServerRealtimeMarketHubV20 {
    if (!ServerRealtimeMarketHubV20.instance) {
      ServerRealtimeMarketHubV20.instance = new ServerRealtimeMarketHubV20();
    }
    return ServerRealtimeMarketHubV20.instance;
  }

  public updateQuote(
    symbol: string,
    name: string,
    market: "KOREA" | "US" | "UPBIT",
    price: number,
    changeAmount: number,
    changePct: number,
    volume: number,
    tradeValue: number,
    source: string,
    grade: DataGradeV20,
    askPrice?: number,
    bidPrice?: number,
    /** Tick/execution volume only. Provider cumulative volume must not be passed here. */
    incrementalVolume: number = 0
  ): ServerMarketQuoteV20 {
    const key = symbol.toUpperCase();
    if (!key || !Number.isFinite(price) || price <= 0) {
      throw new Error("INVALID_REALTIME_QUOTE");
    }

    this.sequenceCounter += 1;
    const quote: ServerMarketQuoteV20 = {
      symbol: key,
      name,
      market,
      price,
      changeAmount: Number.isFinite(changeAmount) ? changeAmount : 0,
      changePct: Number.isFinite(changePct) ? changePct : 0,
      volume: Number.isFinite(volume) && volume >= 0 ? volume : 0,
      tradeValue: Number.isFinite(tradeValue) && tradeValue >= 0 ? tradeValue : 0,
      askPrice: Number.isFinite(askPrice) && Number(askPrice) > 0 ? askPrice : undefined,
      bidPrice: Number.isFinite(bidPrice) && Number(bidPrice) > 0 ? bidPrice : undefined,
      source,
      grade,
      updatedAt: Date.now(),
      sequence: this.sequenceCounter
    };

    this.quotes.set(key, quote);
    this.updateCandleStore(
      key,
      price,
      Number.isFinite(incrementalVolume) && incrementalVolume > 0 ? incrementalVolume : 0
    );
    return quote;
  }

  public getQuote(symbol: string): ServerMarketQuoteV20 | null {
    const key = symbol.toUpperCase();
    const q = this.quotes.get(key) || this.quotes.get(key.replace("KRW-", ""));
    if (!q) return null;

    if (Date.now() - q.updatedAt > QUOTE_FRESHNESS_MS) {
      return { ...q, grade: "DISPLAY_ONLY" };
    }
    return { ...q };
  }

  /** Returns snapshots. Stale quotes are downgraded to DISPLAY_ONLY. */
  public getAllQuotes(): ServerMarketQuoteV20[] {
    const now = Date.now();
    return Array.from(this.quotes.values()).map(q => ({
      ...q,
      grade: now - q.updatedAt > QUOTE_FRESHNESS_MS ? "DISPLAY_ONLY" : q.grade
    }));
  }

  public getCandles(symbol: string): Candle[] {
    const key = symbol.toUpperCase();
    return (this.candleHistory.get(key) || []).map(c => ({ ...c }));
  }

  public setCandles(symbol: string, candles: Candle[]): void {
    const key = symbol.toUpperCase();
    this.candleHistory.set(key, candles.slice(-500).map(c => ({ ...c })));
  }

  public getStatus(): ServerRealtimeHubStatusV20 {
    const now = Date.now();
    const quotes = Array.from(this.quotes.values());
    const fresh = quotes.filter(q => now - q.updatedAt <= QUOTE_FRESHNESS_MS);
    return {
      quoteCount: quotes.length,
      candleSymbolCount: this.candleHistory.size,
      executionGradeCount: fresh.filter(q => q.grade === "EXECUTION_GRADE").length,
      staleQuoteCount: quotes.filter(q => now - q.updatedAt > QUOTE_FRESHNESS_MS).length,
      lastQuoteAt: quotes.length ? Math.max(...quotes.map(q => q.updatedAt)) : null,
      sequence: this.sequenceCounter
    };
  }

  /** Test/recovery helper. Never used to synthesize production data. */
  public clear(): void {
    this.quotes.clear();
    this.candleHistory.clear();
    this.sequenceCounter = 0;
  }

  private updateCandleStore(symbol: string, price: number, incrementalVolume: number): void {
    const candles = this.candleHistory.get(symbol) || [];
    const now = Date.now();
    const minuteTs = Math.floor(now / 60_000) * 60_000;

    if (candles.length === 0) {
      candles.push({
        timestamp: minuteTs,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: incrementalVolume
      });
    } else {
      const last = candles[candles.length - 1];
      const lastTs = typeof last.timestamp === "number" ? last.timestamp : Date.parse(last.timestamp) || 0;

      if (lastTs === minuteTs) {
        last.high = Math.max(last.high, price);
        last.low = Math.min(last.low, price);
        last.close = price;
        last.volume += incrementalVolume;
      } else if (minuteTs > lastTs) {
        candles.push({
          timestamp: minuteTs,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: incrementalVolume
        });
        if (candles.length > 500) candles.shift();
      }
    }

    this.candleHistory.set(symbol, candles);
  }
}

export const serverRealtimeMarketHubV20 = ServerRealtimeMarketHubV20.getInstance();
