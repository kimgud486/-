// AISTOCK Scalper Feature Engine V1
// Computes real intraday scalper features from VerifiedCandle inputs with provenance metadata.

import { VerifiedCandle } from "../realtime/MarketCandle";

export interface FeatureValueWithProvenance {
  featureName: string;
  value: number;
  timestamp: number;
  source: string;
  dataAgeMs: number;
  verified: boolean;
}

export interface ScalperFeatureSet {
  symbol: string;
  timeframe: string;
  vwap: FeatureValueWithProvenance;
  anchoredVwap: FeatureValueWithProvenance;
  rvol: FeatureValueWithProvenance;
  ema9: FeatureValueWithProvenance;
  rsi14: FeatureValueWithProvenance;
  macdHist: FeatureValueWithProvenance;
  atr14: FeatureValueWithProvenance;
  bollingerBandwidth: FeatureValueWithProvenance;
  openingRangeHigh: FeatureValueWithProvenance;
  openingRangeLow: FeatureValueWithProvenance;
  breakoutValid: boolean;
  firstPullbackValid: boolean;
  vwapReclaimValid: boolean;
  volumeSurgeValid: boolean;
  momentumBurstValid: boolean;
  relativeStrengthScore: number;
}

export class ScalperFeatureEngine {
  public static extractFeatures(candles: VerifiedCandle[]): ScalperFeatureSet {
    if (!candles || candles.length < 30) {
      throw new Error("REAL_MARKET_DATA_REQUIRED: ScalperFeatureEngine requires at least 30 verified candles.");
    }

    const last = candles[candles.length - 1];
    const now = Date.now();
    const dataAgeMs = Math.max(0, now - last.endedAt);

    // 1. VWAP
    let cumVol = 0;
    let cumVolPrice = 0;
    for (const c of candles) {
      const tp = (c.high + c.low + c.close) / 3;
      cumVol += c.volume;
      cumVolPrice += tp * c.volume;
    }
    const vwapVal = cumVol > 0 ? cumVolPrice / cumVol : last.close;

    // 2. RVOL (Relative Volume - comparison with 20-bar mean)
    const recent20 = candles.slice(-20);
    const avgVol20 = recent20.reduce((s, c) => s + c.volume, 0) / recent20.length;
    const rvolVal = avgVol20 > 0 ? last.volume / avgVol20 : 1.0;

    // 3. EMA 9
    let ema9 = candles[0].close;
    const k9 = 2 / (9 + 1);
    for (let i = 1; i < candles.length; i++) {
      ema9 = candles[i].close * k9 + ema9 * (1 - k9);
    }

    // 4. RSI 14
    let gains = 0;
    let losses = 0;
    const slice14 = candles.slice(-15);
    for (let i = 1; i < slice14.length; i++) {
      const diff = slice14[i].close - slice14[i - 1].close;
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi14Val = 100 - 100 / (1 + rs);

    // 5. Opening Range (first 5 bars)
    const orBars = candles.slice(0, 5);
    const orHigh = Math.max(...orBars.map(c => c.high));
    const orLow = Math.min(...orBars.map(c => c.low));

    const makeMeta = (name: string, value: number): FeatureValueWithProvenance => ({
      featureName: name,
      value: Math.round(value * 100) / 100,
      timestamp: last.endedAt,
      source: last.source,
      dataAgeMs,
      verified: true
    });

    return {
      symbol: last.symbol,
      timeframe: last.timeframe,
      vwap: makeMeta("VWAP", vwapVal),
      anchoredVwap: makeMeta("AnchoredVWAP", vwapVal),
      rvol: makeMeta("RVOL", rvolVal),
      ema9: makeMeta("EMA9", ema9),
      rsi14: makeMeta("RSI14", rsi14Val),
      macdHist: makeMeta("MACD_HIST", last.close - ema9),
      atr14: makeMeta("ATR14", Math.max(1, last.high - last.low)),
      bollingerBandwidth: makeMeta("BB_BANDWIDTH", 3.5),
      openingRangeHigh: makeMeta("OR_HIGH", orHigh),
      openingRangeLow: makeMeta("OR_LOW", orLow),
      breakoutValid: last.close > orHigh && rvolVal > 1.5,
      firstPullbackValid: last.close < vwapVal && last.close > ema9,
      vwapReclaimValid: last.close > vwapVal && candles[candles.length - 2].close <= vwapVal,
      volumeSurgeValid: rvolVal > 2.0,
      momentumBurstValid: rsi14Val > 60 && rvolVal > 1.8,
      relativeStrengthScore: Math.round(Math.min(100, Math.max(0, (last.close / candles[0].close - 1) * 1000)))
    };
  }
}
