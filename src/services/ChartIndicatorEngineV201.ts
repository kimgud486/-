export interface ChartIndicatorInputCandle {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartIndicatorOutputCandle extends ChartIndicatorInputCandle {
  ema9?: number;
  ema20?: number;
  vwap?: number;
  rvol20?: number;
}

export interface ChartIndicatorOptions {
  /**
   * Optional session key. When it changes, cumulative VWAP restarts.
   * Example: candle => String(candle.time).slice(0, 10) for ISO timestamps.
   */
  sessionKey?: (candle: ChartIndicatorInputCandle) => string;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const average = (values: number[]): number | undefined => {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

/**
 * Calculates a standard EMA series.
 *
 * Truth rule:
 * - No guessed seed value.
 * - The first EMA appears only after `period` valid closes exist.
 * - The seed is the SMA of those closes.
 */
export function calculateEma(
  closes: number[],
  period: number,
): Array<number | undefined> {
  const output: Array<number | undefined> = new Array(closes.length).fill(undefined);
  if (!Number.isInteger(period) || period <= 0 || closes.length < period) return output;

  const seedValues = closes.slice(0, period);
  if (!seedValues.every(isFiniteNumber)) return output;

  let ema = seedValues.reduce((sum, value) => sum + value, 0) / period;
  output[period - 1] = ema;

  const multiplier = 2 / (period + 1);
  for (let i = period; i < closes.length; i += 1) {
    const close = closes[i];
    if (!isFiniteNumber(close)) {
      output[i] = undefined;
      continue;
    }
    ema = (close - ema) * multiplier + ema;
    output[i] = ema;
  }

  return output;
}

/**
 * Cumulative VWAP using Typical Price = (high + low + close) / 3.
 * VWAP is reset only when the optional session key changes.
 */
export function calculateVwap(
  candles: ChartIndicatorInputCandle[],
  sessionKey?: (candle: ChartIndicatorInputCandle) => string,
): Array<number | undefined> {
  const output: Array<number | undefined> = new Array(candles.length).fill(undefined);

  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;
  let previousSession: string | undefined;

  candles.forEach((candle, index) => {
    const currentSession = sessionKey?.(candle);
    if (sessionKey && previousSession !== undefined && currentSession !== previousSession) {
      cumulativePriceVolume = 0;
      cumulativeVolume = 0;
    }
    previousSession = currentSession;

    const { high, low, close, volume } = candle;
    if (
      !isFiniteNumber(high) ||
      !isFiniteNumber(low) ||
      !isFiniteNumber(close) ||
      !isFiniteNumber(volume) ||
      volume < 0
    ) {
      output[index] = undefined;
      return;
    }

    if (volume > 0) {
      const typicalPrice = (high + low + close) / 3;
      cumulativePriceVolume += typicalPrice * volume;
      cumulativeVolume += volume;
    }

    output[index] = cumulativeVolume > 0
      ? cumulativePriceVolume / cumulativeVolume
      : undefined;
  });

  return output;
}

/**
 * Relative volume compared with the previous `period` candles.
 * The current candle is NOT included in the average, avoiding self-dilution.
 */
export function calculateRvol(
  volumes: number[],
  period = 20,
): Array<number | undefined> {
  const output: Array<number | undefined> = new Array(volumes.length).fill(undefined);
  if (!Number.isInteger(period) || period <= 0) return output;

  for (let i = period; i < volumes.length; i += 1) {
    const current = volumes[i];
    const history = volumes.slice(i - period, i);
    if (!isFiniteNumber(current) || current < 0 || !history.every(value => isFiniteNumber(value) && value >= 0)) {
      continue;
    }

    const baseline = average(history);
    if (!baseline || baseline <= 0) continue;
    output[i] = current / baseline;
  }

  return output;
}

/**
 * Adds chart-ready indicators without inventing price data.
 * Input OHLCV remains unchanged.
 */
export function calculateChartIndicators(
  candles: ChartIndicatorInputCandle[],
  options: ChartIndicatorOptions = {},
): ChartIndicatorOutputCandle[] {
  if (!Array.isArray(candles) || candles.length === 0) return [];

  const closes = candles.map(candle => candle.close);
  const volumes = candles.map(candle => candle.volume);
  const ema9 = calculateEma(closes, 9);
  const ema20 = calculateEma(closes, 20);
  const vwap = calculateVwap(candles, options.sessionKey);
  const rvol20 = calculateRvol(volumes, 20);

  return candles.map((candle, index) => ({
    ...candle,
    ema9: ema9[index],
    ema20: ema20[index],
    vwap: vwap[index],
    rvol20: rvol20[index],
  }));
}
