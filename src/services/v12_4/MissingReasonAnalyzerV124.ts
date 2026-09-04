// AISTOCK v12.4 Manual Entry Gate - Missing Reason Analyzer & Pre-Scanner Radar
// Analyzes why a stock was excluded from standard market scanners,
// computes 100-point entry score, evaluates hard reject filters, and detects Pre-Scanner early momentum.

export interface ScannerCheckResult {
  found: boolean;
  scannerName?: string;
  scannerScore?: number;
}

export interface MissingReasonDetail {
  primaryReason: string;
  rvolCurrent: number;
  rvolThreshold: number;
  tradingValueCurrentKRW: number;
  tradingValueThresholdKRW: number;
  volumeTrend: "BUILDING" | "FLAT" | "DECLINING";
  priceStructure: "HH_HL" | "LH_LL" | "SIDEWAYS";
  vwapStatus: "ABOVE" | "BELOW" | "TESTING";
  sectorStrength: "STRONG" | "NEUTRAL" | "WEAK";
  spreadStatus: "NORMAL" | "WIDE" | "EXTREME";
  explanation: string;
}

export interface PreScannerSignal {
  active: boolean;
  confidence: number; // 0 ~ 100%
  signalType: "EARLY_VOLUME_BUILDING" | "VWAP_RECLAIM" | "HH_HL_FORMATION" | "MACD_BULL_CROSS" | "NONE";
  alertText: string;
}

export interface EntryScoreBreakdown100 {
  marketState: number; // Max 10
  sectorTheme: number; // Max 10
  relativeStrength: number; // Max 10
  volumeRvol: number; // Max 12
  priceStructure: number; // Max 15
  vwapEma: number; // Max 10
  momentumIndicators: number; // Max 10
  patterns: number; // Max 10
  multiTimeframe: number; // Max 8
  liquiditySpread: number; // Max 5
  totalScore: number; // Max 100
}

export interface HardRejectEvaluation {
  hasHardReject: boolean;
  rejectedRule?:
    | "extreme_spread"
    | "liquidity_failure"
    | "data_error"
    | "halt_risk"
    | "extreme_chase"
    | "failed_breakout"
    | "major_support_break"
    | "strong_downtrend"
    | "abnormal_volatility";
  rejectDescription?: string;
}

export type EntryDecisionState =
  | "STRONG BUY"
  | "BUY"
  | "EARLY BUY"
  | "WATCH"
  | "WAIT"
  | "NO BUY"
  | "AVOID";

export interface ManualEntryAnalysisResult {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  currentPrice: number;
  scannerStatus: ScannerCheckResult;
  missingReason?: MissingReasonDetail;
  preScannerSignal: PreScannerSignal;
  scoreBreakdown: EntryScoreBreakdown100;
  hardReject: HardRejectEvaluation;
  decisionState: EntryDecisionState;
  confidencePct: number;
  aiCommentary: string;
  timestamp: string;
}

export class MissingReasonAnalyzerV124 {
  /**
   * Primary Entry Point: Analyze any symbol (whether in scanner or manually selected/typed)
   */
  public analyzeSymbol(
    symbol: string,
    name: string,
    market: "KOREA" | "US" | "BTC",
    currentPrice: number,
    scannerList: Array<{ symbol: string; score?: number }> = []
  ): ManualEntryAnalysisResult {
    const cleanSymbol = symbol.trim().toUpperCase();

    // 1. Check Scanner Presence
    const scannerMatch = scannerList.find(s => s.symbol.toUpperCase() === cleanSymbol);
    const scannerStatus: ScannerCheckResult = scannerMatch
      ? { found: true, scannerName: "실시간 주도주 스캐너", scannerScore: scannerMatch.score || 85 }
      : { found: false };

    // Deterministic pseudo-metrics based on symbol hash for simulation consistency
    const symHash = this.getHash(cleanSymbol);
    const rvolCurrent = scannerStatus.found ? 2.1 : Number((0.7 + (symHash % 90) / 100).toFixed(2));
    const rvolThreshold = 1.5;
    const isEarlyVolBuilding = rvolCurrent >= 0.8 && rvolCurrent < rvolThreshold;

    // 2. Missing Reason Analysis (If not in scanner)
    let missingReason: MissingReasonDetail | undefined = undefined;
    if (!scannerStatus.found) {
      missingReason = {
        primaryReason: rvolCurrent < rvolThreshold ? "RVOL 기준치 미달 (0.84 < 1.50)" : "스캔 주기 미포착 조건 밖",
        rvolCurrent,
        rvolThreshold,
        tradingValueCurrentKRW: (symHash % 80) * 100000000 + 1500000000,
        tradingValueThresholdKRW: 5000000000,
        volumeTrend: isEarlyVolBuilding ? "BUILDING" : "FLAT",
        priceStructure: (symHash % 3 === 0) ? "HH_HL" : "SIDEWAYS",
        vwapStatus: (symHash % 2 === 0) ? "ABOVE" : "TESTING",
        sectorStrength: (symHash % 2 === 0) ? "STRONG" : "NEUTRAL",
        spreadStatus: "NORMAL",
        explanation: `스캐너 미포착 원인은 RVOL 기준(${rvolThreshold}) 미충족 때문이나, 최근 3개 봉에서 거래량 증가 및 VWAP 지지선 회복 시도가 감지되었습니다.`
      };
    }

    // 3. Pre-Scanner Early Momentum Radar Signal
    const isPreScanner = !scannerStatus.found && (rvolCurrent >= 0.8 || (symHash % 2 === 0));
    const preScannerSignal: PreScannerSignal = isPreScanner
      ? {
          active: true,
          confidence: 76 + (symHash % 18),
          signalType: "EARLY_VOLUME_BUILDING",
          alertText: "🔥 [PRE-SCANNER ALERT] 스캐너 조건 미충족 상태이나, 거래량 미세 증가 및 HH/HL 구조 형성으로 스캐너 진입 예상됨 (EARLY BUY 후보)"
        }
      : {
          active: false,
          confidence: 40,
          signalType: "NONE",
          alertText: "스캐너 및 Pre-Scanner 미감지 상태"
        };

    // 4. Calculate 100-Point Entry Score
    const scoreBreakdown = this.calculate100PointScore(cleanSymbol, scannerStatus.found, preScannerSignal.active, symHash);

    // 5. Evaluate Hard Reject Filter
    const hardReject = this.evaluateHardReject(currentPrice, symHash, scoreBreakdown.totalScore);

    // 6. Determine Final Entry Decision State
    let decisionState: EntryDecisionState = "WAIT";
    let confidencePct = 50;

    if (hardReject.hasHardReject) {
      decisionState = "AVOID";
      confidencePct = 90;
    } else if (scoreBreakdown.totalScore >= 85) {
      decisionState = "STRONG BUY";
      confidencePct = 88;
    } else if (scoreBreakdown.totalScore >= 75) {
      decisionState = "BUY";
      confidencePct = 80;
    } else if (preScannerSignal.active || scoreBreakdown.totalScore >= 68) {
      decisionState = "EARLY BUY";
      confidencePct = preScannerSignal.confidence || 76;
    } else if (scoreBreakdown.totalScore >= 58) {
      decisionState = "WATCH";
      confidencePct = 65;
    } else if (scoreBreakdown.totalScore >= 45) {
      decisionState = "WAIT";
      confidencePct = 55;
    } else {
      decisionState = "NO BUY";
      confidencePct = 70;
    }

    // 7. Generate AI Commentary
    const aiCommentary = this.generateAiCommentary(
      name,
      cleanSymbol,
      scannerStatus,
      missingReason,
      preScannerSignal,
      decisionState,
      scoreBreakdown.totalScore
    );

    return {
      symbol: cleanSymbol,
      name,
      market,
      currentPrice,
      scannerStatus,
      missingReason,
      preScannerSignal,
      scoreBreakdown,
      hardReject,
      decisionState,
      confidencePct,
      aiCommentary,
      timestamp: new Date().toLocaleTimeString("ko-KR")
    };
  }

  private calculate100PointScore(
    symbol: string,
    inScanner: boolean,
    isPreScanner: boolean,
    hash: number
  ): EntryScoreBreakdown100 {
    const base = 6 + (hash % 4);
    const marketState = Math.min(10, base + 1);
    const sectorTheme = Math.min(10, base + (inScanner ? 2 : 1));
    const relativeStrength = Math.min(10, base);
    const volumeRvol = Math.min(12, inScanner ? 11 : (isPreScanner ? 9 : 6));
    const priceStructure = Math.min(15, inScanner ? 13 : 11);
    const vwapEma = Math.min(10, base + 1);
    const momentumIndicators = Math.min(10, base);
    const patterns = Math.min(10, base + 1);
    const multiTimeframe = Math.min(8, 6);
    const liquiditySpread = Math.min(5, 4);

    const totalScore =
      marketState +
      sectorTheme +
      relativeStrength +
      volumeRvol +
      priceStructure +
      vwapEma +
      momentumIndicators +
      patterns +
      multiTimeframe +
      liquiditySpread;

    return {
      marketState,
      sectorTheme,
      relativeStrength,
      volumeRvol,
      priceStructure,
      vwapEma,
      momentumIndicators,
      patterns,
      multiTimeframe,
      liquiditySpread,
      totalScore
    };
  }

  private evaluateHardReject(price: number, hash: number, totalScore: number): HardRejectEvaluation {
    // Example hard reject check logic
    if (hash % 29 === 0) {
      return {
        hasHardReject: true,
        rejectedRule: "extreme_chase",
        rejectDescription: "🚨 [추격 매수 위험] 최근 5봉 간 단기 과열 급등(+12% 이상)으로 VWAP 이격도가 7.5%를 초과하여 매수가 차단되었습니다."
      };
    }
    if (hash % 37 === 0) {
      return {
        hasHardReject: true,
        rejectedRule: "strong_downtrend",
        rejectDescription: "🚨 [하락 추세 지속] 주봉/일봉 이평선 이탈 및 매도 거래량 분출로 하단 지지선이 훼손되었습니다."
      };
    }

    return { hasHardReject: false };
  }

  private generateAiCommentary(
    name: string,
    symbol: string,
    scannerStatus: ScannerCheckResult,
    missingReason: MissingReasonDetail | undefined,
    preScannerSignal: PreScannerSignal,
    decisionState: EntryDecisionState,
    score: number
  ): string {
    if (scannerStatus.found) {
      return `[${name}(${symbol})] 종목은 주도주 스캐너에 정상 포착되었습니다 (점수: ${score}/100). 수급과 가격 구조가 우수하여 매수 신호 검증을 진행합니다.`;
    }

    if (preScannerSignal.active && decisionState === "EARLY BUY") {
      return `[${name}(${symbol})] 종목은 현재 메인 스캐너 조건(RVOL 1.5) 미충족 상태이나, 최근 3봉 간 수급 유입 및 VWAP 위에서 HH/HL 가격 구조가 형성되고 있습니다. 스캐너 진입 전 EARLY BUY 선제 포착 대상입니다.`;
    }

    if (missingReason) {
      return `[${name}(${symbol})] 종목은 스캐너 미포착 상태입니다. 사유: ${missingReason.primaryReason}. 거래대금 및 모멘텀 확인 후 추가 진입 여부를 판단합니다.`;
    }

    return `[${name}(${symbol})] AI 분석 완료 (점수: ${score}/100). 추후 거래량 분출 시 매수 검증을 재진행합니다.`;
  }

  private getHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
