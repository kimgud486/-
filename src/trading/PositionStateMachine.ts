// ----------------------------------------------------------------------
// POSITION STATE MACHINE V3 (AISTOCK V18 CANONICAL LIFECYCLE ENGINE)
// Evidence-Driven State Transitions & Broker Event-Synced Quantities
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

export interface PositionContextV18 {
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

  watchThreshold?: number; // default 35
  sellThreshold?: number;  // default 65
}

export class PositionStateMachine {
  /**
   * Evaluate canonical position state transition
   */
  public static evaluateNextState(ctx: PositionContextV18): PositionState {
    const {
      state,
      entryPrice,
      currentPrice,
      quantities,
      exitEvidence,
      watchThreshold = 35,
      sellThreshold = 65
    } = ctx;

    const { remainingPositionQty, buyFilledQty, requestedBuyQty, sellFilledQty } = quantities;

    switch (state) {
      case "FLAT":
        return "FLAT";

      case "BUY_PENDING":
        return "BUY_PENDING"; // Awaits Broker ACK or Fill event

      case "BUY_ACKNOWLEDGED":
        if (buyFilledQty >= requestedBuyQty && requestedBuyQty > 0) return "BUY_FILLED";
        if (buyFilledQty > 0) return "BUY_PARTIAL";
        return "BUY_ACKNOWLEDGED";

      case "BUY_PARTIAL":
        if (buyFilledQty >= requestedBuyQty && requestedBuyQty > 0) return "BUY_FILLED";
        return "BUY_PARTIAL";

      case "BUY_FILLED":
        return "HOLD";

      case "HOLD": {
        if (remainingPositionQty <= 0) return "CLOSED";
        if (!exitEvidence) return "HOLD";

        if (exitEvidence.hardStopHit || exitEvidence.trailingStopHit || exitEvidence.exitRiskScore >= sellThreshold) {
          return "SELL_PENDING";
        }
        if (exitEvidence.exitRiskScore >= watchThreshold) {
          return "SELL_WATCH";
        }
        if (entryPrice != null && currentPrice > entryPrice && exitEvidence.exitRiskScore < watchThreshold) {
          return "PROFIT_HOLD";
        }
        return "HOLD";
      }

      case "PROFIT_HOLD": {
        if (remainingPositionQty <= 0) return "CLOSED";
        if (!exitEvidence) return "PROFIT_HOLD";

        if (exitEvidence.hardStopHit || exitEvidence.trailingStopHit || exitEvidence.exitRiskScore >= sellThreshold) {
          return "SELL_PENDING";
        }
        if (exitEvidence.exitRiskScore >= watchThreshold) {
          return "SELL_WATCH";
        }
        return "PROFIT_HOLD";
      }

      case "SELL_WATCH": {
        if (remainingPositionQty <= 0) return "CLOSED";
        if (!exitEvidence) return "SELL_WATCH";

        if (exitEvidence.hardStopHit || exitEvidence.trailingStopHit || exitEvidence.exitRiskScore >= sellThreshold) {
          return "SELL_PENDING";
        }
        // Recovery back to HOLD / PROFIT_HOLD if exit risk drops below watch threshold
        if (exitEvidence.exitRiskScore < watchThreshold) {
          return entryPrice != null && currentPrice > entryPrice ? "PROFIT_HOLD" : "HOLD";
        }
        return "SELL_WATCH";
      }

      case "SELL_PENDING":
        return "SELL_PENDING"; // Awaits Broker ACK or Fill event

      case "SELL_ACKNOWLEDGED":
        if (remainingPositionQty === 0 && sellFilledQty > 0) return "CLOSED";
        if (sellFilledQty > 0) return "SELL_PARTIAL";
        return "SELL_ACKNOWLEDGED";

      case "SELL_PARTIAL":
        if (remainingPositionQty === 0 && sellFilledQty > 0) return "CLOSED";
        return "SELL_PARTIAL";

      case "CLOSED":
        return "CLOSED";

      default:
        return "FLAT";
    }
  }
}
