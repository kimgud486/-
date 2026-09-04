// AISTOCK v12.1 Master Orchestrator Patch Service
// Connects RealMarketIndicatorProvider, UnifiedBuyGateV121, BrokerApiClientV121, and AdaptiveExitDecisionEngineV121 into a single execution pipeline.

import { ExecutionStateMachine, PositionContext } from "../v11/ExecutionStateMachine";
import { RealMarketIndicatorProvider, OHLCVBar } from "./RealMarketIndicatorProvider";
import { UnifiedBuyGateV121, CandidateBuySignalV121 } from "./UnifiedBuyGateV121";
import { BrokerApiClientV121, ExecutionModeV121 } from "./BrokerApiClientV121";
import { AdaptiveExitDecisionEngineV121, ExitDecisionResultV121, CompletedMarketBar } from "../v11/AdaptiveExitDecisionEngineV121";

export interface PipelinePatchStatusV121 {
  version: string;
  mode: ExecutionModeV121;
  liveTradingEnabled: boolean;
  activePosition: PositionContext | null;
  logs: Array<{ id: string; timestamp: string; level: string; title: string; detail: string }>;
  totalExecutions: number;
}

export class UnifiedTradingPipelinePatchV121 {
  private static instance: UnifiedTradingPipelinePatchV121 | null = null;

  private stateMachine: ExecutionStateMachine;
  private buyGate: UnifiedBuyGateV121;
  private brokerClient: BrokerApiClientV121;
  private adaptiveExitEngine: AdaptiveExitDecisionEngineV121;

  private mode: ExecutionModeV121;
  private liveTradingEnabled: boolean;
  private logs: Array<{ id: string; timestamp: string; level: string; title: string; detail: string }> = [];
  private totalExecutions: number = 0;

  constructor(mode: ExecutionModeV121 = "PAPER", liveTradingEnabled: boolean = false) {
    this.mode = mode;
    this.liveTradingEnabled = liveTradingEnabled;
    this.stateMachine = new ExecutionStateMachine(mode === "LIVE" ? "LIVE" : "PAPER");
    this.buyGate = new UnifiedBuyGateV121(mode, liveTradingEnabled);
    this.brokerClient = new BrokerApiClientV121(mode, liveTradingEnabled);
    this.adaptiveExitEngine = new AdaptiveExitDecisionEngineV121();

    this.addLog("INFO", "v12.1 Unified Pipeline Patch 패치 가동", `모드: ${mode} | 실거래 잠금: ${liveTradingEnabled ? "ON" : "OFF"}`);
  }

  public static getInstance(mode: ExecutionModeV121 = "PAPER"): UnifiedTradingPipelinePatchV121 {
    if (!UnifiedTradingPipelinePatchV121.instance) {
      UnifiedTradingPipelinePatchV121.instance = new UnifiedTradingPipelinePatchV121(mode);
    }
    return UnifiedTradingPipelinePatchV121.instance;
  }

  public setMode(mode: ExecutionModeV121, liveTradingEnabled: boolean = false) {
    this.mode = mode;
    this.liveTradingEnabled = liveTradingEnabled;
    this.buyGate.setMode(mode, liveTradingEnabled);
    this.brokerClient.setMode(mode, liveTradingEnabled);
    this.stateMachine.setTradingMode(mode === "LIVE" ? "LIVE" : "PAPER", liveTradingEnabled);
    this.addLog("INFO", "v12.1 실행 모드 변경", `모드: ${mode} | 실거래 이중잠금: ${liveTradingEnabled ? "ON" : "OFF"}`);
  }

  private addLog(level: string, title: string, detail: string) {
    this.logs.unshift({
      id: `LOG_V121_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString("ko-KR"),
      level,
      title,
      detail
    });
    if (this.logs.length > 100) this.logs.pop();
  }

  public getStatus(): PipelinePatchStatusV121 {
    const smStatus = this.stateMachine.getStatus();
    return {
      version: "v12.1",
      mode: this.mode,
      liveTradingEnabled: this.liveTradingEnabled,
      activePosition: smStatus.activePosition,
      logs: [...this.logs],
      totalExecutions: this.totalExecutions
    };
  }

  /**
   * 1. Single Mandatory BUY Gate Execution
   */
  public async submitBuyCandidate(candidate: CandidateBuySignalV121): Promise<{ success: boolean; message: string }> {
    const res = await this.buyGate.processBuyGate(candidate, this.stateMachine);

    if (res.passed) {
      this.totalExecutions += 1;
      this.addLog("BUY_EXEC", "✅ v12.1 Unified BUY Gate 체결 승인", `[${candidate.name}] ${res.orderResult?.message || "주문 성공"}`);
      return { success: true, message: res.orderResult?.message || "주문 체결 성공" };
    } else {
      this.addLog("RISK_REJECT", "⛔ v12.1 Unified BUY Gate 거부", res.rejectReason || "조건 미달");
      return { success: false, message: res.rejectReason || "주문 거부" };
    }
  }

  /**
   * 2. Completed Bar Processing with Real Indicators & Adaptive Exit AI
   */
  public processCompletedBar(
    symbol: string,
    bars: OHLCVBar[]
  ): ExitDecisionResultV121 | null {
    const smStatus = this.stateMachine.getStatus();
    if (smStatus.currentState !== "LONG" || !smStatus.activePosition) {
      return null;
    }

    const pos = smStatus.activePosition;
    if (pos.symbol !== symbol) return null;

    if (!bars || bars.length === 0) return null;

    const latestBar = bars[bars.length - 1];
    this.stateMachine.updatePositionPrice(latestBar.close);

    // Calculate real indicators from OHLCV bar series
    const indicators = RealMarketIndicatorProvider.calculateIndicators(bars);

    const completedBar: CompletedMarketBar = {
      timestamp: latestBar.timestamp,
      open: latestBar.open,
      high: latestBar.high,
      low: latestBar.low,
      close: latestBar.close,
      volume: latestBar.volume,
      isCompletedBar: true,
      indicators
    };

    const posV121 = {
      symbol: pos.symbol,
      name: pos.name,
      market: pos.market,
      buyPrice: pos.buyPrice,
      currentPrice: latestBar.close,
      qty: pos.qty,
      buyTimestamp: pos.buyTimestamp,
      highPriceSinceBuy: Math.max(pos.highPriceSinceBuy, latestBar.high),
      trailingExitPrice: pos.trailingExitPrice
    };

    const exitEval = this.adaptiveExitEngine.evaluateExitOnCompletedBar(posV121, completedBar);

    if (exitEval.shouldExit) {
      this.executeSellOrder(pos, exitEval.primaryReason);
    } else {
      this.addLog("EXIT_AI", `📊 Adaptive Exit 모니터링 (${exitEval.exitType})`, exitEval.primaryReason);
    }

    return exitEval;
  }

  private async executeSellOrder(pos: PositionContext, reason: string) {
    this.addLog("SELL_EXEC", `📉 SELL 주문 제출 (${pos.name})`, reason);

    const orderRes = await this.brokerClient.placeOrder({
      symbol: pos.symbol,
      name: pos.name,
      market: pos.market,
      side: "SELL",
      price: pos.currentPrice,
      qty: pos.qty,
      orderType: "MARKET"
    });

    if (orderRes.success && orderRes.status === "FILLED") {
      const pnlAmt = Math.round((pos.currentPrice - pos.buyPrice) * pos.qty);
      this.stateMachine.confirmSellFill(30000);
      this.addLog("SELL_EXEC", "✅ SELL 체결 완료 (청산 완료)", `수익금: ${pnlAmt.toLocaleString()}원 | ${reason}`);
    } else {
      this.addLog("EMERGENCY", "❌ SELL 주문 실패", orderRes.message);
    }
  }
}
