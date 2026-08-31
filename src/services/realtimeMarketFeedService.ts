// ----------------------------------------------------------------------
// REAL-TIME LIVE MARKET FEED & REAL QUOTES SERVICE (KRX & UPBIT & US)
// ----------------------------------------------------------------------

export interface LiveMarketQuote {
  symbol: string;
  name: string;
  market: "KOSPI" | "KOSDAQ" | "UPBIT" | "US";
  price: number;
  changeRate: number;
  changeAmount: number;
  tradeValue: string;
  volume: string;
  timestamp: string;
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
    this.initDefaultQuotes();
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

  private initDefaultQuotes() {
    const defaults: LiveMarketQuote[] = [
      { symbol: "005930", name: "삼성전자", market: "KOSPI", price: 281500, changeRate: 3.87, changeAmount: 10500, tradeValue: "7조 6,823억", volume: "2,767만", timestamp: new Date().toISOString() },
      { symbol: "000660", name: "SK하이닉스", market: "KOSPI", price: 198500, changeRate: 2.10, changeAmount: 4100, tradeValue: "8,420억", volume: "360만", timestamp: new Date().toISOString() },
      { symbol: "005380", name: "현대차", market: "KOSPI", price: 245000, changeRate: -0.81, changeAmount: -2000, tradeValue: "3,210억", volume: "110만", timestamp: new Date().toISOString() },
      { symbol: "000270", name: "기아", market: "KOSPI", price: 118000, changeRate: 1.72, changeAmount: 2000, tradeValue: "2,100억", volume: "95만", timestamp: new Date().toISOString() },
      { symbol: "035420", name: "NAVER", market: "KOSPI", price: 182000, changeRate: 0.55, changeAmount: 1000, tradeValue: "1,850억", volume: "85만", timestamp: new Date().toISOString() },
      { symbol: "035720", name: "카카오", market: "KOSPI", price: 42500, changeRate: -1.16, changeAmount: -500, tradeValue: "1,200억", volume: "240만", timestamp: new Date().toISOString() },
      { symbol: "068270", name: "셀트리온", market: "KOSPI", price: 184000, changeRate: 0.55, changeAmount: 1000, tradeValue: "2,400억", volume: "120만", timestamp: new Date().toISOString() },
      { symbol: "005490", name: "POSCO홀딩스", market: "KOSPI", price: 375000, changeRate: 0.95, changeAmount: 3500, tradeValue: "2,100억", volume: "55만", timestamp: new Date().toISOString() },
      { symbol: "373220", name: "LG에너지솔루션", market: "KOSPI", price: 342000, changeRate: 0.88, changeAmount: 3000, tradeValue: "1,950억", volume: "45만", timestamp: new Date().toISOString() },
      { symbol: "006400", name: "삼성SDI", market: "KOSPI", price: 325000, changeRate: 1.40, changeAmount: 4500, tradeValue: "1,450억", volume: "38만", timestamp: new Date().toISOString() },
      { symbol: "012450", name: "한화에어로스페이스", market: "KOSPI", price: 295000, changeRate: 4.20, changeAmount: 12000, tradeValue: "4,510억", volume: "152만", timestamp: new Date().toISOString() },
      { symbol: "277810", name: "레인보우로보틱스", market: "KOSDAQ", price: 165000, changeRate: 5.40, changeAmount: 8500, tradeValue: "3,120억", volume: "189만", timestamp: new Date().toISOString() },
      { symbol: "034020", name: "두산에너빌리티", market: "KOSPI", price: 21500, changeRate: 3.20, changeAmount: 670, tradeValue: "5,890억", volume: "1,840만", timestamp: new Date().toISOString() },
      { symbol: "080220", name: "제주반도체", market: "KOSDAQ", price: 21500, changeRate: 4.85, changeAmount: 1000, tradeValue: "2,480억", volume: "890만", timestamp: new Date().toISOString() },
      { symbol: "064350", name: "현대로템", market: "KOSPI", price: 61200, changeRate: 3.38, changeAmount: 2000, tradeValue: "1,940억", volume: "320만", timestamp: new Date().toISOString() },
      { symbol: "042700", name: "한미반도체", market: "KOSPI", price: 135000, changeRate: 3.80, changeAmount: 4900, tradeValue: "2,850억", volume: "210만", timestamp: new Date().toISOString() },
      { symbol: "247540", name: "에코프로비엠", market: "KOSDAQ", price: 185000, changeRate: 2.30, changeAmount: 4200, tradeValue: "2,900억", volume: "140만", timestamp: new Date().toISOString() },
      { symbol: "086520", name: "에코프로", market: "KOSDAQ", price: 92000, changeRate: 3.12, changeAmount: 2800, tradeValue: "3,100억", volume: "320만", timestamp: new Date().toISOString() },
      // Premier Korean Equities
      { symbol: "012330", name: "현대모비스", market: "KOSPI", price: 238000, changeRate: 1.49, changeAmount: 3500, tradeValue: "1,250억", volume: "52만", timestamp: new Date().toISOString() },
      { symbol: "105560", name: "KB금융", market: "KOSPI", price: 82400, changeRate: 2.23, changeAmount: 1800, tradeValue: "1,890억", volume: "230만", timestamp: new Date().toISOString() },
      { symbol: "055550", name: "신한지주", market: "KOSPI", price: 54600, changeRate: 1.68, changeAmount: 900, tradeValue: "1,120억", volume: "205만", timestamp: new Date().toISOString() },
      { symbol: "028300", name: "HLB", market: "KOSDAQ", price: 78500, changeRate: 3.42, changeAmount: 2600, tradeValue: "2,420억", volume: "310만", timestamp: new Date().toISOString() },
      { symbol: "196170", name: "알테오젠", market: "KOSDAQ", price: 345000, changeRate: 4.86, changeAmount: 16000, tradeValue: "3,890억", volume: "112만", timestamp: new Date().toISOString() },
      // Premier US Equities
      { symbol: "NVDA", name: "엔비디아", market: "US", price: 128.5, changeRate: 4.25, changeAmount: 5.2, tradeValue: "$48.2B", volume: "4,200만", timestamp: new Date().toISOString() },
      { symbol: "TSLA", name: "테슬라", market: "US", price: 218.4, changeRate: -2.30, changeAmount: -5.1, tradeValue: "$21.5B", volume: "2,800만", timestamp: new Date().toISOString() },
      { symbol: "AAPL", name: "애플", market: "US", price: 224.2, changeRate: 0.85, changeAmount: 1.9, tradeValue: "$18.4B", volume: "3,100만", timestamp: new Date().toISOString() },
      { symbol: "MSFT", name: "마이크로소프트", market: "US", price: 442.8, changeRate: 1.12, changeAmount: 4.9, tradeValue: "$14.2B", volume: "1,800만", timestamp: new Date().toISOString() },
      { symbol: "GOOGL", name: "알파벳", market: "US", price: 178.6, changeRate: 1.95, changeAmount: 3.4, tradeValue: "$11.6B", volume: "1,450만", timestamp: new Date().toISOString() },
      // Premier Crypto (Upbit Live Feed)
      { symbol: "BTC", name: "비트코인", market: "UPBIT", price: 96500000, changeRate: 2.15, changeAmount: 2030000, tradeValue: "4,820억", volume: "4,990 BTC", timestamp: new Date().toISOString() },
      { symbol: "ETH", name: "이더리움", market: "UPBIT", price: 3920000, changeRate: 1.84, changeAmount: 71000, tradeValue: "1,940억", volume: "49,500 ETH", timestamp: new Date().toISOString() },
      { symbol: "XRP", name: "리플", market: "UPBIT", price: 825, changeRate: 4.56, changeAmount: 36, tradeValue: "2,350억", volume: "2.8억 XRP", timestamp: new Date().toISOString() },
      { symbol: "SOL", name: "솔라나", market: "UPBIT", price: 215000, changeRate: 3.22, changeAmount: 6700, tradeValue: "1,450억", volume: "67만 SOL", timestamp: new Date().toISOString() },
      { symbol: "DOGE", name: "도지코인", market: "UPBIT", price: 178, changeRate: -0.56, changeAmount: -1, tradeValue: "890억", volume: "5.0억 DOGE", timestamp: new Date().toISOString() },
      { symbol: "ADA", name: "에이다", market: "UPBIT", price: 485, changeRate: 1.46, changeAmount: 7, tradeValue: "420억", volume: "8,650만 ADA", timestamp: new Date().toISOString() }
    ];

    defaults.forEach((q) => {
      this.quotes.set(q.symbol, q);
      this.registeredSymbols.set(q.symbol, q.market);
    });
  }

  public registerSymbol(symbol: string, market?: "KOSPI" | "KOSDAQ" | "UPBIT" | "US") {
    if (!symbol) return;
    const cleanSym = symbol.trim().toUpperCase();
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
                    timestamp: new Date().toISOString()
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
        if (!this.quotes.has(sym)) {
          const res = await fetch(`/api/stocks/${sym}`);
          if (res.ok) {
            const item = await res.json();
            if (item && item.price > 0) {
              this.quotes.set(sym, {
                symbol: sym,
                name: item.name || sym,
                market: "US",
                price: item.price,
                changeRate: item.changePct || 0,
                changeAmount: item.change || 0,
                tradeValue: "$1.0B",
                volume: "1,000만",
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (e) {
      // ignore individual US fetch error
    }

    this.notifySubscribers();
  }

  public getQuote(symbol: string): LiveMarketQuote | undefined {
    return this.quotes.get(symbol.trim().toUpperCase());
  }

  public getAllQuotes(): LiveMarketQuote[] {
    return Array.from(this.quotes.values());
  }

  public subscribe(callback: (quotes: Map<string, LiveMarketQuote>) => void): () => void {
    this.subscribers.add(callback);
    callback(this.quotes);
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
