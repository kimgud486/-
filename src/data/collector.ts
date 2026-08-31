// J.A.R.V.I.S. V4.0 Stage 1 Data Pipeline: Market Data Collector

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bidVolume: number;
  askVolume: number;
}

export interface MarketSymbolInfo {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "CRYPTO";
  basePrice: number;
}

export class MarketDataCollector {
  /**
   * Generates realistic high-frequency OHLCV candle data with order flow bid/ask split
   */
  public static fetchOHLCV(
    symbol: string,
    market: "KOREA" | "US" | "CRYPTO" = "KOREA",
    timeframe: "1m" | "5m" | "15m" | "60m" | "1D" = "15m",
    count: number = 60
  ): Candle[] {
    let basePrice = 78000;
    const sym = symbol || "";
    if (sym.includes("NVDA") || sym.includes("AAPL") || market === "US") {
      basePrice = 130;
    } else if (sym.includes("BTC") || market === "CRYPTO") {
      basePrice = 94000000;
    } else if (symbol === "000660") {
      basePrice = 185000;
    }

    const candles: Candle[] = [];
    let currentPrice = basePrice * 0.95;
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 15 * 60 * 1000);
      const volatility = currentPrice * 0.008;
      
      const changePct = (Math.random() - 0.46) * 0.015; // slightly bullish bias
      const open = currentPrice;
      const close = Math.round((open * (1 + changePct)) * 100) / 100;
      const high = Math.round((Math.max(open, close) + Math.random() * volatility) * 100) / 100;
      const low = Math.round((Math.min(open, close) - Math.random() * volatility) * 100) / 100;
      const volume = Math.floor(1000 + Math.random() * 9000);

      const buyRatio = close >= open ? 0.55 + Math.random() * 0.25 : 0.25 + Math.random() * 0.25;
      const bidVolume = Math.round(volume * buyRatio);
      const askVolume = volume - bidVolume;

      candles.push({
        timestamp: time.toISOString().substring(11, 16),
        open,
        high,
        low,
        close,
        volume,
        bidVolume,
        askVolume
      });

      currentPrice = close;
    }

    return candles;
  }
}
