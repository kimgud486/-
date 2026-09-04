// AISTOCK 24 v10 Global Stock Discovery Scanner Pipeline Service
// KOSPI / KOSDAQ + NYSE / NASDAQ + UPBIT CRYPTO UNIVERSES

export type MarketType = "KOREA" | "US" | "BTC";
export type ScannerGrade = "S" | "A+" | "A" | "B" | "WATCH" | "NO SETUP";
export type SetupType =
  | "Breakout"
  | "Breakout+Retest"
  | "52W High"
  | "VCP"
  | "EMA Pullback"
  | "First Pullback"
  | "Volume Breakout"
  | "Gap & Go"
  | "ORB"
  | "Base Breakout"
  | "Momentum Continuation"
  | "Relative Strength Leader";

export type SetupLifecycleState = "FORMING" | "CONFIRMED" | "ACTIVE" | "INVALIDATED";

export interface ScoreBreakdown {
  relativeStrength: number; // Max 15
  rvolScore: number; // Max 12
  liquidityScore: number; // Max 10
  emaAlignment: number; // Max 10
  adxScore: number; // Max 8
  high52wScore: number; // Max 8
  breakoutScore: number; // Max 10
  vcpScore: number; // Max 7
  pullbackScore: number; // Max 5
  momentumScore: number; // Max 10
  sectorStrength: number; // Max 5
  regionalBoost: number; // KR (+Theme +Disclosure), US (+Gap +DollarVol)
  riskPenalty: number; // Overbought, Extreme Volatility, Dilution
  totalScore: number; // Final 0-100
}

export interface GlobalScannedStock {
  id: string;
  rank: number;
  symbol: string;
  name: string;
  market: MarketType;
  marketLabel: string;
  price: number;
  changePct: number;
  tradingValue: number; // 억원 or $M
  rvol: number; // e.g., 3.1x
  rsScore: number; // 0-100
  adx: number; // e.g. 34.2
  gapPct?: number; // e.g., +5.8%
  setup: SetupType;
  setupState: SetupLifecycleState;
  grade: ScannerGrade;
  scores: ScoreBreakdown;
  catalysts: string[];
  v9UnifiedShapeEligible: boolean; // Transferred to v9 Unified Shape AI
  pipelineStage: "UNIVERSE" | "LIQUIDITY_PASS" | "MOMENTUM_PASS" | "SETUP_PASS" | "TOP_20_CANDIDATE";
  sparklineData: number[];
}

export interface PipelineFilterOptions {
  market: "ALL" | "KOREA" | "US" | "BTC";
  minScore: number;
  gradeFilter: "ALL" | "S" | "A+" | "A" | "B";
  setupFilter: "ALL" | SetupType;
  searchQuery: string;
}

// Initial Global Stock Universe for Scanning
const GLOBAL_STOCK_UNIVERSE: Array<Omit<GlobalScannedStock, "rank" | "pipelineStage" | "v9UnifiedShapeEligible">> = [
  {
    id: "g1",
    symbol: "NVDA",
    name: "엔비디아 (NVIDIA)",
    market: "US",
    marketLabel: "NASDAQ",
    price: 128.50,
    changePct: 4.82,
    tradingValue: 4520, // $M
    rvol: 3.4,
    rsScore: 96,
    adx: 41.5,
    gapPct: 3.2,
    setup: "Breakout",
    setupState: "ACTIVE",
    grade: "S",
    scores: {
      relativeStrength: 15,
      rvolScore: 12,
      liquidityScore: 10,
      emaAlignment: 10,
      adxScore: 8,
      high52wScore: 8,
      breakoutScore: 10,
      vcpScore: 6,
      pullbackScore: 4,
      momentumScore: 10,
      sectorStrength: 5,
      regionalBoost: 5, // US Premarket Gap + Dollar Volume
      riskPenalty: 0,
      totalScore: 93.0
    },
    catalysts: ["Premarket Gap +3.2%", "$4.5B Dollar Vol", "AI 반도체 업종 주도", "52주 신고가 돌파"],
    sparklineData: [122.1, 123.4, 122.8, 124.9, 126.2, 127.8, 128.5],
  },
  {
    id: "g2",
    symbol: "000660",
    name: "SK하이닉스",
    market: "KOREA",
    marketLabel: "KOSPI",
    price: 194500,
    changePct: 3.12,
    tradingValue: 8900, // 억원
    rvol: 2.8,
    rsScore: 92,
    adx: 38.2,
    setup: "52W High",
    setupState: "ACTIVE",
    grade: "S",
    scores: {
      relativeStrength: 14.5,
      rvolScore: 11.0,
      liquidityScore: 10,
      emaAlignment: 10,
      adxScore: 8,
      high52wScore: 8,
      breakoutScore: 9,
      vcpScore: 6,
      pullbackScore: 4,
      momentumScore: 9.5,
      sectorStrength: 5,
      regionalBoost: 6, // KR HBM 반도체 테마 + 외국인/기관 대량 수급
      riskPenalty: 0,
      totalScore: 91.0
    },
    catalysts: ["HBM3E 독점 공급 테마", "외인/기관 대량 매수", "20일선 정배열 지지", "RVOL 2.8x 급증"],
    sparklineData: [187000, 189000, 188500, 191000, 192500, 193000, 194500],
  },
  {
    id: "g3",
    symbol: "TSLA",
    name: "테슬라 (Tesla)",
    market: "US",
    marketLabel: "NASDAQ",
    price: 242.80,
    changePct: 5.64,
    tradingValue: 3800, // $M
    rvol: 3.1,
    rsScore: 89,
    adx: 35.8,
    gapPct: 5.8,
    setup: "VCP",
    setupState: "ACTIVE",
    grade: "A+",
    scores: {
      relativeStrength: 13.5,
      rvolScore: 11.2,
      liquidityScore: 10,
      emaAlignment: 9.5,
      adxScore: 7.5,
      high52wScore: 7.0,
      breakoutScore: 9.0,
      vcpScore: 7.0,
      pullbackScore: 4.5,
      momentumScore: 9.0,
      sectorStrength: 4.5,
      regionalBoost: 5, // Premarket Gap +5.8%
      riskPenalty: -0.5,
      totalScore: 88.6
    },
    catalysts: ["Premarket Gap +5.8%", "VCP 수렴 후 전고점 돌파", "FSD V12.5 승인 호재", "RVOL 3.1x"],
    sparklineData: [228, 230, 229, 234, 237, 240, 242.8],
  },
  {
    id: "g4",
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    marketLabel: "KOSPI",
    price: 78900,
    changePct: 1.81,
    tradingValue: 12500, // 억원
    rvol: 2.1,
    rsScore: 84,
    adx: 31.4,
    setup: "EMA Pullback",
    setupState: "CONFIRMED",
    grade: "A+",
    scores: {
      relativeStrength: 12.5,
      rvolScore: 9.5,
      liquidityScore: 10,
      emaAlignment: 9.0,
      adxScore: 7.0,
      high52wScore: 6.5,
      breakoutScore: 7.5,
      vcpScore: 5.5,
      pullbackScore: 5.0,
      momentumScore: 8.0,
      sectorStrength: 4.5,
      regionalBoost: 4, // 공시 호재 + 파운드리 수주
      riskPenalty: 0,
      totalScore: 84.0
    },
    catalysts: ["20일선 눌림목 반등", "파운드리 신규 수주 공시", "거래대금 1.25조 원", "EMA 5/20 지지"],
    sparklineData: [77200, 77800, 77500, 78100, 78400, 78600, 78900],
  },
  {
    id: "g5",
    symbol: "PLTR",
    name: "팔란티어 (Palantir)",
    market: "US",
    marketLabel: "NYSE",
    price: 36.40,
    changePct: 6.12,
    tradingValue: 1450, // $M
    rvol: 3.8,
    rsScore: 94,
    adx: 42.1,
    gapPct: 4.1,
    setup: "Breakout+Retest",
    setupState: "ACTIVE",
    grade: "A+",
    scores: {
      relativeStrength: 14.5,
      rvolScore: 11.8,
      liquidityScore: 9.5,
      emaAlignment: 9.5,
      adxScore: 8.0,
      high52wScore: 7.5,
      breakoutScore: 9.5,
      vcpScore: 6.0,
      pullbackScore: 4.0,
      momentumScore: 9.5,
      sectorStrength: 4.5,
      regionalBoost: 4.5,
      riskPenalty: -0.5,
      totalScore: 88.3
    },
    catalysts: ["AI 플랫폼 (AIP) 계약 급증", "52주 신고가 돌파 리테스트 완료", "Premarket Gap +4.1%", "S&P500 편입 모멘텀"],
    sparklineData: [33.2, 34.0, 33.8, 35.1, 35.5, 36.0, 36.4],
  },
  {
    id: "g6",
    symbol: "035420",
    name: "NAVER",
    market: "KOREA",
    marketLabel: "KOSPI",
    price: 219500,
    changePct: 2.33,
    tradingValue: 3400, // 억원
    rvol: 2.2,
    rsScore: 81,
    adx: 29.5,
    setup: "VCP",
    setupState: "CONFIRMED",
    grade: "A",
    scores: {
      relativeStrength: 12.0,
      rvolScore: 9.8,
      liquidityScore: 9.5,
      emaAlignment: 8.5,
      adxScore: 6.5,
      high52wScore: 6.0,
      breakoutScore: 8.0,
      vcpScore: 6.5,
      pullbackScore: 4.5,
      momentumScore: 7.8,
      sectorStrength: 4.0,
      regionalBoost: 5, // AI 챗봇 사업 확대 + 실적 발표
      riskPenalty: 0,
      totalScore: 81.7
    },
    catalysts: ["생성형 AI 하이퍼클로바X 호재", "VCP 3차 수렴 완료", "RVOL 2.2x", "테마/업종 강도 상위"],
    sparklineData: [213000, 215000, 214500, 217000, 218000, 218500, 219500],
  },
  {
    id: "g7",
    symbol: "AAPL",
    name: "애플 (Apple)",
    market: "US",
    marketLabel: "NASDAQ",
    price: 226.10,
    changePct: 1.45,
    tradingValue: 2900, // $M
    rvol: 1.9,
    rsScore: 82,
    adx: 27.8,
    gapPct: 1.1,
    setup: "EMA Pullback",
    setupState: "FORMING",
    grade: "A",
    scores: {
      relativeStrength: 12.0,
      rvolScore: 8.5,
      liquidityScore: 10,
      emaAlignment: 8.5,
      adxScore: 6.0,
      high52wScore: 6.5,
      breakoutScore: 7.0,
      vcpScore: 5.0,
      pullbackScore: 5.0,
      momentumScore: 7.5,
      sectorStrength: 4.0,
      regionalBoost: 3.0,
      riskPenalty: 0,
      totalScore: 78.0
    },
    catalysts: ["Apple Intelligence 교체 수요", "20일선 눌림목 안정적 형성", "안정적 대형주 수급"],
    sparklineData: [222, 223, 222.5, 224, 225, 225.5, 226.1],
  },
  {
    id: "g8",
    symbol: "KRW-BTC",
    name: "비트코인 (Bitcoin)",
    market: "BTC",
    marketLabel: "UPBIT",
    price: 110780000,
    changePct: 2.85,
    tradingValue: 18500, // 억원
    rvol: 2.9,
    rsScore: 90,
    adx: 36.4,
    setup: "Breakout",
    setupState: "ACTIVE",
    grade: "A+",
    scores: {
      relativeStrength: 13.5,
      rvolScore: 11.0,
      liquidityScore: 10,
      emaAlignment: 9.5,
      adxScore: 7.5,
      high52wScore: 7.5,
      breakoutScore: 9.0,
      vcpScore: 6.0,
      pullbackScore: 4.0,
      momentumScore: 9.0,
      sectorStrength: 4.5,
      regionalBoost: 4.0,
      riskPenalty: 0,
      totalScore: 86.5
    },
    catalysts: ["현물 ETF 순유입 지속", "1억 1천만 원 전고점 돌파 시도", "업비트 거래대금 1위", "RVOL 2.9x"],
    sparklineData: [106500000, 107800000, 107200000, 108900000, 109800000, 110200000, 110780000],
  },
  {
    id: "g9",
    symbol: "MSFT",
    name: "마이크로소프트 (Microsoft)",
    market: "US",
    marketLabel: "NASDAQ",
    price: 448.20,
    changePct: 1.95,
    tradingValue: 2300, // $M
    rvol: 2.1,
    rsScore: 85,
    adx: 30.2,
    gapPct: 1.5,
    setup: "First Pullback",
    setupState: "CONFIRMED",
    grade: "A",
    scores: {
      relativeStrength: 12.5,
      rvolScore: 9.0,
      liquidityScore: 10,
      emaAlignment: 9.0,
      adxScore: 6.5,
      high52wScore: 7.0,
      breakoutScore: 7.5,
      vcpScore: 5.5,
      pullbackScore: 5.0,
      momentumScore: 8.0,
      sectorStrength: 4.5,
      regionalBoost: 3.5,
      riskPenalty: 0,
      totalScore: 81.0
    },
    catalysts: ["Copilot 엔터프라이즈 구독 확대", "Azure 클라우드 성장 지속", "5일/20일 EMA 지지"],
    sparklineData: [439, 442, 440, 444, 446, 447, 448.2],
  },
  {
    id: "g10",
    symbol: "207940",
    name: "삼성바이오로직스",
    market: "KOREA",
    marketLabel: "KOSPI",
    price: 985000,
    changePct: 2.61,
    tradingValue: 2800, // 억원
    rvol: 2.4,
    rsScore: 86,
    adx: 32.8,
    setup: "Volume Breakout",
    setupState: "ACTIVE",
    grade: "A",
    scores: {
      relativeStrength: 12.8,
      rvolScore: 10.2,
      liquidityScore: 9.0,
      emaAlignment: 9.0,
      adxScore: 7.0,
      high52wScore: 7.2,
      breakoutScore: 8.5,
      vcpScore: 5.5,
      pullbackScore: 4.0,
      momentumScore: 8.2,
      sectorStrength: 4.0,
      regionalBoost: 4.5, // 5공장 증설 및 수주 공시
      riskPenalty: 0,
      totalScore: 82.9
    },
    catalysts: ["신규 CMO 장기 계약 공시", "100만 원 라운드 피겨 돌파 임박", "바이오 업종 리더"],
    sparklineData: [952000, 960000, 958000, 968000, 975000, 980000, 985000],
  }
];

export class GlobalStockDiscoveryScannerService {
  /**
   * Run the full v10 Global Stock Discovery Pipeline
   */
  public static runPipeline(options: PipelineFilterOptions): GlobalScannedStock[] {
    let dataset = GLOBAL_STOCK_UNIVERSE.map((item, index) => {
      // Stage 1 & 2: Universe & Liquidity Filter Pass
      const liquidityPass = item.tradingValue > (item.market === "US" ? 100 : 100);
      const pipelineStage: GlobalScannedStock["pipelineStage"] = liquidityPass
        ? item.scores.totalScore >= 80
          ? "TOP_20_CANDIDATE"
          : "SETUP_PASS"
        : "LIQUIDITY_PASS";

      return {
        ...item,
        rank: index + 1,
        pipelineStage,
        v9UnifiedShapeEligible: item.scores.totalScore >= 75
      } as GlobalScannedStock;
    });

    // Market Filter
    if (options.market !== "ALL") {
      dataset = dataset.filter((s) => s.market === options.market);
    }

    // Grade Filter
    if (options.gradeFilter !== "ALL") {
      dataset = dataset.filter((s) => s.grade === options.gradeFilter);
    }

    // Setup Filter
    if (options.setupFilter !== "ALL") {
      dataset = dataset.filter((s) => s.setup === options.setupFilter);
    }

    // Min Score Filter
    if (options.minScore > 0) {
      dataset = dataset.filter((s) => s.scores.totalScore >= options.minScore);
    }

    // Search Query
    if (options.searchQuery.trim().length > 0) {
      const q = options.searchQuery.toLowerCase().trim();
      dataset = dataset.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.setup.toLowerCase().includes(q)
      );
    }

    // Sort descending by Global Stock Score
    dataset.sort((a, b) => b.scores.totalScore - a.scores.totalScore);

    // Re-assign dynamic rank
    return dataset.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));
  }

  /**
   * Return Top 20 Global Discovery Candidates for v9 Unified Shape AI
   */
  public static getTop20Candidates(): GlobalScannedStock[] {
    return this.runPipeline({
      market: "ALL",
      minScore: 0,
      gradeFilter: "ALL",
      setupFilter: "ALL",
      searchQuery: ""
    }).slice(0, 20);
  }
}
