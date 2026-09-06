// ----------------------------------------------------------------------
// REAL CANDLE STORE (V14.0 REAL SCANNER CORE)
// Centralized In-Memory Store for Verified Real OHLCV Candles
// ----------------------------------------------------------------------

import { Candle } from "./StructureBrain";
import { MarketDataIntegrityGate } from "./MarketDataIntegrityGate";

class RealCandleStoreService {
  private candleCache: Map<string, Candle[]> = new Map();
  private fetchPromises: Map<string, Promise<Candle[]>> = new Map();

  public async fetchRealCandles(
    symbol: string,
    timeframe: string = "15m",
    count: number = 60
  ): Promise<Candle[]> {
    if (!symbol) return [];

    const cacheKey = `${symbol.toUpperCase()}_${timeframe}`;

    // Return in-flight fetch promise if duplicate request
    if (this.fetchPromises.has(cacheKey)) {
      return this.fetchPromises.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch(
          `/api/market/realtime-candles?symbol=${encodeURIComponent(
            symbol
          )}&timeframe=${timeframe}&count=${count}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.candles) && data.candles.length > 0) {
            const verification = MarketDataIntegrityGate.verifyCandles(
              data.candles
            );
            if (verification.isVerified) {
              const verified = verification.verifiedCandles.map((c) => ({
                timestamp: c.timestamp,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume
              }));
              this.candleCache.set(cacheKey, verified);
              return verified;
            }
          }
        }
      } catch (err) {
        console.warn(`[RealCandleStore] Failed to fetch candles for ${symbol}:`, err);
      } finally {
        this.fetchPromises.delete(cacheKey);
      }
      return this.candleCache.get(cacheKey) || [];
    })();

    this.fetchPromises.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  public getCachedCandles(symbol: string, timeframe: string = "15m"): Candle[] {
    const cacheKey = `${symbol.toUpperCase()}_${timeframe}`;
    return this.candleCache.get(cacheKey) || [];
  }

  public setCandles(symbol: string, timeframe: string, candles: Candle[]) {
    const cacheKey = `${symbol.toUpperCase()}_${timeframe}`;
    const verification = MarketDataIntegrityGate.verifyCandles(candles);
    if (verification.isVerified) {
      this.candleCache.set(
        cacheKey,
        verification.verifiedCandles.map((c) => ({
          timestamp: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume
        }))
      );
    }
  }
}

export const realCandleStore = new RealCandleStoreService();
