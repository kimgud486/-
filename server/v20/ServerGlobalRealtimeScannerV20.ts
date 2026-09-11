// ----------------------------------------------------------------------
// SERVER GLOBAL REALTIME SCANNER V20 (AISTOCK RC6)
// Truth-first multi-market setup scoring. Missing evidence never becomes neutral evidence.
// ----------------------------------------------------------------------

export type MarketType = "KR" | "US" | "CRYPTO";
export type ExchangeType = "KOSPI" | "KOSDAQ" | "NASDAQ" | "NYSE" | "AMEX" | "UPBIT" | "UNKNOWN";
export type DataTruthStatus = "REALTIME_VERIFIED" | "REALTIME_DERIVED" | "STALE" | "NO_DATA" | "INVALID" | "CLOSED";

export interface ScanCandidateInput {
  symbol: string;
  name: string;
  market: MarketType;
  exchange: ExchangeType;
  price: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  changePct: number;
  gapPct?: number;
  volume: number;
  tradeValue: number;
  rvol?: number;
  rs5m?: number;
  rs15m?: number;
  rs1h?: number;
  rs1d?: number;
  vwap?: number;
  ema9?: number;
  ema20?: number;
  ema50?: number;
  atr14?: number;
  rsi14?: number;
  spreadBps?: number;
  orderbookImbalance?: number;
  signedFlow?: number;
  patterns?: string[];
  structureTrend?: "BULLISH" | "BEARISH" | "SIDEWAYS";
  isBreakout?: boolean;
  isRetest?: boolean;
  chaseRisk?: boolean;
  exhaustionRisk?: boolean;
  dataStatus: DataTruthStatus;
}

export interface ScanCandidateResult extends ScanCandidateInput {
  setupScore: number;
  grade: "S" | "A" | "B" | "C" | "REJECT";
  recommendation: "BUY_CANDIDATE" | "WATCH" | "REJECT";
  evidenceCount: number;
  evidenceCoverage: number;
  rejectionReason?: string;
  timestamp: number;
}

export class ServerGlobalRealtimeScannerV20 {
  public static evaluateCandidate(input: ScanCandidateInput): ScanCandidateResult {
    const timestamp = Date.now();
    const reject = (reason: string): ScanCandidateResult => ({
      ...input,
      setupScore: 0,
      grade: "REJECT",
      recommendation: "REJECT",
      evidenceCount: 0,
      evidenceCoverage: 0,
      rejectionReason: reason,
      timestamp
    });

    if (input.dataStatus !== "REALTIME_VERIFIED" && input.dataStatus !== "REALTIME_DERIVED") {
      return reject(`DATA_TRUTH_REJECT: Data status is ${input.dataStatus}`);
    }
    if (!Number.isFinite(input.price) || input.price <= 0) return reject("INVALID_PRICE: Price <= 0");
    if (!Number.isFinite(input.volume) || input.volume < 0) return reject("INVALID_VOLUME");
    if (input.chaseRisk || input.exhaustionRisk) {
      return reject(input.chaseRisk ? "CHASE_RISK_EXCEEDED" : "EXHAUSTION_RISK_EXCEEDED");
    }

    let score = 45;
    let evidenceCount = 0;
    const maxEvidenceGroups = 7;

    // 1) RVOL. Missing RVOL is unknown, never 1.0/neutral.
    if (Number.isFinite(input.rvol)) {
      evidenceCount += 1;
      const rvol = Number(input.rvol);
      if (rvol >= 2.5) score += 20;
      else if (rvol >= 1.5) score += 12;
      else if (rvol < 1.0) score -= 15;
    }

    // 2) Relative strength only when at least two real horizons exist.
    const rsValues = [input.rs5m, input.rs15m, input.rs1h, input.rs1d]
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (rsValues.length >= 2) {
      evidenceCount += 1;
      const rsAvg = rsValues.reduce((a, b) => a + b, 0) / rsValues.length;
      if (rsAvg >= 75) score += 15;
      else if (rsAvg >= 60) score += 8;
      else if (rsAvg < 45) score -= 10;
    }

    // 3) VWAP position.
    if (typeof input.vwap === "number" && Number.isFinite(input.vwap) && input.vwap > 0) {
      evidenceCount += 1;
      score += input.price > input.vwap ? 8 : -6;
    }

    // 4) EMA alignment.
    if (
      typeof input.ema9 === "number" && Number.isFinite(input.ema9) &&
      typeof input.ema20 === "number" && Number.isFinite(input.ema20)
    ) {
      evidenceCount += 1;
      score += input.ema9 > input.ema20 ? 7 : -5;
    }

    // 5) Structure.
    if (input.structureTrend) {
      evidenceCount += 1;
      if (input.structureTrend === "BULLISH") score += 10;
      if (input.structureTrend === "BEARISH") score -= 12;
    }

    // 6) Breakout/retest/pattern confirmation.
    if (input.isBreakout || input.isRetest || (input.patterns?.length || 0) > 0) {
      evidenceCount += 1;
      if (input.isBreakout) score += 8;
      if (input.isRetest) score += 5;
      if ((input.patterns?.length || 0) > 0) score += Math.min(5, input.patterns!.length * 2);
    }

    // 7) Executable spread.
    if (typeof input.spreadBps === "number" && Number.isFinite(input.spreadBps)) {
      evidenceCount += 1;
      if (input.spreadBps > 50) score -= 15;
      else if (input.spreadBps <= 20) score += 3;
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));
    const evidenceCoverage = Math.round((evidenceCount / maxEvidenceGroups) * 100);
    let grade: ScanCandidateResult["grade"] = finalScore >= 85 ? "S" : finalScore >= 72 ? "A" : finalScore >= 60 ? "B" : "C";
    let recommendation: ScanCandidateResult["recommendation"] = finalScore >= 60 ? "WATCH" : "REJECT";

    // BUY requires verified provider data + enough independent evidence + measured RVOL.
    const buyEvidenceReady =
      input.dataStatus === "REALTIME_VERIFIED" &&
      evidenceCount >= 4 &&
      typeof input.rvol === "number" && Number.isFinite(input.rvol) && input.rvol >= 1.2;

    if (buyEvidenceReady && finalScore >= 72) recommendation = "BUY_CANDIDATE";

    // Derived data is analysis-only. It can never autonomously escalate to BUY.
    if (input.dataStatus === "REALTIME_DERIVED" && recommendation === "BUY_CANDIDATE") {
      recommendation = "WATCH";
      if (grade === "S") grade = "A";
    }

    return {
      ...input,
      setupScore: finalScore,
      grade,
      recommendation,
      evidenceCount,
      evidenceCoverage,
      timestamp
    };
  }

  public static scanCandidates(candidates: ScanCandidateInput[]): ScanCandidateResult[] {
    if (!candidates?.length) return [];
    return candidates
      .map(c => this.evaluateCandidate(c))
      .filter(r => r.recommendation !== "REJECT")
      .sort((a, b) => b.setupScore - a.setupScore || b.evidenceCoverage - a.evidenceCoverage);
  }
}
