// AISTOCK 24 v11 Autonomous Execution Engine
// LIVE path: button preflight -> server KIS order -> ODNO -> real fill confirmation.

import {
  ExecutionStateMachine,
  TradingMode,
  OrderSignal,
  PositionContext,
  StateMachineStatus
} from "./ExecutionStateMachine";
import {
  ExecutionRiskEngine,
  RiskMetrics,
  RiskEvaluationResult
} from "./ExecutionRiskEngine";
import {
  KISBrokerAdapter,
  KISOrderResult,
  KISBalance,
  KISOrderRequest
} from "./KISBrokerAdapter";
import { AdaptiveExitDecisionEngine, MarketBarSnapshot } from "./AdaptiveExitDecisionEngine";

export interface ExecutionEngineLog {
  id: string;
  timestamp: string;
  level: "INFO" | "RISK_PASS" | "RISK_REJECT" | "BUY_EXEC" | "SELL_EXEC" | "EXIT_AI" | "EMERGENCY";
  title: string;
  detail: string;
}

export interface AutonomousEngineStatus {
  stateMachine: StateMachineStatus;
  riskMetrics: RiskMetrics;
  mode: TradingMode;
  liveTradingEnabled: boolean;
  activePosition: PositionContext | null;
  balance: KISBalance | null;
  logs: ExecutionEngineLog[];
  isEngineRunning: boolean;
  totalExecutionsToday: number;
}

export class AutonomousExecutionEngineV11 {
  private stateMachine: ExecutionStateMachine;
  private riskEngine: ExecutionRiskEngine;
  private kisAdapter: KISBrokerAdapter;
  private adaptiveExitEngine = new AdaptiveExitDecisionEngine();
  private isEngineRunning = false;
  private logs: ExecutionEngineLog[] = [];
  private totalExecutionsToday = 0;
  private evaluationInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(status: AutonomousEngineStatus) => void> = [];
  private liveActivationInProgress = false;
  private lastKnownBalance: KISBalance | null = null;
  private logSequence = 0;

  constructor(initialMode: TradingMode = "PAPER") {
    this.stateMachine = new ExecutionStateMachine(initialMode);
    this.riskEngine = new ExecutionRiskEngine();
    this.kisAdapter = new KISBrokerAdapter();
    this.kisAdapter.setExecutionMode(initialMode, false);
    this.stateMachine.subscribe(() => this.notify());
    this.addLog("INFO", "v11 실행 엔진 초기화", `초기모드 ${initialMode} | LIVE는 실계좌 검증 전 잠금`);
  }

  public getStatus(): AutonomousEngineStatus {
    const smStatus = this.stateMachine.getStatus();
    return {
      stateMachine: smStatus,
      riskMetrics: this.riskEngine.getMetrics(),
      mode: smStatus.mode,
      liveTradingEnabled: smStatus.liveTradingEnabled,
      activePosition: smStatus.activePosition,
      balance: this.lastKnownBalance,
      logs: [...this.logs],
      isEngineRunning: this.isEngineRunning,
      totalExecutionsToday: this.totalExecutionsToday
    };
  }

  public subscribe(listener: (status: AutonomousEngineStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    const status = this.getStatus();
    this.listeners.forEach(listener => listener(status));
  }

  private addLog(level: ExecutionEngineLog["level"], title: string, detail: string): void {
    this.logSequence += 1;
    this.logs.unshift({
      id: `LOG_${Date.now()}_${this.logSequence}`,
      timestamp: new Date().toLocaleTimeString("ko-KR"),
      level,
      title,
      detail
    });
    if (this.logs.length > 80) this.logs.pop();
    this.notify();
  }

  /**
   * Called by the existing 실행모드 LIVE button.
   * LIVE is not entered until a real server-side KIS account query succeeds.
   */
  public setTradingMode(mode: TradingMode, enableLiveDualLock = false): void {
    if (mode !== "LIVE") {
      this.kisAdapter.setExecutionMode(mode, false);
      this.stateMachine.setTradingMode(mode, false);
      if (mode === "PAPER") void this.kisAdapter.deactivateLiveSession();
      this.addLog("INFO", "거래 모드 변경", `모드 ${mode} | 실거래 잠금`);
      return;
    }

    if (!enableLiveDualLock) {
      this.kisAdapter.setExecutionMode("PAPER", false);
      this.stateMachine.setTradingMode("PAPER", false);
      void this.kisAdapter.deactivateLiveSession();
      this.addLog("RISK_REJECT", "LIVE 실거래 차단", "LIVE 이중 잠금 요청이 없습니다.");
      return;
    }

    if (this.liveActivationInProgress) return;
    this.liveActivationInProgress = true;
    this.addLog("INFO", "🔐 LIVE 실계좌 검증 시작", "KIS OAuth/실계좌 잔고 조회를 확인합니다.");

    void (async () => {
      try {
        const readiness = await this.kisAdapter.verifyLiveReadiness();
        if (!readiness.ready) {
          this.kisAdapter.setExecutionMode("PAPER", false);
          this.stateMachine.setTradingMode("PAPER", false);
          this.addLog("RISK_REJECT", "⛔ LIVE 활성화 실패", readiness.reason);
          return;
        }

        if (readiness.buyingPower <= 0) {
          this.kisAdapter.setExecutionMode("PAPER", false);
          this.stateMachine.setTradingMode("PAPER", false);
          this.addLog("RISK_REJECT", "⛔ LIVE 활성화 실패", "실계좌 주문가능 예수금이 0원입니다.");
          return;
        }

        this.kisAdapter.setExecutionMode("LIVE", true);
        this.lastKnownBalance = await this.kisAdapter.getBalance();

        if (!this.lastKnownBalance || this.lastKnownBalance.buyingPower <= 0) {
          await this.kisAdapter.deactivateLiveSession();
          this.kisAdapter.setExecutionMode("PAPER", false);
          this.stateMachine.setTradingMode("PAPER", false);
          this.addLog("RISK_REJECT", "⛔ LIVE 활성화 실패", "실계좌 주문가능금액 재확인에 실패했습니다.");
          return;
        }

        this.stateMachine.setTradingMode("LIVE", true);
        this.addLog(
          "INFO",
          "🔴 LIVE 실거래 활성화",
          `KIS 실계좌 검증 완료 | 확인 예수금 ${Math.round(this.lastKnownBalance.buyingPower).toLocaleString()}원`
        );
      } catch (err: any) {
        this.kisAdapter.setExecutionMode("PAPER", false);
        this.stateMachine.setTradingMode("PAPER", false);
        this.addLog("EMERGENCY", "LIVE 활성화 예외", err?.message || String(err));
      } finally {
        this.liveActivationInProgress = false;
      }
    })();
  }

  public setKillSwitch(active: boolean): void {
    this.riskEngine.setKillSwitch(active);
    if (active) {
      this.stateMachine.triggerLock("사용자 긴급 킬스위치 작동");
      void this.kisAdapter.deactivateLiveSession();
      this.addLog("EMERGENCY", "🚨 긴급 킬스위치", "신규 주문 차단 및 LIVE 세션 잠금");
    } else {
      this.stateMachine.unlockAdmin();
      this.addLog("INFO", "🟢 킬스위치 해제", "상태 잠금만 해제되었습니다. LIVE는 다시 검증해야 합니다.");
    }
  }

  public startEngine(): void {
    if (this.isEngineRunning) return;
    this.isEngineRunning = true;
    this.addLog("INFO", "🤖 자율 감시 시작", "스캐너/Risk Gate/체결상태 감시를 시작합니다.");
    this.evaluationInterval = setInterval(() => {
      void this.runEvaluationLoop();
    }, 2000);
    this.notify();
  }

  public stopEngine(): void {
    this.isEngineRunning = false;
    if (this.evaluationInterval) clearInterval(this.evaluationInterval);
    this.evaluationInterval = null;
    this.addLog("INFO", "⏸️ 자율 감시 정지", "신규 평가 루프가 정지되었습니다.");
    this.notify();
  }

  private async runEvaluationLoop(): Promise<void> {
    const smStatus = this.stateMachine.getStatus();
    if (smStatus.currentState === "LOCKED") return;

    // The legacy fallback below fabricates EMA/VWAP/volume. Never use it in LIVE.
    if (smStatus.mode !== "LIVE" && smStatus.currentState === "LONG" && smStatus.activePosition) {
      await this.evaluateAdaptiveExit(smStatus.activePosition);
    }
  }

  public async processCandidateOrder(candidate: {
    symbol: string;
    name: string;
    market: "KOREA" | "US" | "BTC";
    price: number;
    scannerScore: number;
    unifiedShape: string;
    rvol: number;
    executionPower: number;
  }): Promise<{ accepted: boolean; message: string }> {
    let smStatus = this.stateMachine.getStatus();

    if (smStatus.currentState === "COOLDOWN") {
      this.stateMachine.resetToIdle();
      smStatus = this.stateMachine.getStatus();
    }

    if (smStatus.currentState !== "IDLE") {
      return { accepted: false, message: `현재 상태 ${smStatus.currentState}: 신규 주문 불가` };
    }

    if (!Number.isFinite(candidate.price) || candidate.price <= 0) {
      return { accepted: false, message: "검증된 현재가가 없어 주문을 차단했습니다." };
    }

    if (smStatus.mode === "LIVE") {
      if (!smStatus.liveTradingEnabled) {
        return { accepted: false, message: "LIVE 실거래 승인이 없습니다." };
      }
      if (candidate.market !== "KOREA") {
        return { accepted: false, message: "현재 LIVE 자동주문은 국내주식만 검증 완료되었습니다." };
      }
      if (!this.lastKnownBalance || this.lastKnownBalance.buyingPower <= 0) {
        return { accepted: false, message: "실계좌 주문가능금액이 확인되지 않았습니다." };
      }
    }

    const signal: OrderSignal = {
      id: `SIG_${Date.now()}`,
      symbol: candidate.symbol,
      name: candidate.name,
      market: candidate.market,
      signalType: "BUY",
      price: candidate.price,
      convictionScore: candidate.scannerScore,
      timestamp: Date.now(),
      scannerScore: candidate.scannerScore,
      unifiedShape: candidate.unifiedShape,
      reason: "Scanner + Unified Shape + Risk Gate 승인"
    };

    const riskConfig = this.riskEngine.getConfig();
    let qty: number;
    if (smStatus.mode === "LIVE") {
      const notionalCap = Math.min(
        riskConfig.maxPositionValueKRW,
        this.lastKnownBalance!.buyingPower * 0.10
      );
      qty = Math.floor(notionalCap / candidate.price);
      if (qty < 1) {
        return { accepted: false, message: "리스크 한도 기준 주문 가능 수량이 0주입니다." };
      }
    } else {
      qty = candidate.market === "US" ? 10 : 50;
    }

    const orderAmountKRW = candidate.price * qty;
    const orderAmountUSD = candidate.price * qty;
    const riskEval: RiskEvaluationResult = this.riskEngine.evaluateBuyOrderRisk(
      orderAmountKRW,
      orderAmountUSD,
      smStatus.activePosition ? 1 : 0,
      signal.timestamp,
      candidate.market
    );

    if (!riskEval.passed) {
      this.addLog("RISK_REJECT", "🛡️ Risk Gate 주문 차단", riskEval.rejectReason || "Risk Gate");
      return { accepted: false, message: riskEval.rejectReason || "Risk Gate 차단" };
    }

    const transition = this.stateMachine.transitionToBuyPending(signal);
    if (!transition.success) {
      return { accepted: false, message: transition.reason };
    }

    const req: KISOrderRequest = {
      symbol: candidate.symbol,
      name: candidate.name,
      market: candidate.market,
      side: "BUY",
      price: candidate.price,
      qty,
      orderType: "MARKET"
    };

    const orderResult = await this.kisAdapter.placeOrder(req);

    if (orderResult.success && orderResult.status === "FILLED") {
      this.confirmBuy(orderResult, candidate, qty);
      return { accepted: true, message: orderResult.message };
    }

    if (smStatus.mode === "DRY_RUN" && orderResult.success) {
      this.stateMachine.rejectBuyPending("DRY_RUN 완료");
      this.addLog("BUY_EXEC", "🧪 DRY_RUN 완료", orderResult.message);
      return { accepted: true, message: orderResult.message };
    }

    if (
      smStatus.mode === "LIVE" &&
      orderResult.success &&
      (orderResult.status === "PENDING" || orderResult.status === "PARTIAL")
    ) {
      this.addLog("BUY_EXEC", "⏳ LIVE BUY 주문 접수", `${orderResult.message} | 실제 체결 확인 중`);
      void this.monitorBuyFill(orderResult.orderId, req, candidate, qty);
      return { accepted: true, message: orderResult.message };
    }

    this.stateMachine.rejectBuyPending(orderResult.message);
    this.addLog("RISK_REJECT", "❌ BUY 주문 거부", orderResult.message);
    return { accepted: false, message: orderResult.message };
  }

  private confirmBuy(
    result: KISOrderResult,
    candidate: { symbol: string; name: string; market: "KOREA" | "US" | "BTC"; price: number },
    requestedQty: number
  ): void {
    const fillPrice = result.filledAvgPrice > 0 ? result.filledAvgPrice : candidate.price;
    const fillQty = result.filledQty > 0 ? result.filledQty : requestedQty;
    const position: PositionContext = {
      symbol: candidate.symbol,
      name: candidate.name,
      market: candidate.market,
      buyPrice: fillPrice,
      currentPrice: fillPrice,
      qty: fillQty,
      buyTimestamp: Date.now(),
      unrealizedPnLAmt: 0,
      unrealizedPnLPct: 0,
      highPriceSinceBuy: fillPrice,
      trailingExitPrice: Math.round(fillPrice * 0.985),
      orderId: result.orderId
    };
    this.stateMachine.confirmBuyFill(position);
    this.totalExecutionsToday += 1;
    this.addLog("BUY_EXEC", "✅ BUY 실제 체결 확인", result.message);
  }

  private async monitorBuyFill(
    orderId: string,
    req: KISOrderRequest,
    candidate: { symbol: string; name: string; market: "KOREA" | "US" | "BTC"; price: number },
    requestedQty: number
  ): Promise<void> {
    const result = await this.kisAdapter.waitForFinalFill(orderId, req);
    if (result.status === "FILLED") {
      this.confirmBuy(result, candidate, requestedQty);
      return;
    }

    if (result.status === "REJECTED" || result.status === "CANCELLED") {
      this.stateMachine.rejectBuyPending(result.message);
      this.addLog("RISK_REJECT", "LIVE BUY 미체결 종료", result.message);
      return;
    }

    // Partial/unknown exposure can exist. Freeze new orders until reconciliation.
    this.stateMachine.triggerLock(`ODNO ${orderId} 체결 상태 불확실. 계좌 대조 전 신규 주문 금지.`);
    this.addLog("EMERGENCY", "🚨 LIVE BUY 체결상태 불확실", result.message);
  }

  public async evaluateAdaptiveExit(position: PositionContext): Promise<void> {
    if (this.stateMachine.getStatus().mode === "LIVE") return;

    // Legacy PAPER-only fallback. LIVE requires provider-derived completed bars.
    const bar: MarketBarSnapshot = {
      open: position.currentPrice,
      high: Math.max(position.highPriceSinceBuy, position.currentPrice),
      low: position.currentPrice,
      close: position.currentPrice,
      volume: 100000,
      vwap: position.buyPrice * 0.998,
      ema5: position.buyPrice * 0.995,
      ema20: position.buyPrice * 0.985,
      macdHist: 0.5,
      rsi: 55,
      dmiPlus: 25,
      dmiMinus: 15,
      buyVolumeRatio: 0.6,
      sellVolumeRatio: 0.4,
      isCompletedBar: true
    };
    await this.evaluateAdaptiveExitWithBar(position, bar);
  }

  public async evaluateAdaptiveExitWithBar(position: PositionContext, bar: MarketBarSnapshot): Promise<void> {
    if (
      !bar ||
      bar.isCompletedBar !== true ||
      !Number.isFinite(bar.close) ||
      bar.close <= 0 ||
      !Number.isFinite(bar.volume) ||
      bar.volume < 0
    ) {
      return;
    }

    this.stateMachine.updatePositionPrice(bar.close);
    const pos = {
      symbol: position.symbol,
      name: position.name,
      market: position.market,
      buyPrice: position.buyPrice,
      currentPrice: bar.close,
      qty: position.qty,
      buyTimestamp: position.buyTimestamp,
      highPriceSinceBuy: Math.max(position.highPriceSinceBuy, bar.high),
      trailingExitPrice: position.trailingExitPrice
    };

    const result = this.adaptiveExitEngine.evaluateExit(pos, bar);
    if (result.shouldExit) await this.executeSellOrder(position, result.primaryReason);
  }

  public async executeSellOrder(position: PositionContext, reason: string): Promise<void> {
    const signal: OrderSignal = {
      id: `SELL_SIG_${Date.now()}`,
      symbol: position.symbol,
      name: position.name,
      market: position.market,
      signalType: "SELL",
      price: position.currentPrice,
      convictionScore: 90,
      timestamp: Date.now(),
      scannerScore: 90,
      unifiedShape: "Adaptive Exit Breakdown",
      reason
    };

    const transition = this.stateMachine.transitionToSellPending(signal);
    if (!transition.success) return;

    const req: KISOrderRequest = {
      symbol: position.symbol,
      name: position.name,
      market: position.market,
      side: "SELL",
      price: position.currentPrice,
      qty: position.qty,
      orderType: "MARKET"
    };

    const result = await this.kisAdapter.placeOrder(req);
    if (result.success && result.status === "FILLED") {
      this.confirmSell(result, position, reason);
      return;
    }

    if (
      this.stateMachine.getStatus().mode === "LIVE" &&
      result.success &&
      (result.status === "PENDING" || result.status === "PARTIAL")
    ) {
      this.addLog("SELL_EXEC", "⏳ LIVE SELL 주문 접수", `${result.message} | 실제 체결 확인 중`);
      void this.monitorSellFill(result.orderId, req, position, reason);
      return;
    }

    this.stateMachine.rejectSellPending(result.message);
    this.addLog("RISK_REJECT", "SELL 주문 거부", result.message);
  }

  private confirmSell(result: KISOrderResult, position: PositionContext, reason: string): void {
    const pnlKRW = Math.round(position.unrealizedPnLAmt);
    this.riskEngine.recordTradeResult(pnlKRW);
    this.stateMachine.confirmSellFill(15000);
    this.totalExecutionsToday += 1;
    this.addLog(
      "SELL_EXEC",
      `✅ SELL 실제 체결 확인 (${pnlKRW >= 0 ? "+" : ""}${pnlKRW.toLocaleString()}원)`,
      `${result.message} | 사유: ${reason}`
    );
  }

  private async monitorSellFill(
    orderId: string,
    req: KISOrderRequest,
    position: PositionContext,
    reason: string
  ): Promise<void> {
    const result = await this.kisAdapter.waitForFinalFill(orderId, req);
    if (result.status === "FILLED") {
      this.confirmSell(result, position, reason);
      return;
    }

    if (result.status === "REJECTED" || result.status === "CANCELLED") {
      this.stateMachine.rejectSellPending(result.message);
      this.addLog("RISK_REJECT", "LIVE SELL 미체결 종료", result.message);
      return;
    }

    this.stateMachine.triggerLock(`SELL ODNO ${orderId} 체결 상태 불확실. 계좌 대조 필요.`);
    this.addLog("EMERGENCY", "🚨 LIVE SELL 체결상태 불확실", result.message);
  }
}
