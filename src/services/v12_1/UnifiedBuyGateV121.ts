// AISTOCK v12.1 Unified Mandatory BUY Gate
// Enforces a single master decision gate for ALL BUY signals across scanners, AI brains, and manual auto-buys.

import { ExecutionStateMachine } from "../v11/ExecutionStateMachine";
import { ExecutionRiskEngine, RiskEvaluationResult } from "../v11/ExecutionRiskEngine";
import { BrokerApiClientV121, BrokerOrderResultV121, ExecutionModeV121 } from "./BrokerApiClientV121";

export interface CandidateBuySignalV121 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  price: number;
  scannerScore: number;
  shapeScore: number;
  confirmationScore: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  aiReason: string;
  dataValid?: boolean;
  dataQuality?: "NORMAL" | "INSUFFICIENT_DATA" | "STALE_DATA" | "UNCOMPLETED_BAR" | "API_ERROR";
  dataQualityReason?: string;
}

export interface BuyGateEvaluationResult {
  passed: boolean;
  scoreCheckPassed: boolean;
  riskCheckPassed: boolean;
  stateCheckPassed: boolean;
  rejectReason?: string;
  orderResult?: BrokerOrderResultV121;
}

export class UnifiedBuyGateV121 {
  private riskEngine: ExecutionRiskEngine;
  private brokerClient: BrokerApiClientV121;

  constructor(mode: ExecutionModeV121 = "PAPER", liveTradingEnabled: boolean = false) {
    this.riskEngine = new ExecutionRiskEngine();
    this.brokerClient = new BrokerApiClientV121(mode, liveTradingEnabled);
  }

  public setMode(mode: ExecutionModeV121, liveTradingEnabled: boolean = false) {
    this.brokerClient.setMode(mode, liveTradingEnabled);
  }

  /**
   * Evaluate and process Buy Signal through the mandatory Unified Gate
   */
  public async processBuyGate(
    signal: CandidateBuySignalV121,
    stateMachine: ExecutionStateMachine
  ): Promise<BuyGateEvaluationResult> {
    const smStatus = stateMachine.getStatus();

    // 1. Single Active Position & State Gate Check
    if (smStatus.currentState !== "IDLE") {
      return {
        passed: false,
        scoreCheckPassed: false,
        riskCheckPassed: false,
        stateCheckPassed: false,
        rejectReason: `⛔ [단일 관문 차단] 현재 파이프라인이 IDLE 상태가 아닙니다 (${smStatus.currentState}). 이중 주문 방지.`
      };
    }

    // 1.5 FAIL-CLOSED DATA QUALITY CHECK (v12.2 Mandate)
    if (signal.dataValid === false) {
      return {
        passed: false,
        scoreCheckPassed: false,
        riskCheckPassed: false,
        stateCheckPassed: true,
        rejectReason: `⛔ [데이터 품질 미달 (Fail-Closed)] ${signal.dataQualityReason || "OHLCV 캔들 부족 또는 지연된 데이터로 매매가 차단되었습니다."}`
      };
    }

    // 2. Score Threshold Gate Check
    // Scanner Score >= 72, Shape Score >= 72, Confirmation Score >= 68, Direction == BULLISH
    if (signal.scannerScore < 72) {
      return {
        passed: false,
        scoreCheckPassed: false,
        riskCheckPassed: false,
        stateCheckPassed: true,
        rejectReason: `⛔ [점수 미달] Scanner Score (${signal.scannerScore})가 기준치 72점 미만입니다.`
      };
    }

    if (signal.shapeScore < 72) {
      return {
        passed: false,
        scoreCheckPassed: false,
        riskCheckPassed: false,
        stateCheckPassed: true,
        rejectReason: `⛔ [점수 미달] Shape Score (${signal.shapeScore})가 기준치 72점 미만입니다.`
      };
    }

    if (signal.confirmationScore < 68) {
      return {
        passed: false,
        scoreCheckPassed: false,
        riskCheckPassed: false,
        stateCheckPassed: true,
        rejectReason: `⛔ [점수 미달] Confirmation Score (${signal.confirmationScore})가 기준치 68점 미만입니다.`
      };
    }

    if (signal.direction !== "BULLISH") {
      return {
        passed: false,
        scoreCheckPassed: false,
        riskCheckPassed: false,
        stateCheckPassed: true,
        rejectReason: `⛔ [방향성 미충족] 추세 방향(${signal.direction})이 BULLISH가 아닙니다.`
      };
    }

    // 3. Risk Gate Evaluation
    const qty = signal.market === "US" ? 10 : 50;
    const totalOrderAmountKRW = signal.price * qty;

    const riskEval: RiskEvaluationResult = this.riskEngine.evaluateBuyOrderRisk(
      totalOrderAmountKRW,
      totalOrderAmountKRW,
      smStatus.activePosition ? 1 : 0,
      Date.now(),
      signal.market
    );

    if (!riskEval.passed) {
      return {
        passed: false,
        scoreCheckPassed: true,
        riskCheckPassed: false,
        stateCheckPassed: true,
        rejectReason: `🛡️ [Risk Gate 차단] ${riskEval.rejectReason || "위험 한도 초과"}`
      };
    }

    // 4. Transition State Machine to BUY_PENDING
    const transitionRes = stateMachine.transitionToBuyPending({
      id: `SIG_GATE_V121_${Date.now()}`,
      symbol: signal.symbol,
      name: signal.name,
      market: signal.market,
      signalType: "BUY",
      price: signal.price,
      convictionScore: signal.scannerScore,
      timestamp: Date.now(),
      scannerScore: signal.scannerScore,
      unifiedShape: "UNIFIED_BUY_GATE_PASS",
      reason: signal.aiReason
    });

    if (!transitionRes.success) {
      return {
        passed: false,
        scoreCheckPassed: true,
        riskCheckPassed: true,
        stateCheckPassed: false,
        rejectReason: `⛔ [상태 전이 실패] ${transitionRes.reason}`
      };
    }

    // 5. Dispatch Order via Broker API Client
    const orderRes: BrokerOrderResultV121 = await this.brokerClient.placeOrder({
      symbol: signal.symbol,
      name: signal.name,
      market: signal.market,
      side: "BUY",
      price: signal.price,
      qty,
      orderType: "MARKET"
    });

    if (orderRes.success && orderRes.status === "FILLED") {
      stateMachine.confirmBuyFill({
        symbol: signal.symbol,
        name: signal.name,
        market: signal.market,
        buyPrice: orderRes.filledAvgPrice || signal.price,
        currentPrice: orderRes.filledAvgPrice || signal.price,
        qty: orderRes.filledQty || qty,
        buyTimestamp: Date.now(),
        unrealizedPnLAmt: 0,
        unrealizedPnLPct: 0,
        highPriceSinceBuy: orderRes.filledAvgPrice || signal.price,
        trailingExitPrice: Math.round((orderRes.filledAvgPrice || signal.price) * 0.985),
        orderId: orderRes.orderId
      });

      return {
        passed: true,
        scoreCheckPassed: true,
        riskCheckPassed: true,
        stateCheckPassed: true,
        orderResult: orderRes
      };
    } else {
      stateMachine.rejectBuyPending(orderRes.message);
      return {
        passed: false,
        scoreCheckPassed: true,
        riskCheckPassed: true,
        stateCheckPassed: true,
        rejectReason: orderRes.message,
        orderResult: orderRes
      };
    }
  }
}
