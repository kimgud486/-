import type { LiveCandle } from "./types";

export type BollingerBreakoutDirection = "UP" | "DOWN" | "NONE";

export interface BollingerSeriesPoint {
  middle: number;
  upper: number;
  lower: number;
  bandwidthPct: number;
  squeeze: boolean;
  squeezeRatio: number;
}

export interface BollingerSqueezeSnapshot extends BollingerSeriesPoint {
  direction: BollingerBreakoutDirection;
  breakoutCandidate: boolean;
  breakoutConfirmed: boolean;
  squeezeRelease: boolean;
  reason: string;
}

export class BollingerSqueezeEngine {
  /**
   * Standard Bollinger Bands with a transparent squeeze rule.
   *
   * Squeeze rule:
   * - current bandwidth = (upper - lower) / middle * 100
   * - baseline = average bandwidth of the PREVIOUS squeezeLookback valid bars
   * - squeeze when current bandwidth <= baseline * squeezeRatioThreshold
   *
   * The current bar is excluded from its own baseline to avoid self-dilution.
   */
  public static calculateSeries(
    closes: number[],
    period = 20,
    stdDevMultiplier = 2,
    squeezeLookback = 20,
    squeezeRatioThreshold = 0.75
  ): BollingerSeriesPoint[] {
    const emptyPoint = (): BollingerSeriesPoint => ({
      middle: Number.NaN,
      upper: Number.NaN,
      lower: Number.NaN,
      bandwidthPct: Number.NaN,
      squeeze: false,
      squeezeRatio: Number.NaN
    });

    const result = Array.from({ length: closes.length }, emptyPoint);

    if (
      !Number.isInteger(period) ||
      period <= 1 ||
      !Number.isFinite(stdDevMultiplier) ||
      stdDevMultiplier <= 0 ||
      !Number.isInteger(squeezeLookback) ||
      squeezeLookback <= 0 ||
      !Number.isFinite(squeezeRatioThreshold) ||
      squeezeRatioThreshold <= 0 ||
      closes.length < period
    ) {
      return result;
    }

    const bandwidths = new Array<number>(closes.length).fill(Number.NaN);

    for (let i = period - 1; i < closes.length; i++) {
      const window = closes.slice(i - period + 1, i + 1);
      if (window.some(value => !Number.isFinite(value) || value <= 0)) continue;

      const middle = window.reduce((sum, value) => sum + value, 0) / period;
      const variance = window.reduce((sum, value) => sum + Math.pow(value - middle, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      const upper = middle + stdDevMultiplier * stdDev;
      const lower = middle - stdDevMultiplier * stdDev;
      const bandwidthPct = middle > 0 ? ((upper - lower) / middle) * 100 : Number.NaN;

      bandwidths[i] = bandwidthPct;

      const previousBandwidths = bandwidths
        .slice(Math.max(period - 1, i - squeezeLookback), i)
        .filter(Number.isFinite);

      const baseline = previousBandwidths.length >= Math.min(squeezeLookback, 5)
        ? previousBandwidths.reduce((sum, value) => sum + value, 0) / previousBandwidths.length
        : Number.NaN;
      const squeezeRatio = Number.isFinite(baseline) && baseline > 0
        ? bandwidthPct / baseline
        : Number.NaN;
      const squeeze = Number.isFinite(squeezeRatio) && squeezeRatio <= squeezeRatioThreshold;

      result[i] = {
        middle: Number(middle.toFixed(4)),
        upper: Number(upper.toFixed(4)),
        lower: Number(lower.toFixed(4)),
        bandwidthPct: Number(bandwidthPct.toFixed(4)),
        squeeze,
        squeezeRatio: Number.isFinite(squeezeRatio) ? Number(squeezeRatio.toFixed(4)) : Number.NaN
      };
    }

    return result;
  }

  /**
   * Detects a true band cross without look-ahead.
   * A confirmed breakout requires the last candle to be closed.
   * A forming candle can only be a candidate.
   */
  public static analyze(
    candles: LiveCandle[],
    period = 20,
    stdDevMultiplier = 2,
    squeezeLookback = 20,
    squeezeRatioThreshold = 0.75
  ): BollingerSqueezeSnapshot {
    const unavailable: BollingerSqueezeSnapshot = {
      middle: Number.NaN,
      upper: Number.NaN,
      lower: Number.NaN,
      bandwidthPct: Number.NaN,
      squeeze: false,
      squeezeRatio: Number.NaN,
      direction: "NONE",
      breakoutCandidate: false,
      breakoutConfirmed: false,
      squeezeRelease: false,
      reason: "BOLLINGER_WARMUP"
    };

    if (!candles || candles.length < period + 1) return unavailable;

    const closes = candles.map(candle => candle.close);
    const series = this.calculateSeries(
      closes,
      period,
      stdDevMultiplier,
      squeezeLookback,
      squeezeRatioThreshold
    );
    const lastIndex = candles.length - 1;
    const previousIndex = lastIndex - 1;
    const current = series[lastIndex];
    const previous = series[previousIndex];

    if (!current || !previous || !Number.isFinite(current.upper) || !Number.isFinite(previous.upper)) {
      return unavailable;
    }

    const lastClose = candles[lastIndex].close;
    const previousClose = candles[previousIndex].close;
    const crossedUp = previousClose <= previous.upper && lastClose > current.upper;
    const crossedDown = previousClose >= previous.lower && lastClose < current.lower;
    const direction: BollingerBreakoutDirection = crossedUp ? "UP" : crossedDown ? "DOWN" : "NONE";
    const breakoutCandidate = direction !== "NONE";
    const breakoutConfirmed = breakoutCandidate && candles[lastIndex].isClosed === true;
    const squeezeRelease = previous.squeeze && !current.squeeze && breakoutCandidate;

    let reason = "밴드 안에서 움직이는 중";
    if (current.squeeze) reason = "밴드가 좁아지는 중 · 큰 움직임 준비 가능성";
    else if (squeezeRelease && direction === "UP") reason = "스퀴즈 해제 + 상단 밴드 돌파";
    else if (squeezeRelease && direction === "DOWN") reason = "스퀴즈 해제 + 하단 밴드 이탈";
    else if (direction === "UP") reason = breakoutConfirmed ? "상단 밴드 돌파 확인" : "상단 밴드 돌파 진행 중";
    else if (direction === "DOWN") reason = breakoutConfirmed ? "하단 밴드 이탈 확인" : "하단 밴드 이탈 진행 중";

    return {
      ...current,
      direction,
      breakoutCandidate,
      breakoutConfirmed,
      squeezeRelease,
      reason
    };
  }
}
