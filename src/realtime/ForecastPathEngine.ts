import type { LiveCandle, IndicatorSnapshot, ForecastPoint } from "./types";

/**
 * TechnicalForecastEngine: Heuristic trend & momentum projection based on EMA, RSI, MACD, and ATR.
 * Note: Outputs raw direction scores (directionConfidence), NOT statistically calibrated probability.
 */
export function generateTechnicalForecastPath(
  candles: LiveCandle[],
  indicators: IndicatorSnapshot,
  horizon = 8
): ForecastPoint[] {
  return generateForecastPath(candles, indicators, horizon);
}

/**
 * MLForecastEngine: Inference engine wrapper for ML model output.
 */
export function generateMLForecastPath(
  candles: LiveCandle[],
  indicators: IndicatorSnapshot,
  horizon = 8,
  rawModelScore?: number
): ForecastPoint[] {
  return generateForecastPath(candles, indicators, horizon, rawModelScore);
}

export function generateForecastPath(
  candles: LiveCandle[],
  indicators: IndicatorSnapshot,
  horizon = 8,
  mlProbability?: number
): ForecastPoint[] {
  const last = candles[candles.length - 1];
  if (!last) return [];

  let projected = last.close;

  // Technical trend factor: +1 or -1
  const trend = indicators.ema9 > indicators.ema20 ? 1 : -1;

  // Technical momentum factor: -1 to +1
  const momentum = Math.max(-1, Math.min(1, (indicators.rsi14 - 50) / 25));

  // MACD momentum direction
  const macdMomentum = Math.sign(indicators.macdHistogram || 0);

  // Blend with ML probability if provided
  let mlBias = 0;
  if (typeof mlProbability === "number") {
    mlBias = (mlProbability - 0.5) * 2; // -1 to +1
  }

  // Combined strength score (-1 to +1)
  const strength =
    typeof mlProbability === "number"
      ? trend * 0.25 + momentum * 0.20 + macdMomentum * 0.15 + mlBias * 0.40
      : trend * 0.45 + momentum * 0.30 + macdMomentum * 0.25;

  const results: ForecastPoint[] = [];
  const safeAtr = Math.max(last.close * 0.003, indicators.atr14 || last.close * 0.01);

  // Time step in seconds based on recent candle spacing or default 60s
  let stepSec = 60;
  if (candles.length >= 2) {
    const prev = candles[candles.length - 2];
    const diff = Math.abs(last.time - prev.time);
    if (diff > 0 && diff <= 86400) {
      stepSec = diff;
    }
  }

  for (let i = 1; i <= horizon; i++) {
    // Exponential decay of current momentum into the future
    const decay = Math.exp(-0.15 * i);
    const drift = safeAtr * strength * decay * 0.35;
    projected += drift;

    // Uncertainty expands over time via square-root of horizon
    const uncertainty = safeAtr * Math.sqrt(i) * 0.85;

    // Direction score (uncalibrated heuristic score)
    const rawProbUp = 0.5 + strength * 0.28;
    const probabilityUp = Math.max(0.08, Math.min(0.92, Number(rawProbUp.toFixed(3))));
    const probabilityDown = Number((1 - probabilityUp).toFixed(3));

    results.push({
      time: last.time + i * stepSec,
      predicted: Math.round(projected * 100) / 100,
      upper: Math.round((projected + uncertainty) * 100) / 100,
      lower: Math.round((projected - uncertainty) * 100) / 100,
      probabilityUp, // Heuristic direction score
      probabilityDown
    });
  }

  return results;
}

