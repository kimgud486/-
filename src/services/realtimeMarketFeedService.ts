// ----------------------------------------------------------------------
// REAL-TIME LIVE MARKET FEED & REAL QUOTES SERVICE (KRX & UPBIT & US)
// ----------------------------------------------------------------------

import { safeSymbolStr } from "../lib/stockDictionary";

export interface LiveMarketQuote {
  symbol: string;
  name: string;
  market: "KOSPI" | "KOSDAQ" | "UPBIT" | "US";
  price: number;
  changeRate: number;
  changeAmount: number;
  tradeValue: string;
  volume: string;
  timestamp: string | number;
  source?: string;
  providerTimestamp?: string | null;
  receivedAt?: string;
  ageMs?: number;
  isStale?: boolean;
  status?: "LIVE" | "STALE" | "UNAVAILABLE";
}

class RealtimeMarketFeedService {
  private quotes: Map<string, LiveMarketQuote> = new Map();
  private registeredSymbols: Map<string, "KOSPI" | "KOSDAQ" | "UPBIT" | "US"> = new Map();
  private subscribers: Set<(quotes: Map<string, LiveMarketQuote>) => void> = new Set();
  private isPolling = false;
  private pollTimer: any = null;

  private isFeedEnabled = true;

  constructor() {
    try {
      const savedFeedState = localStorage.getItem("aistock_realtime_feed_active");
      if (savedFeedState !== null) {
        this.isFeedEnabled = savedFeedState === "true";
      }
    } catch {
      this.isFeedEnabled = true;
    }
  }

  public isFeedActive(): boolean {
    return this.isFeedEnabled;
  }

  public toggleFeed(targetState?: boolean): boolean {
    const newState = targetState !== undefined ? targetState : !this.isFeedEnabled;
    this.isFeedEnabled = newState;
    try {
      localStorage.setItem("aistock_realtime_feed_active", String(newState));
    } catch (e) {
      console.warn("Feed state save error:", e);
    }

    if (newState) {
      this.start();
    } else {
      this.stop();
    }

    // Dispatch global event for all widgets and UI
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("realtime_feed_status_change", {
        detail: { isFeedActive: newState }
      }));
    }

    return this.isFeedEnabled;
  }



  public registerSymbol(symbol: any, market?: "KOSPI" | "KOSDAQ" | "UPBIT" | "US") {
    const cleanSym = safeSymbolStr(symbol).toUpperCase();
    if (!cleanSym) return;
    if (!this.registeredSymbols.has(cleanSym)) {
      const determinedMarket: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" =
        market ||
        (cleanSym === "BTC" || cleanSym === "ETH" || cleanSym === "SOL" || cleanSym === "XRP" || cleanSym === "DOGE" ? "UPBIT" :
         /^[A-Z]{1,5}$/.test(cleanSym) ? "US" : "KOSPI");
      this.registeredSymbols.set(cleanSym, determinedMarket);
      // Immediately trigger a poll update
      this.fetchRealQuotes();
    }
  }

  public registerSymbols(symbols: Array<{ symbol: string; market?: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" }>) {
    let count = 0;
    symbols.forEach((item) => {
      if (item.symbol && !this.registeredSymbols.has(item.symbol.toUpperCase())) {
        this.registerSymbol(item.symbol, item.market);
        count++;
      }
    });
    if (count > 0 && this.isPolling) {
      this.fetchRealQuotes();
    }
  }

  public start() {
    if (!this.isFeedEnabled) return;
    if (this.isPolling) return;
    this.isPolling = true;
    this.fetchRealQuotes();
    this.pollTimer = setInterval(() => {
      if (!this.isFeedEnabled) {
        this.stop();
        return;
      }
      this.fetchRealQuotes();
    }, 3500);
  }

  public stop() {
    this.isPolling = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async fetchRealQuotes() {
    // 1. Fetch live quotes for Registered Crypto only if explicitly subscribed
    try {
      const upbitSymbols = Array.from(this.registeredSymbols.entries())
        .filter(([_, m]) => m === "UPBIT")
        .map(([sym]) => `KRW-${sym.replace("KRW-", "")}`);

      if (upbitSymbols.length > 0) {
        const uniqueMarkets = Array.from(new Set(upbitSymbols)).join(",");
        const res = await fetch(`/api/upbit/public/ticker?markets=${encodeURIComponent(uniqueMarkets)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach((item: any) => {
              const sym = item.market.replace("KRW-", "");
              const prev = this.quotes.get(sym);
              const updated: LiveMarketQuote = {
                symbol: sym,
                name: prev?.name || sym,
                market: "UPBIT",
                price: item.trade_price,
                changeRate: +(item.signed_change_rate * 100).toFixed(2),
                changeAmount: item.signed_change_price,
                tradeValue: `${Math.round((item.acc_trade_price_24h || 0) / 100000000).toLocaleString()}억`,
                volume: `${item.acc_trade_volume_24h ? Math.round(item.acc_trade_volume_24h).toLocaleString() : "0"} ${sym}`,
                timestamp: new Date().toISOString()
              };
              this.quotes.set(sym, updated);
              this.quotes.set(`KRW-${sym}`, updated);
            });

            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("upbit_ticker_update", { detail: data }));
            }
          }
        }
      }
    } catch (e) {
      // Silently handle transient network glitches
    }

    // 2. Fetch live/closing quotes for KRX (KOSPI & KOSDAQ) via Naver Finance Batch Polling API
    try {
      const krxSymbols = Array.from(this.registeredSymbols.entries())
        .filter(([sym, m]) => /^\d{6}$/.test(sym) && (m === "KOSPI" || m === "KOSDAQ"))
        .map(([sym]) => sym);

      // Default high-volume watchlist codes
      const defaultKrxCodes = ["005930", "000660", "005380", "000270", "035420", "035720", "068270", "005490", "373220", "006400", "012450", "277810", "034020", "080220", "064350", "042700", "247540", "086520"];
      const allKrxCodes = Array.from(new Set([...krxSymbols, ...defaultKrxCodes]));

      // Query Naver Polling Batch endpoint via Backend Proxy in chunks of 30
      const chunkSize = 30;
      for (let i = 0; i < allKrxCodes.length; i += chunkSize) {
        const chunk = allKrxCodes.slice(i, i + chunkSize);
        const codeParam = chunk.join(",");
        const pollRes = await fetch(`/api/market/naver-batch?codes=${encodeURIComponent(codeParam)}`);

        if (pollRes.ok) {
          const pollData = await pollRes.json() as any;
          const items = pollData?.datas;
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const code = item.itemCode;
              if (code && (item.closePrice || item.closePriceRaw)) {
                const rawP = String(item.closePriceRaw || item.closePrice || "0").replace(/,/g, '');
                const priceNum = parseFloat(rawP);
                if (!isNaN(priceNum) && priceNum > 0) {
                  const rawChange = String(item.compareToPreviousClosePriceRaw || item.compareToPreviousClosePrice || "0").replace(/,/g, '');
                  const changeNum = parseFloat(rawChange) || 0;
                  const rawRatio = String(item.fluctuationsRatioRaw || item.fluctuationsRatio || "0").replace(/,/g, '');
                  const ratioNum = parseFloat(rawRatio) || 0;
                  const isDown = item.compareToPreviousPrice?.code === "5" || item.compareToPreviousPrice?.name === "FALLING";
                  const prev = this.quotes.get(code);

                  const mappedMarket: "KOSPI" | "KOSDAQ" = item.stockExchangeType?.nameKor === "코스닥" ? "KOSDAQ" : "KOSPI";

                  const updated: LiveMarketQuote = {
                    symbol: code,
                    name: item.stockName || prev?.name || code,
                    market: mappedMarket,
                    price: priceNum,
                    changeRate: isDown ? -Math.abs(ratioNum) : Math.abs(ratioNum),
                    changeAmount: isDown ? -Math.abs(changeNum) : Math.abs(changeNum),
                    tradeValue: item.marketValueFull ? `${item.marketValueFull}` : (prev?.tradeValue || "실시간 연동"),
                    volume: item.accumulatedTradingVolume ? `${item.accumulatedTradingVolume}주` : (prev?.volume || "실시간 연동"),
                    timestamp: new Date().toISOString(),
                    source: "NAVER_POLLING"
                  };
                  this.quotes.set(code, updated);
                }
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn("[RealtimeFeed] Naver batch polling fetch error:", e);
    }

    // 3. Query Backend `/api/stocks` for US Stocks
    try {
      const res = await fetch("/api/stocks");
      if (res.ok) {
        const stocks = await res.json();
        if (Array.isArray(stocks)) {
          stocks.forEach((s: any) => {
            if (s.symbol && typeof s.price === "number" && s.price > 0) {
              const prev = this.quotes.get(s.symbol);
              const mappedMarket: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" =
                s.market === "US" ? "US" : (s.market === "UPBIT" || s.market === "BTC") ? "UPBIT" : (s.market === "KOSDAQ" ? "KOSDAQ" : "KOSPI");

              const updated: LiveMarketQuote = {
                symbol: s.symbol,
                name: s.name || prev?.name || s.symbol,
                market: mappedMarket,
                price: s.price,
                changeRate: typeof s.changePct === "number" ? s.changePct : (s.changeRate || 0),
                changeAmount: typeof s.change === "number" ? s.change : (s.changeAmount || 0),
                tradeValue: s.marketCap || prev?.tradeValue || "실시간",
                volume: prev?.volume || "실시간",
                timestamp: new Date().toISOString()
              };
              this.quotes.set(s.symbol, updated);
            }
          });

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("stock_ticker_update", { detail: stocks }));
          }
        }
      }
    } catch (e) {
      console.warn("[RealtimeFeed] Real API stocks fetch error:", e);
    }

    // 4. Fetch individual US symbols if registered and missing quote
    try {
      const usRegistered = Array.from(this.registeredSymbols.entries())
        .filter(([sym, m]) => m === "US" || (/^[A-Z]{1,5}$/.test(sym) && !["BTC", "ETH", "XRP", "SOL", "DOGE"].includes(sym)))
        .map(([sym]) => sym);

      for (const sym of usRegistered) {
        const res = await fetch(`/api/stocks/${sym}`);
        if (res.ok) {
          const item = await res.json();
          if (item && item.price > 0) {
            const prev = this.quotes.get(sym);
            this.quotes.set(sym, {
              symbol: sym,
              name: item.name || prev?.name || sym,
              market: "US",
              price: item.price,
              changeRate: item.changePct || 0,
              changeAmount: item.change || 0,
              tradeValue: item.marketCap || prev?.tradeValue || "--",
              volume: prev?.volume || "--",
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (e) {
      // ignore individual US fetch error
    }

    this.notifySubscribers();
  }

  public getQuote(symbol: any): LiveMarketQuote | undefined {
    const cleanSym = safeSymbolStr(symbol).toUpperCase();
    if (!cleanSym) return undefined;
    return this.quotes.get(cleanSym);
  }

  public getAllQuotes(): LiveMarketQuote[] {
    return Array.from(this.quotes.values());
  }

  public subscribe(callback: (quotes: Map<string, LiveMarketQuote>) => void): () => void {
    this.subscribers.add(callback);
    setTimeout(() => {
      if (this.subscribers.has(callback)) {
        try {
          callback(this.quotes);
        } catch (e) {
          console.error("Error in realtimeMarketFeedService initial callback:", e);
        }
      }
    }, 0);
    this.start();
    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0) {
        this.stop();
      }
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.quotes);
      } catch (err) {
        console.error("Error in realtimeMarketFeedService subscriber:", err);
      }
    });
  }
}

export const realtimeMarketFeedService = new RealtimeMarketFeedService();
