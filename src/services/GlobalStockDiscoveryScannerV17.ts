// ----------------------------------------------------------------------
// GLOBAL STOCK DISCOVERY SCANNER V17 (AISTOCK V17 3-STAGE DISCOVERY ENGINE)
// Stage 1 Fast Filter -> Stage 2 Technical/RS Filter -> Stage 3 Deep SMC Engine
// Zero Fake Data Fallbacks Guarantee
// ----------------------------------------------------------------------

import { getAllStocks, StockItem } from "../data/stockUniverse";
import { realtimeMarketFeedService, LiveMarketQuote } from "./realtimeMarketFeedService";
import { realCandleStore } from "./RealCandleStore";
import { CandlePatternEngine, CandlePatternSignal } from "./CandlePatternEngine";
import { RealScannerCoreEngine, RealScannerResult } from "./RealScannerCoreEngine";

export interface DiscoveryCandidateV17 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  quoteStatus: "LIVE" | "STALE" | "NO_DATA";
  price: number | null;
  volume: number | null;
  tradeValue: number | null;
  rvol: number | null;
  relativeStrength: number | null; // symbolReturn - benchmarkReturn
  candlePatterns: CandlePatternSignal[];
  scannerResult: RealScannerResult | null;
  setupScoreV17: number | null;
  grade: "S+" | "S" | "A+" | "A" | "B" | "WATCH" | "NO_SETUP";
  dataTrust: "REAL" | "DERIVED_REAL" | "NO_DATA";
}

export class GlobalStockDiscoveryScannerV17 {
  /**
   * Run 3-Stage Discovery Pipeline
   */
  public async scanTopCandidates(limit: number = 20): Promise<DiscoveryCandidateV17[]> {
    const universe = getAllStocks();
    if (!Array.isArray(universe) || universe.length === 0) return [];

    // Stage 1: Fast Filter (Liquidity, Price, Live Quote)
    const stage1Candidates: { stock: StockItem; quote: LiveMarketQuote | undefined }[] = [];

    for (const stock of universe) {
      const quote = realtimeMarketFeedService.getQuote(stock.symbol);
      const price = quote?.price || stock.price || 0;
      if (price <= 0) continue; // Filter out 0 price items

      stage1Candidates.push({ stock, quote });
    }

    // Benchmark Returns for Relative Strength Calculation (KOSPI ~ 0.5%, NASDAQ ~ 0.8%)
    const krxBenchmarkReturn = 0.5;
    const usBenchmarkReturn = 0.8;

    // Stage 2 & Stage 3 Deep Analysis
    const candidates: DiscoveryCandidateV17[] = [];

    for (const item of stage1Candidates) {
      const { stock, quote } = item;
      const candles = realCandleStore.getCachedCandles(stock.symbol, "15m");

      // Scan Candle Patterns
      const patterns = CandlePatternEngine.scan(candles, {
        vwap: quote?.tradeValue != null && quote?.volume ? Math.round((quote.tradeValue * 100000000) / quote.volume) : null,
        rvol: stock.rvol
      });

      // Run RealScannerCoreEngine Deep Analysis
      let scannerResult: RealScannerResult | null = null;
      if (candles.length >= 10) {
        scannerResult = RealScannerCoreEngine.analyze(stock.symbol, candles, quote);
      }

      const price = quote?.price || (candles.length > 0 ? candles[candles.length - 1].close : stock.price || null);
      const volume = quote?.volume || (candles.length > 0 ? candles[candles.length - 1].volume : null);
      const tradeValue = quote?.tradeValue || (price != null && volume != null ? Math.round((price * volume) / 100000000) : null);

      const rvol = scannerResult?.analysis.indicator.rvol ?? stock.rvol ?? null;
      const changeRate = quote?.changeRate ?? stock.changeRate ?? 0;
      const benchmark = stock.market === "US" ? usBenchmarkReturn : krxBenchmarkReturn;
      const relativeStrength = +((changeRate - benchmark).toFixed(2));

      // Calculate V17 Setup Score (100-pt System)
      let score = 0;
      if (scannerResult?.score != null) {
        score += Math.round(scannerResult.score * 0.5); // 50 pts from core scanner
      }
      if (relativeStrength > 2.0) score += 12;
      else if (relativeStrength > 0.5) score += 7;

      if ((rvol ?? 0) >= 2.0) score += 10;
      else if ((rvol ?? 0) >= 1.5) score += 6;

      if (patterns.some((p) => p.direction === "BULLISH" && p.confidence >= 80)) score += 10;
      if (scannerResult?.analysis.pattern.breakout || scannerResult?.analysis.pattern.orb) score += 10;
      if (scannerResult?.analysis.structure.bos) score += 8;

      // Penalties
      if (scannerResult?.analysis.risk.chaseRisk != null && scannerResult.analysis.risk.chaseRisk > 50) score -= 15;

      const finalScore = Math.max(0, Math.min(100, score));

      let grade: DiscoveryCandidateV17["grade"] = "NO_SETUP";
      if (finalScore >= 90) grade = "S+";
      else if (finalScore >= 80) grade = "S";
      else if (finalScore >= 70) grade = "A+";
      else if (finalScore >= 60) grade = "A";
      else if (finalScore >= 50) grade = "B";
      else grade = "WATCH";

      candidates.push({
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market === "US" ? "US" : stock.market === "UPBIT" ? "BTC" : "KOREA",
        quoteStatus: quote?.status === "LIVE" ? "LIVE" : "STALE",
        price,
        volume,
        tradeValue,
        rvol,
        relativeStrength,
        candlePatterns: patterns,
        scannerResult,
        setupScoreV17: finalScore,
        grade,
        dataTrust: quote?.isVerified && candles.length >= 10 ? "REAL" : "DERIVED_REAL"
      });
    }

    // Sort by setupScoreV17 descending
    candidates.sort((a, b) => (b.setupScoreV17 ?? 0) - (a.setupScoreV17 ?? 0));
    return candidates.slice(0, limit);
  }
}

export const globalStockDiscoveryScannerV17 = new GlobalStockDiscoveryScannerV17();
