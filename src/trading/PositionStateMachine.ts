// ----------------------------------------------------------------------
// POSITION STATE MACHINE V20 RC6 (TRUTH-FIRST CANONICAL LIFECYCLE ENGINE)
// Evidence-Driven State Transitions, Multi-Factor Profit Hold, Dwell & Hysteresis
// ----------------------------------------------------------------------

import { ExitEvidence } from "../services/ExitEvidenceEngine";

export type PositionState =
  | "FLAT"
  | "BUY_PENDING"
  | "BUY_ACKNOWLEDGED"
  | "BUY_PARTIAL"
  | "BUY_FILLED"
  | "HOLD"
  | "PROFIT_HOLD"
  | "SELL_WATCH"
  | "SELL_PENDING"
  | "SELL_ACKNOWLEDGED"
  | "SELL_PARTIAL"
  | "CLOSED";

export interface PositionQuantityState {
  requestedBuyQty: number;
  buyFilledQty: number;
  currentPositionQty: number;
  requestedSellQty: number;
  sellFilledQty: number;
  remainingPositionQty: number;
}

export interface PositionContextV191 {
  state: PositionState;
  symbol: string;
  strategyId: string;
  entryPrice: number | null;
  currentPrice: number;
  highestPriceSinceBuy: number | null;
  initialStopPrice: number | null;
  trailingFloorPrice: number | null;
  quantities: PositionQuantityState;
  exitEvidence: ExitEvidence | null;
  watchThreshold?: number;
  recoveryThreshold?: number;
  sellThreshold?: number;
  profitActivationPct?: number;
  profitReleasePct?: number;
  /** Qualifying non-catastrophic exit evidence must persist this long before SELL_WATCH. */
  sellWatchDwellMs?: number;
  /** Deterministic clock injection for tests. */
  nowMs?: number;
}

export class PositionStateMachine {
  private static sellWatchEvidenceSince = new Map<string, number>();

  public static updateTrailingFloor(currentFloor: number | null, candidateFloor: number | null): number | null {
    if (candidateFloor == null || candidateFloor <= 0) return currentFloor;
    if (currentFloor == null || currentFloor <= 0) return candidateFloor;
    return Math.max(currentFloor, candidateFloor);
  }

  public static resetEvidenceDwell(symbol?: string, strategyId?: string): void {
    if (!symbol) {
      this.sellWatchEvidenceSince.clear();
      return;
    }
    const prefix = strategyId ? `${symbol}|${strategyId}` : `${symbol}|`;
    for (const key of Array.from(this.sellWatchEvidenceSince.keys())) {
      if (strategyId ? key === prefix : key.startsWith(prefix)) this.sellWatchEvidenceSince.delete(key);
    }
  }

  public static evaluateNextState(ctx: PositionContextV191): PositionState {
    const {
      state,
      symbol,
      strategyId,
      entryPrice,
      currentPrice,
      highestPriceSinceBuy,
      quantities,
      exitEvidence,
      watchThreshold = 35,
      recoveryThreshold = 25,
      sellThreshold = 65,
      profitActivationPct = 0.8,
      profitReleasePct = 0.3,
      sellWatchDwellMs = 3000,
      nowMs = Date.now()
    } = ctx;

    const dwellKey = `${symbol}|${strategyId}`;
    const { remainingPositionQty, buyFilledQty, requestedBuyQty, sellFilledQty } = quantities;
    const independentEvidences = exitEvidence ? exitEvidence.structuralCount + exitEvidence.warningCount : 0;
    const hasWatchEvidence = Boolean(
      exitEvidence && exitEvidence.exitRiskScore >= watchThreshold && independentEvidences >= 2
    );
    const isCatastrophicExit = exitEvidence
      ? (exitEvidence.hardStopHit || exitEvidence.trailingStopHit || exitEvidence.exitRiskScore >= sellThreshold)
      : false;

    const clearDwell = () => this.sellWatchEvidenceSince.delete(dwellKey);
    const watchEvidenceMatured = (): boolean => {
      if (!hasWatchEvidence) {
        clearDwell();
        return false;
      }
      if (sellWatchDwellMs <= 0) return true;
      const startedAt = this.sellWatchEvidenceSince.get(dwellKey);
      if (startedAt == null || nowMs < startedAt) {
        this.sellWatchEvidenceSince.set(dwellKey, nowMs);
        return false;
      }
      return nowMs - startedAt >= sellWatchDwellMs;
    };

    const currentProfitPct = entryPrice != null && entryPrice > 0
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : 0;
    const peakPrice = highestPriceSinceBuy ?? currentPrice;
    const peakProfitPct = entryPrice != null && entryPrice > 0
      ? ((peakPrice - entryPrice) / entryPrice) * 100
      : 0;
    const givebackPct = peakProfitPct > 0 ? peakProfitPct - currentProfitPct : 0;

    const qualifiesForProfitHold =
      entryPrice != null &&
      currentProfitPct >= profitActivationPct &&
      givebackPct < Math.max(1.5, peakProfitPct * 0.5) &&
      (!exitEvidence || exitEvidence.exitRiskScore < watchThreshold);

    const retainsProfitHold =
      entryPrice != null &&
      currentProfitPct >= profitReleasePct &&
      (!exitEvidence || exitEvidence.exitRiskScore < watchThreshold);

    switch (state) {
      case "FLAT":
        clearDwell();
        return "FLAT";
      case "BUY_PENDING": return "BUY_PENDING";
      case "BUY_ACKNOWLEDGED":
        if (buyFilledQty >= requestedBuyQty && requestedBuyQty > 0) return "BUY_FILLED";
        if (buyFilledQty > 0) return "BUY_PARTIAL";
        return "BUY_ACKNOWLEDGED";
      case "BUY_PARTIAL":
        return buyFilledQty >= requestedBuyQty && requestedBuyQty > 0 ? "BUY_FILLED" : "BUY_PARTIAL";
      case "BUY_FILLED": return "HOLD";

      case "HOLD": {
        if (remainingPositionQty <= 0) { clearDwell(); return "CLOSED"; }
        if (isCatastrophicExit) { clearDwell(); return "SELL_PENDING"; }
        if (watchEvidenceMatured()) return "SELL_WATCH";
        if (qualifiesForProfitHold) return "PROFIT_HOLD";
        return "HOLD";
      }

      case "PROFIT_HOLD": {
        if (remainingPositionQty <= 0) { clearDwell(); return "CLOSED"; }
        if (isCatastrophicExit) { clearDwell(); return "SELL_PENDING"; }
        if (watchEvidenceMatured()) return "SELL_WATCH";
        if (!retainsProfitHold) return "HOLD";
        return "PROFIT_HOLD";
      }

      case "SELL_WATCH": {
        if (remainingPositionQty <= 0) { clearDwell(); return "CLOSED"; }
        if (isCatastrophicExit) { clearDwell(); return "SELL_PENDING"; }
        if (!exitEvidence || exitEvidence.exitRiskScore < recoveryThreshold || independentEvidences < 2) {
          clearDwell();
          return retainsProfitHold ? "PROFIT_HOLD" : "HOLD";
        }
        return "SELL_WATCH";
      }

      case "SELL_PENDING": return "SELL_PENDING";
      case "SELL_ACKNOWLEDGED":
        if (remainingPositionQty === 0 && sellFilledQty > 0) { clearDwell(); return "CLOSED"; }
        if (sellFilledQty > 0) return "SELL_PARTIAL";
        return "SELL_ACKNOWLEDGED";
      case "SELL_PARTIAL":
        if (remainingPositionQty === 0 && sellFilledQty > 0) { clearDwell(); return "CLOSED"; }
        return "SELL_PARTIAL";
      case "CLOSED":
        clearDwell();
        return "CLOSED";
      default:
        clearDwell();
        return "FLAT";
    }
  }
}
