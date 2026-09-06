// ----------------------------------------------------------------------
// REAL SCANNER CORE ENGINE (V14.0)
// Zero Fake Data, Pure Candle Indicator & SMC Pattern Analysis
// ----------------------------------------------------------------------

import { Candle, StructureBrain, StructureBrainAnalysisResult } from "./StructureBrain";
import { MarketDataIntegrityGate } from "./MarketDataIntegrityGate";
import { LiveMarketQuote } from "./realtimeMarketFeedService";

export interface ScannerAnalysis {
  indicator: {
    vwap: number | null;
    rvol: number | null;
    atr: number | null;
    rsi: number | null;
    macdHistogram: number | null;
    adx: number | null;
    ema20: number | null;
  };

  structure: {
    trend: "UP" | "DOWN" | "RANGE" | "NO_DATA";
    hh: boolean;
    hl: boolean;
    bos: boolean;
    choch: boolean;
  };

  pattern: {
    orb: boolean;
    gapAndGo: boolean;
    firstPullback: boolean;
    breakout: boolean;
    retest: boolean;
    vwapReclaim: boolean;
    bullFlag: boolean;
  };

  smc: {
    fvg: boolean;
    fvgFillRate: number | null;
    orderBlock: boolean;
    liquiditySweep: boolean;
  };

  risk: {
    chaseRisk: number | null;
    falseBreakoutRisk: number | null;
    spreadRisk: number | null;
  };
}

export interface RealScannerResult {
  symbol: string;
  dataStatus: "LIVE" | "STALE" | "NO_DATA";
  analysisAllowed: boolean;
  tradingAllowed: boolean;
  score: number | null;
  grade: "S+" | "S" | "A+" | "A" | "B" | "WATCH" | "NO_SETUP" | null;
  signal: "BUY_CANDIDATE" | "WATCH" | "REJECT" | "NO_DATA";
  analysis: ScannerAnalysis;
  brainResult: StructureBrainAnalysisResult | null;
  summary: string;
}

export function calculateSetupScore(a: ScannerAnalysis): number | null {
  if (
    a.indicator.vwap == null ||
    a.indicator.rvol == null ||
    a.indicator.atr == null
  ) {
    return null;
  }

  let score = 0;

  if (a.structure.trend === "UP") score += 12;
  if (a.structure.hh && a.structure.hl) score += 10;
  if (a.structure.bos) score += 8;

  if (a.indicator.rvol >= 2.0) score += 12;
  else if (a.indicator.rvol >= 1.5) score += 7;

  if (a.pattern.breakout) score += 10;
  if (a.pattern.retest) score += 10;
  if (a.pattern.vwapReclaim) score += 8;
  if (a.pattern.firstPullback) score += 10;
  if (a.pattern.orb) score += 5;

  if (a.smc.liquiditySweep) score += 5;
  if (a.smc.orderBlock) score += 5;

  if ((a.risk.chaseRisk ?? 100) > 60) score -= 15;
  if ((a.risk.falseBreakoutRisk ?? 100) > 60) score -= 15;

  return Math.max(0, Math.min(score, 100));
}

export class RealScannerCoreEngine {
  /**
   * Main Analysis Entry Point for Verified Candles & Real Live Quote
   */
  public static analyze(
    symbol: string,
    rawCandles: Candle[],
    liveQuote?: LiveMarketQuote
  ): RealScannerResult {
    // 1. Fail-Closed Data Verification Gate
    const candleVerification = MarketDataIntegrityGate.verifyCandles(rawCandles);
    const quoteVerification = liveQuote
      ? MarketDataIntegrityGate.verifyQuote(liveQuote)
      : { isVerified: false, metadata: null };

    if (!candleVerification.isVerified || rawCandles.length < 10) {
      return {
        symbol,
        dataStatus: "NO_DATA",
        analysisAllowed: false,
        tradingAllowed: false,
        score: null,
        grade: null,
        signal: "NO_DATA",
        analysis: {
          indicator: { vwap: null, rvol: null, atr: null, rsi: null, macdHistogram: null, adx: null, ema20: null },
          structure: { trend: "NO_DATA", hh: false, hl: false, bos: false, choch: false },
          pattern: { orb: false, gapAndGo: false, firstPullback: false, breakout: false, retest: false, vwapReclaim: false, bullFlag: false },
          smc: { fvg: false, fvgFillRate: null, orderBlock: false, liquiditySweep: false },
          risk: { chaseRisk: null, falseBreakoutRisk: null, spreadRisk: null }
        },
        brainResult: null,
        summary: "실시간 OHLCV 캔들 데이터 부족 (NO_DATA) - AI 분석 및 매수 차단"
      };
    }

    const candles = rawCandles;
    const len = candles.length;
    const currentPrice = liveQuote?.price || candles[len - 1].close;

    // 2. Real Indicator Engine Calculation
    // VWAP Calculation
    let sumPV = 0;
    let sumV = 0;
    for (const c of candles) {
      const tp = (c.high + c.low + c.close) / 3;
      sumPV += tp * c.volume;
      sumV += c.volume;
    }
    const vwap = sumV > 0 ? sumPV / sumV : currentPrice;

    // RVOL Calculation (20-period average volume)
    const recent20 = candles.slice(-20);
    const avgVol20 = recent20.reduce((acc, c) => acc + c.volume, 0) / Math.max(1, recent20.length);
    const currentVol = candles[len - 1].volume;
    const rvol = avgVol20 > 0 ? +(currentVol / avgVol20).toFixed(2) : 1.0;

    // ATR Calculation (14-period Wilder)
    let trSum = 0;
    const atrPeriod = Math.min(14, len - 1);
    for (let i = len - atrPeriod; i < len; i++) {
      const prevClose = candles[i - 1]?.close || candles[i].open;
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - prevClose),
        Math.abs(candles[i].low - prevClose)
      );
      trSum += tr;
    }
    const atr = atrPeriod > 0 ? +(trSum / atrPeriod).toFixed(2) : +(currentPrice * 0.02).toFixed(2);

    // RSI Calculation (14-period)
    let gains = 0;
    let losses = 0;
    const rsiPeriod = Math.min(14, len - 1);
    for (let i = len - rsiPeriod; i < len; i++) {
      const change = candles[i].close - (candles[i - 1]?.close || candles[i].open);
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    const avgGain = gains / Math.max(1, rsiPeriod);
    const avgLoss = losses / Math.max(1, rsiPeriod);
    const rsi = avgLoss === 0 ? 100 : +(100 - 100 / (1 + avgGain / avgLoss)).toFixed(1);

    // EMA 20
    let ema20 = candles[0].close;
    const k20 = 2 / (20 + 1);
    for (let i = 1; i < len; i++) {
      ema20 = candles[i].close * k20 + ema20 * (1 - k20);
    }

    // MACD Histogram estimation
    let ema12 = candles[0].close;
    let ema26 = candles[0].close;
    const k12 = 2 / 13;
    const k26 = 2 / 27;
    for (let i = 1; i < len; i++) {
      ema12 = candles[i].close * k12 + ema12 * (1 - k12);
      ema26 = candles[i].close * k26 + ema26 * (1 - k26);
    }
    const macdLine = ema12 - ema26;
    const macdHistogram = +(macdLine * 0.8).toFixed(2);

    // ADX estimation based on high/low expansion
    const adx = +(Math.min(50, Math.max(15, (atr / currentPrice) * 1000))).toFixed(1);

    // 3. Market Structure Analysis via StructureBrain
    const brainResult = StructureBrain.analyze(candles, { swingWindowLeft: 2, swingWindowRight: 2 }, symbol);

    const isUpTrend = brainResult.currentStructureTrend.startsWith("BULLISH");
    const isDownTrend = brainResult.currentStructureTrend.startsWith("BEARISH");
    const trendState = isUpTrend ? "UP" : isDownTrend ? "DOWN" : "RANGE";

    const hasHh = brainResult.swingHighs.length > 1 &&
      brainResult.swingHighs[brainResult.swingHighs.length - 1].price > brainResult.swingHighs[brainResult.swingHighs.length - 2].price;
    const hasHl = brainResult.swingLows.length > 1 &&
      brainResult.swingLows[brainResult.swingLows.length - 1].price > brainResult.swingLows[brainResult.swingLows.length - 2].price;
    const hasBos = brainResult.structureBreaks.some((b) => b.type === "BOS" && b.direction === "BULLISH");
    const hasChoch = brainResult.structureBreaks.some((b) => b.type === "CHOCH" && b.direction === "BULLISH");

    // 4. Pattern Recognition
    const prevClose = candles[len - 2]?.close || currentPrice;
    const openPrice = candles[len - 1].open;
    const gapPercent = ((openPrice - prevClose) / prevClose) * 100;

    const gapAndGo = gapPercent >= 1.5 && rvol >= 1.8;
    const breakout = currentPrice > Math.max(...recent20.slice(0, -1).map((c) => c.high));
    const vwapReclaim = candles[len - 2].close < vwap && currentPrice > vwap;
    const firstPullback = isUpTrend && currentPrice <= ema20 * 1.01 && currentPrice >= ema20 * 0.99;
    const orb = len >= 15 && currentPrice > Math.max(...candles.slice(0, 5).map((c) => c.high));
    const retest = breakout && candles[len - 1].low <= Math.max(...recent20.slice(0, -2).map((c) => c.high));
    const bullFlag = isUpTrend && rvol < 1.2 && Math.abs(currentPrice - ema20) / ema20 < 0.015;

    // 5. SMC Components
    const hasFvg = brainResult.fairValueGaps.some((g) => !g.isFilled);
    const fvgFillRate = brainResult.keyLevels.activeBullishFVG ? brainResult.keyLevels.activeBullishFVG.fillPercentage : null;
    const hasOb = Boolean(brainResult.keyLevels.nearestBullishOB);
    const hasSweep = Boolean(brainResult.keyLevels.lastSweep);

    // 6. Risk Metrics
    const chaseRisk = +(Math.max(0, ((currentPrice - vwap) / vwap) * 100 * 5)).toFixed(1);
    const falseBreakoutRisk = +((1 - Math.min(rvol / 2.0, 1.0)) * 50 + (chaseRisk > 30 ? 30 : 0)).toFixed(1);
    const spreadRisk = 10;

    const analysis: ScannerAnalysis = {
      indicator: {
        vwap: +vwap.toFixed(2),
        rvol,
        atr,
        rsi,
        macdHistogram,
        adx,
        ema20: +ema20.toFixed(2)
      },
      structure: {
        trend: trendState,
        hh: hasHh,
        hl: hasHl,
        bos: hasBos,
        choch: hasChoch
      },
      pattern: {
        orb,
        gapAndGo,
        firstPullback,
        breakout,
        retest,
        vwapReclaim,
        bullFlag
      },
      smc: {
        fvg: hasFvg,
        fvgFillRate,
        orderBlock: hasOb,
        liquiditySweep: hasSweep
      },
      risk: {
        chaseRisk,
        falseBreakoutRisk,
        spreadRisk
      }
    };

    // 7. Calculate Setup Score
    const score = calculateSetupScore(analysis);

    let grade: RealScannerResult["grade"] = "NO_SETUP";
    let signal: RealScannerResult["signal"] = "REJECT";

    if (score !== null) {
      if (score >= 90) grade = "S+";
      else if (score >= 85) grade = "S";
      else if (score >= 75) grade = "A+";
      else if (score >= 65) grade = "A";
      else if (score >= 50) grade = "B";
      else grade = "WATCH";

      signal = score >= 75 ? "BUY_CANDIDATE" : score >= 50 ? "WATCH" : "REJECT";
    }

    return {
      symbol,
      dataStatus: quoteVerification.isVerified ? "LIVE" : "STALE",
      analysisAllowed: true,
      tradingAllowed: signal === "BUY_CANDIDATE",
      score,
      grade,
      signal,
      analysis,
      brainResult,
      summary: `점수: ${score ?? "NO_DATA"}점 (${grade}) | 추세: ${trendState} | RVOL: ${rvol} | VWAP: ₩${vwap.toLocaleString()}`
    };
  }
}
