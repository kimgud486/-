import type { LiveCandle, IndicatorSnapshot } from "./types";

export class IndicatorEngine {
  /**
   * Calculates comprehensive technical indicators from a list of candles.
   */
  public static calculate(candles: LiveCandle[]): IndicatorSnapshot {
    if (!candles || candles.length === 0) {
      return {
        ema9: 0,
        ema20: 0,
        ema50: 0,
        vwap: 0,
        rsi14: 50,
        macd: 0,
        macdSignal: 0,
        macdHistogram: 0,
        atr14: 0,
        rvol: 1.0,
        trendStrength: 0,
        bollingerUpper: 0,
        bollingerMiddle: 0,
        bollingerLower: 0,
      };
    }

    const closes = candles.map(c => c.close);
    const lastClose = closes[closes.length - 1];

    // EMA calculations
    const ema9 = this.calcEMA(closes, 9);
    const ema20 = this.calcEMA(closes, 20);
    const ema50 = this.calcEMA(closes, 50);
    const ema200 = this.calcEMA(closes, Math.min(200, closes.length));

    // VWAP calculation
    let cumVol = 0;
    let cumVolPrice = 0;
    candles.forEach(c => {
      const typ = (c.high + c.low + c.close) / 3;
      const v = Math.max(1, c.volume);
      cumVol += v;
      cumVolPrice += typ * v;
    });
    const vwap = cumVol > 0 ? Math.round((cumVolPrice / cumVol) * 100) / 100 : lastClose;

    // RSI (14)
    const rsi14 = this.calcRSI(closes, 14);

    // MACD (12, 26, 9)
    const { macd, signal, hist } = this.calcMACD(closes);

    // ATR (14)
    const atr14 = this.calcATR(candles, 14);

    // RVOL (current volume vs 20-period avg volume)
    const volumes = candles.map(c => c.volume);
    const recentVols = volumes.slice(-20);
    const avgVol = recentVols.reduce((a, b) => a + b, 0) / Math.max(1, recentVols.length);
    const currentVol = candles[candles.length - 1].volume;
    const rvol = avgVol > 0 ? Math.round((currentVol / avgVol) * 100) / 100 : 1.0;

    // Bollinger Bands (20, 2)
    const slice20 = closes.slice(-20);
    const sma20 = slice20.reduce((a, b) => a + b, 0) / slice20.length;
    const variance = slice20.reduce((acc, p) => acc + Math.pow(p - sma20, 2), 0) / slice20.length;
    const stdDev = Math.sqrt(variance);
    const bollingerUpper = Math.round((sma20 + 2 * stdDev) * 100) / 100;
    const bollingerLower = Math.round((sma20 - 2 * stdDev) * 100) / 100;

    // Trend Strength (-1 to +1)
    const trendDir = ema9 > ema20 ? 1 : -1;
    const rsiScore = (rsi14 - 50) / 50; // -1 to 1
    const macdScore = Math.max(-1, Math.min(1, hist / Math.max(0.1, atr14 * 0.5)));
    const trendStrength = Math.max(-1, Math.min(1, trendDir * 0.4 + rsiScore * 0.3 + macdScore * 0.3));

    return {
      ema9,
      ema20,
      ema50,
      ema200,
      vwap,
      rsi14,
      macd,
      macdSignal: signal,
      macdHistogram: hist,
      atr14,
      rvol,
      trendStrength,
      bollingerUpper,
      bollingerMiddle: sma20,
      bollingerLower
    };
  }

  public static calcEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    if (prices.length <= period) {
      return prices.reduce((a, b) => a + b, 0) / prices.length;
    }
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return Math.round(ema * 100) / 100;
  }

  public static calcRSI(prices: number[], period = 14): number {
    if (prices.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - diff) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
  }

  public static calcMACD(prices: number[]): { macd: number; signal: number; hist: number } {
    if (prices.length < 26) {
      return { macd: 0, signal: 0, hist: 0 };
    }
    const ema12 = this.calcEMA(prices, 12);
    const ema26 = this.calcEMA(prices, 26);
    const macd = Math.round((ema12 - ema26) * 100) / 100;

    // Signal line is 9-period EMA of MACD line
    // Approximate with ratio for latest series
    const signal = Math.round(macd * 0.85 * 100) / 100;
    const hist = Math.round((macd - signal) * 100) / 100;
    return { macd, signal, hist };
  }

  public static calcATR(candles: LiveCandle[], period = 14): number {
    if (candles.length < 2) return Math.max(1, (candles[0]?.high || 100) - (candles[0]?.low || 95));
    const trs: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      const prevClose = candles[i - 1].close;
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prevClose),
        Math.abs(c.low - prevClose)
      );
      trs.push(tr);
    }
    const recent = trs.slice(-period);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    return Math.round(avg * 100) / 100;
  }
}
