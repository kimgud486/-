import type { LiveTick } from "./types";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";

type TickListener = (tick: LiveTick) => void;

function parseKoreanVolume(value?: string): number {
  if (!value) return 0;

  const text = value.replace(/,/g, "").trim();

  const eok = text.match(/([\d.]+)\s*억/);
  if (eok) {
    return Math.round(Number(eok[1]) * 100_000_000);
  }

  const man = text.match(/([\d.]+)\s*만/);
  if (man) {
    return Math.round(Number(man[1]) * 10_000);
  }

  const raw = text.match(/[\d.]+/);
  return raw ? Math.round(Number(raw[0])) : 0;
}

export class RealTimeMarketFeedManager {
  private static instance: RealTimeMarketFeedManager;

  private listeners = new Map<string, Set<TickListener>>();
  private lastPrices = new Map<string, number>();
  private lastAccumulatedVolume = new Map<string, number>();

  private constructor() {
    this.initFeedBridge();
  }

  public static getInstance(): RealTimeMarketFeedManager {
    if (!this.instance) {
      this.instance = new RealTimeMarketFeedManager();
    }

    return this.instance;
  }

  private initFeedBridge() {
    realtimeMarketFeedService.subscribe((quotesMap) => {
      quotesMap.forEach((quote, symbol) => {
        const symbolListeners = this.listeners.get(symbol);

        if (!symbolListeners?.size) return;

        const accumulatedVolume = parseKoreanVolume(quote.volume);
        const previousAccumulatedVolume = this.lastAccumulatedVolume.get(symbol);

        const incrementalVolume =
          previousAccumulatedVolume === undefined
            ? 0
            : Math.max(0, accumulatedVolume - previousAccumulatedVolume);

        this.lastPrices.set(symbol, quote.price);

        if (accumulatedVolume > 0) {
          this.lastAccumulatedVolume.set(symbol, accumulatedVolume);
        }

        const tick: LiveTick = {
          symbol,
          timestamp: Date.now(),
          price: quote.price,
          // Actual incremental volume calculated from accumulated volume delta
          volume: incrementalVolume
          // bid / ask / bidVolume / askVolume are left undefined unless genuine Level-2 orderbook is present
        };

        symbolListeners.forEach((listener) => listener(tick));
      });
    });
  }

  public subscribe(symbol: string, listener: TickListener): () => void {
    if (!this.listeners.has(symbol)) {
      this.listeners.set(symbol, new Set());
    }

    this.listeners.get(symbol)!.add(listener);

    realtimeMarketFeedService.registerSymbol(symbol);

    return () => {
      const listeners = this.listeners.get(symbol);

      if (!listeners) return;

      listeners.delete(listener);

      if (listeners.size === 0) {
        this.listeners.delete(symbol);
      }
    };
  }

  public emitCustomTick(tick: LiveTick) {
    this.listeners.get(tick.symbol)?.forEach((listener) => listener(tick));
  }
}

export const realTimeMarketFeedManager = RealTimeMarketFeedManager.getInstance();

