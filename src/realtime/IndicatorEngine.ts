import type { LiveCandle, IndicatorSnapshot } from "./types";

export class IndicatorEngine {
  /**
   * Calculates standard EMA series for an array of numbers.
   * The returned array is aligned 1:1 with the source values.
   */
  public static calcEMASeries(values: number[], period: number): number[] {
    if (!Number.isInteger(period) || period <= 0) {
      return new Array<number>(values.length).fill(Number.NaN);
    }
    if (values.length < period) {
      return new Array<number>(values.length).fill(Number.NaN);
    }

    const result = new Array<number>(values.length).fill(Number.NaN);
    const k = 2 / (period + 1);
    const initialSMA = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

    result[period - 1] = initialSMA;
    let ema = initialSMA;

    for (let i = period; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
      result[i] = ema;
    }

    return result;
  }

  /**
   * Session-aware VWAP series.
   *
   * Important chart truth rule:
   * - Historical VWAP and live VWAP must use the SAME calculation.
   * - VWAP resets when the session key changes.
   * - No close-price fallback is injected when a session has no valid volume yet.
   */
  public static calculateSessionVWAPSeries(
    candles: LiveCandle[],
    getSessionKey?: (c: LiveCandle) => string
  ): number[] {
    if (!candles || candles.length === 0) return [];

    const defaultKeyFn = (c: LiveCandle) => {
      if (c.sessionKey) return c.sessionKey;
      const tsMs = c.time > 1e11 ? c.time : c.time * 1000;
      const date = new Date(tsMs);
      return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
    };

    const keyFn = getSessionKey || defaultKeyFn;
    const result: number[] = [];

    let currentSession = "";
    let cumulativeVolume = 0;
    let cumulativePV = 0;

    for (const candle of candles) {
      const key = keyFn(candle);
      if (key !== currentSession) {
        currentSession = key;
        cumulativeVolume = 0;
        cumulativePV = 0;
      }

      if (
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close) &&
        Number.isFinite(candle.volume) &&
        candle.volume > 0
      ) {
        const typical = (candle.high + candle.low + candle.close) / 3;
        cumulativeVolume += candle.volume;
        cumulativePV += typical * candle.volume;
      }

      result.push(
        cumulativeVolume > 0
          ? Math.round((cumulativePV / cumulativeVolume) * 100) / 100
          : Number.NaN
      );
    }

    return result;
  }

  /**
   * Relative-volume series using the PREVIOUS `period` bars as the baseline.
   * The current bar is excluded from its own baseline so a volume spike does not
   * dilute itself.
   */
  public static calcRVOLSeries(candles: LiveCandle[], period = 20): number[] {
    if (!candles || candles.length === 0) return [];
    const result = new Array<number>(candles.length).fill(Number.NaN);
    if (!Number.isInteger(period) || period <= 0) return result;

    for (let i = period; i < candles.length; i++) {
      const currentVol = Number(candles[i]?.volume ?? 0);
      const baseline = candles.slice(i - period, i).map(c => Number(c?.volume ?? 0));

      if (
        !Number.isFinite(currentVol) ||
        currentVol < 0 ||
        baseline.some(v => !Number.isFinite(v) || v < 0)
      ) {
        continue;
      }

      const avgVol = baseline.reduce((sum, v) => sum + v, 0) / period;
      if (avgVol <= 0) continue;
      result[i] = Number((currentVol / avgVol).toFixed(2));
    }

    return result;
  }

  /**
   * Wilder RSI series aligned to the source prices.
   * Values before the first complete lookback window remain NaN.
   */
  public static calcRSISeries(prices: number[], period = 14): number[] {
    const result = new Array<number>(prices.length).fill(Number.NaN);
    if (!Number.isInteger(period) || period <= 0 || prices.length < period + 1) {
      return result;
    }

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    const toRsi = (gain: number, loss: number) => {
      if (loss === 0) return 100;
      if (gain === 0) return 0;
      const rs = gain / loss;
      return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
    };

    result[period] = toRsi(avgGain, avgLoss);

    for (let i = period + 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];

      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - diff) / period;
      }

      result[i] = toRsi(avgGain, avgLoss);
    }

    return result;
  }

  /**
   * MACD (12/26/9 by default) series aligned to the source prices.
   * `hist` is MACD - signal.
   */
  public static calcMACDSeries(
    prices: number[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9
  ): { macd: number[]; signal: number[]; hist: number[] } {
    const macd = new Array<number>(prices.length).fill(Number.NaN);
    const signal = new Array<number>(prices.length).fill(Number.NaN);
    const hist = new Array<number>(prices.length).fill(Number.NaN);

    if (
      !Number.isInteger(fastPeriod) ||
      !Number.isInteger(slowPeriod) ||
      !Number.isInteger(signalPeriod) ||
      fastPeriod <= 0 ||
      slowPeriod <= fastPeriod ||
      signalPeriod <= 0 ||
      prices.length < slowPeriod
    ) {
      return { macd, signal, hist };
    }

    const fast = this.calcEMASeries(prices, fastPeriod);
    const slow = this.calcEMASeries(prices, slowPeriod);
    const compactMacd: number[] = [];
    const compactIndexes: number[] = [];

    for (let i = slowPeriod - 1; i < prices.length; i++) {
      if (!Number.isFinite(fast[i]) || !Number.isFinite(slow[i])) continue;
      const value = fast[i] - slow[i];
      macd[i] = Number(value.toFixed(4));
      compactMacd.push(value);
      compactIndexes.push(i);
    }

    const compactSignal = this.calcEMASeries(compactMacd, signalPeriod);

    for (let i = 0; i < compactSignal.length; i++) {
      const sourceIndex = compactIndexes[i];
      const signalValue = compactSignal[i];
      if (!Number.isFinite(signalValue) || sourceIndex === undefined) continue;

      signal[sourceIndex] = Number(signalValue.toFixed(4));
      const histValue = macd[sourceIndex] - signal[sourceIndex];
      hist[sourceIndex] = Number(histValue.toFixed(4));
    }

    return { macd, signal, hist };
  }

  /**
   * Wilder ATR series aligned to the candle array.
   * The first valid value appears at candle index `period`.
   */
  public static calcATRSeries(candles: LiveCandle[], period = 14): number[] {
    const result = new Array<number>(candles.length).fill(Number.NaN);
    if (!Number.isInteger(period) || period <= 0 || candles.length < period + 1) {
      return result;
    }

    const trueRanges = new Array<number>(candles.length).fill(Number.NaN);

    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      const prevClose = candles[i - 1].close;
      trueRanges[i] = Math.max(
        c.high - c.low,
        Math.abs(c.high - prevClose),
        Math.abs(c.low - prevClose)
      );
    }

    let atr = trueRanges
      .slice(1, period + 1)
      .reduce((sum, value) => sum + value, 0) / period;

    result[period] = Math.round(atr * 100) / 100;

    for (let i = period + 1; i < candles.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
      result[i] = Math.round(atr * 100) / 100;
    }

    return result;
  }

  /**
   * Calculates comprehensive technical indicators from a list of candles.
   */
  public static calculate(
    candles: LiveCandle[],
    getSessionKey?: (c: LiveCandle) => string
  ): IndicatorSnapshot {
    if (!candles || candles.length === 0) {
      return {
        ema9: Number.NaN,
        ema20: Number.NaN,
        ema50: Number.NaN,
        ema200: Number.NaN,
        vwap: Number.NaN,
        rsi14: Number.NaN,
        macd: Number.NaN,
        macdSignal: Number.NaN,
        macdHistogram: Number.NaN,
        atr14: Number.NaN,
        rvol: 1.0,
        trendStrength: 0,
        bollingerUpper: Number.NaN,
        bollingerMiddle: Number.NaN,
        bollingerLower: Number.NaN,
        indicatorsReady: false,
        warmupReason: "NO_CANDLES_PROVIDED"
      };
    }

    const closes = candles.map((c) => c.close);

    // EMA calculations
    const ema9 = this.calcEMA(closes, 9);
    const ema20 = this.calcEMA(closes, 20);
    const ema50 = this.calcEMA(closes, 50);

    // EMA 200 with strict warm-up validation (must have >= 200 bars)
    const ema200 = closes.length >= 200 ? this.calcEMA(closes, 200) : Number.NaN;

    // Session VWAP. This is the exact same series that the chart can render.
    const vwapSeries = this.calculateSessionVWAPSeries(candles, getSessionKey);
    const vwap = vwapSeries[vwapSeries.length - 1] ?? Number.NaN;

    // RSI (14 Wilder)
    const rsi14 = this.calcRSI(closes, 14);

    // Standard MACD (12, 26, 9)
    const { macd, signal, hist } = this.calcMACD(closes);

    // ATR (14 Wilder)
    const atr14 = this.calcATR(candles, 14);

    // RVOL: previous 20 completed bars form the baseline; current bar is excluded.
    const rvolSeries = this.calcRVOLSeries(candles, 20);
    const lastRvol = rvolSeries[rvolSeries.length - 1];
    const rvol = Number.isFinite(lastRvol) ? lastRvol : 1.0;

    // Existing time-of-day normalization is retained only as a secondary context value.
    const completedCandles = candles.slice(0, candles.length - 1);
    const recent20 = completedCandles.slice(-20);
    const avgVol =
      recent20.length > 0
        ? recent20.reduce((a, b) => a + (b.volume || 0), 0) / recent20.length
        : 0;
    const currentVol = candles[candles.length - 1].volume || 0;

    const lastTime = candles[candles.length - 1].time || (candles[candles.length - 1] as any).timestamp;
    let todWeight = 1.0;
    if (lastTime) {
      const dt = new Date(typeof lastTime === "number" && lastTime < 1e11 ? lastTime * 1000 : lastTime);
      const minutesFromOpen = (dt.getUTCHours() + 9) * 60 + dt.getUTCMinutes() - (9 * 60); // KST 09:00
      if (minutesFromOpen >= 0 && minutesFromOpen <= 390) {
        if (minutesFromOpen < 30) todWeight = 1.8;
        else if (minutesFromOpen < 60) todWeight = 1.3;
        else if (minutesFromOpen < 240) todWeight = 0.7;
        else if (minutesFromOpen < 330) todWeight = 0.9;
        else todWeight = 1.5;
      }
    }
    const todRvol = avgVol > 0 ? Number((currentVol / (avgVol * todWeight)).toFixed(2)) : rvol;

    // Bollinger Bands (20, 2)
    const slice20 = closes.slice(-20);
    const sma20 = slice20.reduce((a, b) => a + b, 0) / Math.max(1, slice20.length);
    const variance =
      slice20.reduce((acc, p) => acc + Math.pow(p - sma20, 2), 0) / Math.max(1, slice20.length);
    const stdDev = Math.sqrt(variance);
    const bollingerUpper = Math.round((sma20 + 2 * stdDev) * 100) / 100;
    const bollingerLower = Math.round((sma20 - 2 * stdDev) * 100) / 100;

    // Trend Strength (-1 to +1)
    const trendDir = ema9 > ema20 ? 1 : -1;
    const rsiScore = Number.isFinite(rsi14) ? (rsi14 - 50) / 50 : 0;
    const macdScore =
      Number.isFinite(hist) && Number.isFinite(atr14) && atr14 > 0
        ? Math.max(-1, Math.min(1, hist / (atr14 * 0.5)))
        : 0;
    const trendStrength = Math.max(-1, Math.min(1, trendDir * 0.4 + rsiScore * 0.3 + macdScore * 0.3));

    // Indicators ready check (requires >= 220 bars and finite EMA200, MACD, and Signal)
    const indicatorsReady =
      closes.length >= 220 &&
      Number.isFinite(ema200) &&
      Number.isFinite(macd) &&
      Number.isFinite(signal);

    const warmupReason = !indicatorsReady
      ? `INDICATOR_WARMUP_NOT_COMPLETE (bars: ${closes.length}/220 required, ema200: ${
          Number.isFinite(ema200) ? "VALID" : "NaN"
        })`
      : undefined;

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
      todRvol,
      trendStrength,
      bollingerUpper,
      bollingerMiddle: Math.round(sma20 * 100) / 100,
      bollingerLower,
      indicatorsReady,
      warmupReason
    };
  }

  public static calcEMA(prices: number[], period: number): number {
    if (prices.length < period) return Number.NaN;
    const series = this.calcEMASeries(prices, period);
    const val = series[series.length - 1];
    return Number.isFinite(val) ? Math.round(val * 100) / 100 : Number.NaN;
  }

  public static calcRSI(prices: number[], period = 14): number {
    const series = this.calcRSISeries(prices, period);
    if (series.length === 0) return Number.NaN;
    const value = series[series.length - 1];
    return Number.isFinite(value) ? value : Number.NaN;
  }

  public static calcMACD(prices: number[]): { macd: number; signal: number; hist: number } {
    const series = this.calcMACDSeries(prices, 12, 26, 9);
    if (prices.length === 0) {
      return { macd: Number.NaN, signal: Number.NaN, hist: Number.NaN };
    }

    const last = prices.length - 1;
    return {
      macd: Number.isFinite(series.macd[last]) ? series.macd[last] : Number.NaN,
      signal: Number.isFinite(series.signal[last]) ? series.signal[last] : Number.NaN,
      hist: Number.isFinite(series.hist[last]) ? series.hist[last] : Number.NaN
    };
  }

  public static calcATR(candles: LiveCandle[], period = 14): number {
    const series = this.calcATRSeries(candles, period);
    if (series.length === 0) return Number.NaN;
    const value = series[series.length - 1];
    return Number.isFinite(value) ? value : Number.NaN;
  }

  public static calculateSessionVWAP(
    candles: LiveCandle[],
    getSessionKey?: (c: LiveCandle) => string
  ): number {
    const series = this.calculateSessionVWAPSeries(candles, getSessionKey);
    if (series.length === 0) return Number.NaN;
    const value = series[series.length - 1];
    return Number.isFinite(value) ? value : Number.NaN;
  }
}
