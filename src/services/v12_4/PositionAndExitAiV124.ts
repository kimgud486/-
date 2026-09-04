// AISTOCK v12.4 / v13 Position AI & Dynamic Trailing Exit AI Engine
// Independent of Scanner AI! Evaluates active position post-fill and determines dynamic trailing stop exits.

export type PositionAiState =
  | "HOLD"
  | "PROFIT HOLD"
  | "TRAIL UP"
  | "SELL WATCH"
  | "SELL"
  | "EMERGENCY EXIT";

export interface ActivePositionMetrics {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  buyPrice: number;
  currentPrice: number;
  pnlPct: number;
  qty: number;
  lastHigherLow: number;
  vwapSupport: number;
  emaSupport: number;
  atrStop: number;
  breakoutSupport: number;
  rsi: number;
  macdCross: "BULLISH" | "BEARISH" | "NEUTRAL";
  volumeBuilding: boolean;
  sellRiskPct: number; // 0 ~ 100%
}

export interface PositionAiEvaluationResult {
  symbol: string;
  state: PositionAiState;
  dynamicExitFloor: number;
  sellRiskPct: number;
  pnlPct: number;
  aiActionAdvice: "HOLD" | "TRAIL_FLOOR_RAISED" | "PREPARE_SELL" | "EXECUTE_SELL";
  explanation: string;
  scannerIndependent: boolean; // Always true!
  timestamp: string;
}

export class PositionAndExitAiV124 {
  /**
   * 1. Dynamic Trailing Exit Floor Calculation
   * Filters candidate stops below current price:
   * candidate_stops = [lastHigherLow, vwapSupport, emaSupport, atrStop, breakoutSupport, baselineStop]
   * valid_stops = candidate_stops.filter(s => s > 0 && s < currentPrice)
   * dynamic_floor = Math.max(...valid_stops)
   */
  public calculateDynamicTrailingExitFloor(metrics: ActivePositionMetrics): number {
    const {
      buyPrice,
      currentPrice,
      lastHigherLow,
      vwapSupport,
      emaSupport,
      atrStop,
      breakoutSupport
    } = metrics;

    const defaultBaselineStop = buyPrice * 0.975;

    const candidateStops = [
      lastHigherLow,
      vwapSupport,
      emaSupport,
      atrStop,
      breakoutSupport,
      defaultBaselineStop
    ];

    const validStops = candidateStops.filter(s => typeof s === "number" && s > 0 && s < currentPrice);

    if (validStops.length === 0) {
      return Number((currentPrice * 0.975).toFixed(2));
    }

    const maxSupport = Math.max(...validStops);
    return Number(Math.min(maxSupport, currentPrice * 0.995).toFixed(2));
  }

  /**
   * 2. Position AI Per-Bar Evaluation
   * Completely ignores scanner presence! Evaluates real-time price structure and momentum.
   */
  public evaluatePosition(metrics: ActivePositionMetrics): PositionAiEvaluationResult {
    const {
      symbol,
      buyPrice,
      currentPrice,
      pnlPct,
      rsi,
      macdCross,
      sellRiskPct
    } = metrics;

    const dynamicExitFloor = this.calculateDynamicTrailingExitFloor(metrics);

    let state: PositionAiState = "HOLD";
    let aiActionAdvice: "HOLD" | "TRAIL_FLOOR_RAISED" | "PREPARE_SELL" | "EXECUTE_SELL" = "HOLD";
    let explanation = "";

    // 1. Exit Condition: Price breached dynamic trailing exit floor
    if (currentPrice <= dynamicExitFloor) {
      state = "SELL";
      aiActionAdvice = "EXECUTE_SELL";
      explanation = `🚨 [동적 트레일링 스탑 발동] 현재가(${currentPrice.toLocaleString()}원)가 동적 이탈가(${dynamicExitFloor.toLocaleString()}원)를 하향 이탈하여 익절/손절 청산을 이행합니다.`;
    }
    // 2. Emergency Exit: Hard stop breach (-3.5% or higher loss)
    else if (pnlPct <= -3.5) {
      state = "EMERGENCY EXIT";
      aiActionAdvice = "EXECUTE_SELL";
      explanation = `🚨 [비상 손절 발동] 손실률(${pnlPct.toFixed(2)}%)이 최대 허용 손실 한도(-3.5%)를 초과하여 긴급 매도 처리합니다.`;
    }
    // 3. Sell Watch: High sell risk or momentum breakdown
    else if (sellRiskPct >= 70 || (pnlPct > 2 && macdCross === "BEARISH" && rsi > 70)) {
      state = "SELL WATCH";
      aiActionAdvice = "PREPARE_SELL";
      explanation = `⚠️ [매도 경계] 매도 위험도(${sellRiskPct}%) 상승 및 단기 데드크로스 신호 발생. 동적 스탑라인(${dynamicExitFloor.toLocaleString()}원) 주시 중.`;
    }
    // 4. Trail Up: High profit and strong trend
    else if (pnlPct >= 4.0) {
      state = "TRAIL UP";
      aiActionAdvice = "TRAIL_FLOOR_RAISED";
      explanation = `🚀 [트레일링 업] 수익률 +${pnlPct.toFixed(2)}% 기록 중. 고점 상승에 따라 동적 익절 바닥가를 ${dynamicExitFloor.toLocaleString()}원으로 상향 추종합니다.`;
    }
    // 5. Profit Hold: Positive PnL in healthy structure
    else if (pnlPct > 0.5) {
      state = "PROFIT HOLD";
      aiActionAdvice = "HOLD";
      explanation = `✅ [수익 유지] 수익률 +${pnlPct.toFixed(2)}% 보유 중. HH/HL 가격 구조 및 VWAP 지지선 유지 중입니다.`;
    }
    // 6. Normal Hold: PnL near entry price
    else {
      state = "HOLD";
      aiActionAdvice = "HOLD";
      explanation = `보유 지속 (PnL: ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%). 기술적 지지선 내에서 정상 파동 진행 중입니다.`;
    }

    return {
      symbol,
      state,
      dynamicExitFloor,
      sellRiskPct,
      pnlPct,
      aiActionAdvice,
      explanation,
      scannerIndependent: true, // Scanner status is completely ignored for post-buy position management!
      timestamp: new Date().toLocaleTimeString("ko-KR")
    };
  }
}
