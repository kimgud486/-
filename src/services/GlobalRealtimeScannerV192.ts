// ----------------------------------------------------------------------
// AISTOCK GLOBAL REALTIME SCANNER V19.2 COMPATIBILITY FACADE (RC6)
// Browser keeps the existing public API; Node/server delegates to Server V20 hub.
// ----------------------------------------------------------------------

import { getAllStocks, LiveStockItem } from "../data/stockUniverse";
import { realtimeMarketFeedService, requireLiveData } from "./realtimeMarketFeedService";
import { realCandleStore } from "./RealCandleStore";
import { IndicatorTruthEngine } from "./IndicatorTruthEngine";
import { PatternTruthEngineV192 } from "./PatternTruthEngineV192";
import type { Candle } from "./StructureBrain";

export type UsExchange = "NASDAQ" | "NYSE" | "AMEX" | "UNKNOWN";

export interface ScannerMetricsV192 {
  rvol: number | null;
  vwap: number | null;
  ema9: number | null;
  ema20: number | null;
  ema50: number | null;
  rsi14: number | null;
  atr14: number | null;
  rs15m: number | null;
  breakoutConfirmed: boolean | null;
  chaseRisk: boolean | null;
  exhaustionRisk: boolean | null;
  evidenceCoveragePct: number;
}

export interface HotListItemV192 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  exchange: UsExchange | string;
  currentPrice: number;
  priceChange24hPct: number;
  volatilityScore: number;
  aiMatchScore: number;
  expectedReturnPct: number | null;
  planningObjectiveNote: string;
  patternType: string;
  patternName: string;
  targetPrice: number | null;
  stopLoss: number | null;
  holdingPeriod: string;
  riskRewardRatio: string;
  volumeIncreaseRatio: number | null;
  rsiIndicator: number | null;
  reasoning: string;
  grade: "S" | "A" | "B" | "WATCH" | "REJECT";
  setupScore: number;
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  evidenceCount: number;
  evidenceList: string[];
  metrics: ScannerMetricsV192;
}

export interface ScanResultV192 {
  scanTimestamp: string;
  scannedTotal: number;
  filteredCount: number;
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  marketCounts: { KOREA: number; US: number; UPBIT: number };
  hotItems: HotListItemV192[];
}

const US_EXCHANGE_MAP: Record<string, UsExchange> = {
  NVDA: "NASDAQ", TSLA: "NASDAQ", AAPL: "NASDAQ", MSFT: "NASDAQ",
  AMZN: "NASDAQ", GOOGL: "NASDAQ", META: "NASDAQ", AMD: "NASDAQ",
  INTC: "NASDAQ", AVGO: "NASDAQ", ARM: "NASDAQ", SMCI: "NASDAQ",
  MSTR: "NASDAQ", QQQ: "NASDAQ", TQQQ: "NASDAQ", SOXL: "NASDAQ",
  SOXS: "NASDAQ", TSM: "NYSE", PLTR: "NYSE", COIN: "NASDAQ",
  LLY: "NYSE", NVO: "NYSE", SPY: "AMEX"
};

export class GlobalRealtimeScannerV192 {
  public static normalizeMarketInput(marketInput?: string): "ALL" | "KOREA" | "US" | "UPBIT" {
    if (!marketInput || marketInput === "ALL") return "ALL";
    const u = marketInput.toUpperCase();
    if (u === "BTC" || u === "CRYPTO" || u === "UPBIT") return "UPBIT";
    if (u === "US" || u === "USA") return "US";
    if (u === "KOREA" || u === "KR" || u === "KRX") return "KOREA";
    return "ALL";
  }

  /** Browser-only compatibility scanner using verified browser quotes/candles. */
  public static scanMarket(
    stocks: LiveStockItem[],
    marketType: "KOREA" | "US" | "UPBIT",
    options?: {
      exchangeFilter?: string;
      patternFilter?: string;
      minObjectivePct?: number;
      minSetupScore?: number;
    }
  ): { items: HotListItemV192[]; scannedCount: number } {
    const exchangeFilter = options?.exchangeFilter || "ALL";
    const patternFilter = options?.patternFilter || "ALL";
    const minObjectivePct = options?.minObjectivePct ?? 0;
    const minSetupScore = options?.minSetupScore ?? 50;
    const results: HotListItemV192[] = [];
    let scannedCount = 0;

    for (const stock of stocks) {
      scannedCount += 1;
      const exchange: UsExchange | string = marketType === "US"
        ? (US_EXCHANGE_MAP[stock.symbol] || "UNKNOWN")
        : marketType;
      if (marketType === "US" && exchangeFilter !== "ALL" && exchange !== exchangeFilter) continue;

      const quote = realtimeMarketFeedService.getQuote(stock.symbol);
      if (!requireLiveData(quote)) continue;
      const candles15m = realCandleStore.getCachedCandles(stock.symbol, "15m");
      if (!candles15m || candles15m.length < 35) continue;

      const rawCandles: Candle[] = candles15m.map(c => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume
      }));
      const snapshot = IndicatorTruthEngine.computeSnapshot(rawCandles);
      const patterns = PatternTruthEngineV192.evaluatePatterns(rawCandles);
      const bullishPatterns = patterns.filter(p => p.direction === "BULLISH");
      if (patternFilter !== "ALL" && !patterns.some(p =>
        p.patternId.toLowerCase() === patternFilter.toLowerCase() ||
        p.patternName.toLowerCase().includes(patternFilter.toLowerCase())
      )) continue;

      const price = quote!.price;
      const changePct = quote!.changeRate ?? 0;
      const rvol = snapshot.rvol;
      const vwap = snapshot.vwap;
      const rsi = snapshot.rsi14;
      const atr = snapshot.atr14;
      const distFromVwap = vwap != null && vwap > 0 ? ((price - vwap) / vwap) * 100 : null;
      const chaseRisk = distFromVwap != null ? distFromVwap > 7.5 : null;
      const exhaustionRisk = Math.abs(changePct) > 30 || (rsi != null && rsi > 80);
      if (chaseRisk || exhaustionRisk) continue;

      let evidenceCount = 0;
      let points = 0;
      let possible = 0;
      const evidenceList: string[] = [];
      if (Number.isFinite(changePct)) {
        possible += 15;
        if (changePct > 0) points += Math.min(15, changePct * 1.5);
        evidenceCount += 1;
        evidenceList.push(`변동률 ${changePct.toFixed(2)}%`);
      }
      if (rvol != null) {
        possible += 25; evidenceCount += 1;
        if (rvol >= 2) points += 25; else if (rvol >= 1.3) points += 15;
        evidenceList.push(`RVOL ${rvol.toFixed(2)}`);
      }
      if (vwap != null) {
        possible += 20; evidenceCount += 1;
        if (price >= vwap) points += 20;
        evidenceList.push(`VWAP ${price >= vwap ? "상회" : "하회"}`);
      }
      if (rsi != null) {
        possible += 15; evidenceCount += 1;
        if (rsi >= 45 && rsi <= 72) points += 15;
        evidenceList.push(`RSI14 ${rsi.toFixed(1)}`);
      }
      if (bullishPatterns.length) {
        possible += 25; evidenceCount += 1;
        points += Math.min(25, Math.round(bullishPatterns[0].confidence * 0.25));
        evidenceList.push(...bullishPatterns[0].evidence.slice(0, 2));
      }

      const setupScore = possible > 0 ? Math.round((points / possible) * 100) : 0;
      if (setupScore < minSetupScore) continue;
      const grade: HotListItemV192["grade"] = setupScore >= 85 ? "S" : setupScore >= 70 ? "A" : setupScore >= 55 ? "B" : "WATCH";

      const stopLoss = atr != null && atr > 0 ? price - atr * 1.5 : null;
      const targetPrice = atr != null && atr > 0 ? price + atr * 3 : null;
      const expectedReturnPct = targetPrice != null ? ((targetPrice - price) / price) * 100 : null;
      if (minObjectivePct > 0 && (expectedReturnPct == null || expectedReturnPct < minObjectivePct)) continue;
      const topBull = bullishPatterns[0];

      results.push({
        symbol: stock.symbol,
        name: stock.name,
        market: marketType === "UPBIT" ? "BTC" : marketType,
        exchange,
        currentPrice: price,
        priceChange24hPct: +changePct.toFixed(2),
        volatilityScore: Math.min(100, Math.round(Math.abs(changePct) * 3)),
        aiMatchScore: setupScore,
        expectedReturnPct: expectedReturnPct == null ? null : +expectedReturnPct.toFixed(2),
        planningObjectiveNote: atr != null ? "실제 OHLCV ATR 기반 계획 목표" : "ATR 데이터 부족: 목표 미제공",
        patternType: topBull?.patternId || "EVIDENCE_SETUP",
        patternName: topBull?.patternName || "증거 기반 셋업",
        targetPrice: targetPrice == null ? null : +targetPrice.toFixed(2),
        stopLoss: stopLoss == null ? null : +stopLoss.toFixed(2),
        holdingPeriod: "미정",
        riskRewardRatio: stopLoss != null && targetPrice != null && price > stopLoss
          ? `1 : ${((targetPrice - price) / (price - stopLoss)).toFixed(1)}` : "N/A",
        volumeIncreaseRatio: rvol,
        rsiIndicator: rsi,
        reasoning: evidenceList.join(" · "),
        grade,
        setupScore,
        dataStatus: "REALTIME_VERIFIED",
        evidenceCount,
        evidenceList,
        metrics: {
          rvol,
          vwap,
          ema9: snapshot.ema9,
          ema20: snapshot.ema20,
          ema50: snapshot.ema50,
          rsi14: rsi,
          atr14: atr,
          rs15m: +changePct.toFixed(1),
          breakoutConfirmed: vwap != null ? price >= vwap : null,
          chaseRisk,
          exhaustionRisk,
          evidenceCoveragePct: Math.round((possible / 100) * 100)
        }
      });
    }

    results.sort((a, b) => b.setupScore - a.setupScore);
    return { items: results, scannedCount };
  }
}

export async function scanGlobalRealtimeHotListV192(options?: {
  marketFilter?: "ALL" | "KOREA" | "US" | "UPBIT" | "BTC" | "CRYPTO";
  exchangeFilter?: string;
  patternFilter?: string;
  minYield?: number;
  minObjectivePct?: number;
  minSetupScore?: number;
}): Promise<ScanResultV192> {
  // server.ts imports this legacy name. RC6 transparently routes Node execution to the V20 server hub.
  if (typeof window === "undefined") {
    const { scanServerGlobalRealtimeHotListV20 } = await import("../../server/v20/scanServerGlobalRealtimeHotListV20");
    return scanServerGlobalRealtimeHotListV20(options);
  }

  const normalizedMarket = GlobalRealtimeScannerV192.normalizeMarketInput(options?.marketFilter);
  const allStocks = getAllStocks();
  const scanOpts = {
    exchangeFilter: options?.exchangeFilter || "ALL",
    patternFilter: options?.patternFilter || "ALL",
    minObjectivePct: options?.minObjectivePct ?? options?.minYield ?? 0,
    minSetupScore: options?.minSetupScore ?? 50
  };
  const hotItems: HotListItemV192[] = [];
  const marketCounts = { KOREA: 0, US: 0, UPBIT: 0 };
  let scannedTotal = 0;

  const run = (market: "KOREA" | "US" | "UPBIT", stocks: LiveStockItem[]) => {
    const res = GlobalRealtimeScannerV192.scanMarket(stocks, market, scanOpts);
    hotItems.push(...res.items);
    marketCounts[market] = res.scannedCount;
    scannedTotal += res.scannedCount;
  };

  if (normalizedMarket === "ALL" || normalizedMarket === "KOREA") {
    run("KOREA", allStocks.filter(s => s.market === "KOSPI" || s.market === "KOSDAQ"));
  }
  if (normalizedMarket === "ALL" || normalizedMarket === "US") {
    run("US", allStocks.filter(s => s.market === "US"));
  }
  if (normalizedMarket === "ALL" || normalizedMarket === "UPBIT") {
    run("UPBIT", allStocks.filter(s => s.market === "UPBIT"));
  }

  hotItems.sort((a, b) => b.setupScore - a.setupScore);
  return {
    scanTimestamp: new Date().toLocaleTimeString("ko-KR"),
    scannedTotal,
    filteredCount: hotItems.length,
    dataStatus: hotItems.length ? "REALTIME_VERIFIED" : "NO_DATA",
    marketCounts,
    hotItems
  };
}
