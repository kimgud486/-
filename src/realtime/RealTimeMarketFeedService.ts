import type { LiveTick } from "./types";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";

type TickListener = (tick: LiveTick) => void;

export class RealTimeMarketFeedManager {
  private static instance: RealTimeMarketFeedManager;
  private listeners: Map<string, Set<TickListener>> = new Map();
  private lastPrices: Map<string, number> = new Map();
  private unsubscribeFeed: (() => void) | null = null;

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
    this.unsubscribeFeed = realtimeMarketFeedService.subscribe((quotesMap) => {
      quotesMap.forEach((quote, symbol) => {
        const symbolListeners = this.listeners.get(symbol);
        if (!symbolListeners || symbolListeners.size === 0) return;

        const lastP = this.lastPrices.get(symbol) ?? quote.price;
        this.lastPrices.set(symbol, quote.price);

        const now = Date.now();
        const priceDiff = quote.price - lastP;
        const volNum = parseInt(quote.volume?.replace(/[^0-9]/g, "") || "100", 10);
        const incrementalVol = Math.max(1, Math.round(volNum * 0.02));

        const tick: LiveTick = {
          symbol,
          timestamp: now,
          price: quote.price,
          volume: incrementalVol,
          bid: Math.round(quote.price * 0.999),
          ask: Math.round(quote.price * 1.001),
          bidVolume: priceDiff >= 0 ? Math.round(incrementalVol * 0.6) : Math.round(incrementalVol * 0.4),
          askVolume: priceDiff >= 0 ? Math.round(incrementalVol * 0.4) : Math.round(incrementalVol * 0.6)
        };

        symbolListeners.forEach(listener => listener(tick));
      });
    });
  }

  public subscribe(symbol: string, listener: TickListener): () => void {
    if (!this.listeners.has(symbol)) {
      this.listeners.set(symbol, new Set());
    }
    this.listeners.get(symbol)!.add(listener);

    // Register symbol on base feed if needed
    realtimeMarketFeedService.registerSymbol(symbol);

    return () => {
      const set = this.listeners.get(symbol);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(symbol);
        }
      }
    };
  }

  public emitCustomTick(tick: LiveTick) {
    const set = this.listeners.get(tick.symbol);
    if (set) {
      set.forEach(listener => listener(tick));
    }
  }
}

export const realTimeMarketFeedManager = RealTimeMarketFeedManager.getInstance();
