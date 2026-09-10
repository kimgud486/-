// ----------------------------------------------------------------------
// AISTOCK RC6 SERVER HOT LIST
// Reads only ServerRealtimeMarketHubV20 provider data. No browser store/fallback data.
// ----------------------------------------------------------------------

import { serverRealtimeMarketHubV20 } from "./ServerRealtimeMarketHubV20";
import { ServerGlobalRealtimeScannerV20, ExchangeType, ScanCandidateInput } from "./ServerGlobalRealtimeScannerV20";
import { IndicatorTruthEngine } from "../../src/services/IndicatorTruthEngine";
import type { ScanResultV192, HotListItemV192 } from "../../src/services/GlobalRealtimeScannerV192";
import type { Candle } from "../../src/services/StructureBrain";

export interface ServerHotListOptionsV20 {
  marketFilter?: "ALL" | "KOREA" | "US" | "UPBIT" | "BTC" | "CRYPTO";
  exchangeFilter?: string;
  patternFilter?: string;
  minYield?: number;
  minObjectivePct?: number;
  minSetupScore?: number;
}

function pctFromBars(candles: Candle[], bars: number): number | undefined {
  if (candles.length <= bars) return undefined;
  const start = candles[candles.length - 1 - bars]?.close;
  const end = candles[candles.length - 1]?.close;
  if (!start || !end || start <= 0) return undefined;
  return ((end - start) / start) * 100;
}

function normalizeMarket(value?: string): "ALL" | "KOREA" | "US" | "UPBIT" {
  const u = String(value || "ALL").toUpperCase();
  if (["BTC", "CRYPTO", "UPBIT"].includes(u)) return "UPBIT";
  if (["US", "USA"].includes(u)) return "US";
  if (["KOREA", "KR", "KRX"].includes(u)) return "KOREA";
  return "ALL";
}

function quoteMarketToLegacy(market: "KOREA" | "US" | "UPBIT"): "KOREA" | "US" | "BTC" {
  return market === "UPBIT" ? "BTC" : market;
}

function quoteMarketToScanner(market: "KOREA" | "US" | "UPBIT"): "KR" | "US" | "CRYPTO" {
  return market === "KOREA" ? "KR" : market === "UPBIT" ? "CRYPTO" : "US";
}

function safeExchange(market: "KOREA" | "US" | "UPBIT"): ExchangeType {
  // Exchange metadata is not inferred from a ticker. UNKNOWN is safer than a false NASDAQ/KOSPI claim.
  return market === "UPBIT" ? "UPBIT" : "UNKNOWN";
}

export async function scanServerGlobalRealtimeHotListV20(
  options: ServerHotListOptionsV20 = {}
): Promise<ScanResultV192> {
  const normalizedMarket = normalizeMarket(options.marketFilter);
  const minObjectivePct = options.minObjectivePct ?? options.minYield ?? 0;
  const minSetupScore = options.minSetupScore ?? 50;
  const exchangeFilter = String(options.exchangeFilter || "ALL").toUpperCase();
  const patternFilter = String(options.patternFilter || "ALL").toUpperCase();
  const quotes = serverRealtimeMarketHubV20.getAllQuotes();

  const marketCounts = { KOREA: 0, US: 0, UPBIT: 0 };
  const hotItems: HotListItemV192[] = [];
  let scannedTotal = 0;

  for (const quote of quotes) {
    if (normalizedMarket !== "ALL" && normalizedMarket !== quote.market) continue;
    scannedTotal += 1;
    marketCounts[quote.market] += 1;

    const exchange = safeExchange(quote.market);
    if (exchangeFilter !== "ALL" && exchangeFilter !== exchange) continue;

    const candles = serverRealtimeMarketHubV20.getCandles(quote.symbol);
    const snapshot = IndicatorTruthEngine.computeSnapshot(candles);
    const prior = candles.slice(-21, -1);
    const priorHigh = prior.length ? Math.max(...prior.map(c => c.high)) : null;
    const isBreakout = priorHigh != null ? quote.price > priorHigh : undefined;
    const structureTrend = snapshot.ema9 != null && snapshot.ema20 != null
      ? snapshot.ema9 > snapshot.ema20 ? "BULLISH" : "BEARISH"
      : undefined;

    if (patternFilter !== "ALL" && !(patternFilter === "BREAKOUT" && isBreakout)) continue;

    const spreadBps = quote.askPrice && quote.bidPrice && quote.price > 0
      ? ((quote.askPrice - quote.bidPrice) / quote.price) * 10_000
      : undefined;
    const distFromVwapPct = snapshot.vwap && snapshot.vwap > 0
      ? ((quote.price - snapshot.vwap) / snapshot.vwap) * 100
      : undefined;

    const dataStatus: ScanCandidateInput["dataStatus"] = quote.grade === "EXECUTION_GRADE"
      ? "REALTIME_VERIFIED"
      : quote.grade === "ANALYSIS_ONLY"
        ? "REALTIME_DERIVED"
        : "STALE";

    const input: ScanCandidateInput = {
      symbol: quote.symbol,
      name: quote.name || quote.symbol,
      market: quoteMarketToScanner(quote.market),
      exchange,
      price: quote.price,
      changePct: quote.changePct,
      volume: quote.volume,
      tradeValue: quote.tradeValue,
      rvol: snapshot.rvol ?? undefined,
      rs5m: pctFromBars(candles, 5),
      rs15m: pctFromBars(candles, 15),
      rs1h: pctFromBars(candles, 60),
      vwap: snapshot.vwap ?? undefined,
      ema9: snapshot.ema9 ?? undefined,
      ema20: snapshot.ema20 ?? undefined,
      ema50: snapshot.ema50 ?? undefined,
      atr14: snapshot.atr14 ?? undefined,
      rsi14: snapshot.rsi14 ?? undefined,
      spreadBps,
      patterns: isBreakout ? ["BREAKOUT"] : [],
      structureTrend,
      isBreakout,
      chaseRisk: distFromVwapPct != null ? distFromVwapPct > 7.5 : false,
      exhaustionRisk: Math.abs(quote.changePct) > 30 || (snapshot.rsi14 != null && snapshot.rsi14 > 80),
      dataStatus
    };

    const result = ServerGlobalRealtimeScannerV20.evaluateCandidate(input);
    if (result.recommendation === "REJECT" || result.setupScore < minSetupScore) continue;

    const atr = snapshot.atr14;
    const stopLoss = atr != null && atr > 0 ? Math.max(0, quote.price - atr * 1.5) : null;
    const targetPrice = atr != null && atr > 0 ? quote.price + atr * 3 : null;
    const expectedReturnPct = targetPrice != null
      ? ((targetPrice - quote.price) / quote.price) * 100
      : null;
    if (minObjectivePct > 0 && (expectedReturnPct == null || expectedReturnPct < minObjectivePct)) continue;

    const evidenceList: string[] = [];
    if (snapshot.rvol != null) evidenceList.push(`RVOL ${snapshot.rvol.toFixed(2)}`);
    if (snapshot.vwap != null) evidenceList.push(`VWAP ${quote.price >= snapshot.vwap ? "상회" : "하회"}`);
    if (structureTrend) evidenceList.push(`구조 ${structureTrend}`);
    if (isBreakout) evidenceList.push("20-bar 고점 돌파 확인");
    if (spreadBps != null) evidenceList.push(`Spread ${spreadBps.toFixed(1)}bps`);

    const grade: HotListItemV192["grade"] = result.recommendation === "WATCH"
      ? "WATCH"
      : result.grade === "S" ? "S" : result.grade === "A" ? "A" : "B";
    const rr = stopLoss != null && targetPrice != null && quote.price > stopLoss
      ? `1 : ${((targetPrice - quote.price) / (quote.price - stopLoss)).toFixed(1)}`
      : "N/A";

    hotItems.push({
      symbol: quote.symbol,
      name: quote.name || quote.symbol,
      market: quoteMarketToLegacy(quote.market),
      exchange,
      currentPrice: quote.price,
      priceChange24hPct: +quote.changePct.toFixed(2),
      volatilityScore: Math.min(100, Math.round(Math.abs(quote.changePct) * 3)),
      aiMatchScore: result.setupScore,
      expectedReturnPct: expectedReturnPct == null ? null : +expectedReturnPct.toFixed(2),
      planningObjectiveNote: atr != null ? "실제 OHLCV ATR 기반 계획 목표" : "ATR 데이터 부족: 목표 미제공",
      patternType: isBreakout ? "BREAKOUT" : "EVIDENCE_SETUP",
      patternName: isBreakout ? "실시간 고점 돌파" : "V20 증거 기반 셋업",
      targetPrice: targetPrice == null ? null : +targetPrice.toFixed(2),
      stopLoss: stopLoss == null ? null : +stopLoss.toFixed(2),
      holdingPeriod: "미정",
      riskRewardRatio: rr,
      volumeIncreaseRatio: snapshot.rvol,
      rsiIndicator: snapshot.rsi14,
      reasoning: evidenceList.length ? evidenceList.join(" · ") : "실시간 데이터는 있으나 기술 증거가 아직 부족합니다.",
      grade,
      setupScore: result.setupScore,
      dataStatus: quote.grade === "EXECUTION_GRADE" ? "REALTIME_VERIFIED" : "STALE",
      evidenceCount: result.evidenceCount,
      evidenceList,
      metrics: {
        rvol: snapshot.rvol,
        vwap: snapshot.vwap,
        ema9: snapshot.ema9,
        ema20: snapshot.ema20,
        ema50: snapshot.ema50,
        rsi14: snapshot.rsi14,
        atr14: snapshot.atr14,
        rs15m: pctFromBars(candles, 15) ?? null,
        breakoutConfirmed: isBreakout ?? null,
        chaseRisk: input.chaseRisk ?? null,
        exhaustionRisk: input.exhaustionRisk ?? null,
        evidenceCoveragePct: result.evidenceCoverage
      }
    });
  }

  hotItems.sort((a, b) => b.setupScore - a.setupScore || b.evidenceCount - a.evidenceCount);
  const anyExecutionGrade = quotes.some(q => q.grade === "EXECUTION_GRADE");
  const dataStatus: ScanResultV192["dataStatus"] = quotes.length === 0
    ? "NO_DATA"
    : anyExecutionGrade ? "REALTIME_VERIFIED" : "STALE";

  return {
    scanTimestamp: new Date().toLocaleTimeString("ko-KR"),
    scannedTotal,
    filteredCount: hotItems.length,
    dataStatus,
    marketCounts,
    hotItems
  };
}
