// AISTOCK v13 Real Intelligence Core - Position & Dynamic Trailing Exit AI Engine
// Post-fill position management completely INDEPENDENT of Scanner AI!
// Calculates dynamic trailing exit floor: max(last_higher_low, vwap_support, ema_support, atr_stop, breakout_support)

import { CalculatedIndicatorsV13 } from "./TechnicalAnalysisEngineV13";

export type PositionStateV13 =
  | "HOLD"
  | "PROFIT HOLD"
  | "TRAIL UP"
  | "SELL WATCH"
  | "SELL"
  | "EMERGENCY EXIT";

export interface ActivePositionInfoV13 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  buyPrice: number;
  currentPrice: number;
  qty: number;
  pnlPct: number;
  pnlAmount: number;
  highestPriceSinceBuy: number;
  indicators: CalculatedIndicatorsV13;
}

export interface PositionEvaluationResultV13 {
  symbol: string;
  state: PositionStateV13;
  dynamicExitFloor: number;
  pnlPct: number;
  sellRiskPct: number; // 0 ~ 100%
  actionAdvice: "HOLD" | "TRAIL_FLOOR_RAISED" | "PREPARE_SELL" | "EXECUTE_SELL";
  explanation: string;
  scannerIndependent: boolean; // Always true
  timestamp: string;
}

export class PositionAndExitEngineV13 {
  /**
   * Evaluate active position on every price update or bar close
   */
  public static evaluatePosition(position: ActivePositionInfoV13): PositionEvaluationResultV13 {
    const { buyPrice, currentPrice, pnlPct, highestPriceSinceBuy, indicators: ind } = position;

    // 1. Calculate Dynamic Trailing Exit Floor
    const atrStop = currentPrice - ind.atr14 * 1.5;
    const vwapSupport = ind.vwap * 0.992;
    const emaSupport = ind.ema20 * 0.99;
    const hlSupport = ind.lastHigherLow;
    const defaultBaselineStop = buyPrice * 0.975;

    // Floor = max(last_higher_low, vwap_support, ema_support, atr_stop, baseline)
    const dynamicExitFloor = Math.min(
      currentPrice * 0.995,
      Math.max(hlSupport, vwapSupport, emaSupport, atrStop, defaultBaselineStop)
    );

    // 2. Compute Sell Risk Score (0~100%)
    let sellRiskPct = 20;
    if (currentPrice <= dynamicExitFloor) sellRiskPct += 60;
    if (ind.macdHist < 0) sellRiskPct += 20;
    if (ind.rsi14 < 45) sellRiskPct += 15;
    if (ind.structure === "LH_LL") sellRiskPct += 25;
    sellRiskPct = Math.min(100, sellRiskPct);

    // 3. State Determination Logic
    let state: PositionStateV13 = "HOLD";
    let actionAdvice: "HOLD" | "TRAIL_FLOOR_RAISED" | "PREPARE_SELL" | "EXECUTE_SELL" = "HOLD";
    let explanation = "";

    // Condition A: Price breached dynamic exit floor
    if (currentPrice <= dynamicExitFloor) {
      state = "SELL";
      actionAdvice = "EXECUTE_SELL";
      explanation = `🚨 [동적 트레일링 스탑 이탈] 현재가(${currentPrice.toLocaleString()}원)가 동적 이탈 바닥가(${dynamicExitFloor.toLocaleString()}원)를 하향 이탈하여 매도를 이행합니다.`;
    }
    // Condition B: Hard Emergency Exit (loss > 3.5%)
    else if (pnlPct <= -3.5) {
      state = "EMERGENCY EXIT";
      actionAdvice = "EXECUTE_SELL";
      explanation = `🚨 [긴급 손절 발동] 손실률(${pnlPct.toFixed(2)}%)이 최대 허용 손실 한도(-3.5%)를 하회하여 즉시 매도 처리합니다.`;
    }
    // Condition C: Sell Watch (high risk or momentum breakdown)
    else if (sellRiskPct >= 70 || (pnlPct > 2.0 && ind.macdHist < 0 && ind.rsi14 > 68)) {
      state = "SELL WATCH";
      actionAdvice = "PREPARE_SELL";
      explanation = `⚠️ [매도 경계] 매도 위험도(${sellRiskPct}%) 상승 및 모멘텀 약화 감지. 동적 스탑라인(${dynamicExitFloor.toLocaleString()}원) 감시 중.`;
    }
    // Condition D: Trail Up (strong profit expansion)
    else if (pnlPct >= 3.5) {
      state = "TRAIL UP";
      actionAdvice = "TRAIL_FLOOR_RAISED";
      explanation = `🚀 [트레일링 업] 수익률 +${pnlPct.toFixed(2)}% 달성. 고점 상승에 맞춰 동적 익절 바닥가를 ${dynamicExitFloor.toLocaleString()}원으로 상향 고정합니다.`;
    }
    // Condition E: Profit Hold (positive return)
    else if (pnlPct > 0.5) {
      state = "PROFIT HOLD";
      actionAdvice = "HOLD";
      explanation = `✅ [수익 홀딩] 수익률 +${pnlPct.toFixed(2)}% 유지 중. HH/HL 및 VWAP 지지선 유지 중입니다.`;
    }
    // Condition F: Normal Hold
    else {
      state = "HOLD";
      actionAdvice = "HOLD";
      explanation = `보유 지속 (PnL: ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%). 지지선 내 정상 파동 진행 중입니다.`;
    }

    return {
      symbol: position.symbol,
      state,
      dynamicExitFloor: Number(dynamicExitFloor.toFixed(2)),
      pnlPct: Number(pnlPct.toFixed(2)),
      sellRiskPct,
      actionAdvice,
      explanation,
      scannerIndependent: true, // Post-buy position AI is 100% independent of Scanner AI
      timestamp: new Date().toLocaleTimeString("ko-KR")
    };
  }
}
