// ----------------------------------------------------------------------
// POSITION STATE MACHINE V2 (V16.1 REAL TRADING INTELLIGENCE)
// Formal 12-State Lifecycle State Transitions for Position & Trailing Execution
// ----------------------------------------------------------------------

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

export interface PositionContext {
  state: PositionState;
  symbol: string;
  entryPrice: number | null;
  currentPrice: number;
  highestPrice: number | null;
  trailingStop: number | null;
  structureValid: boolean;
  aboveVWAP: boolean;
  macdHealthy: boolean;
  momentumHealthy: boolean;
  orderFlowHealthy: boolean;
  filledQuantity: number;
  targetQuantity: number;
}

export class PositionStateMachine {
  /**
   * Evaluate next position state based on price action, technical integrity, and broker fill status
   */
  public static evaluateNextState(ctx: PositionContext): PositionState {
    const {
      state,
      entryPrice,
      currentPrice,
      trailingStop,
      structureValid,
      aboveVWAP,
      macdHealthy,
      momentumHealthy,
      orderFlowHealthy,
      filledQuantity,
      targetQuantity
    } = ctx;

    switch (state) {
      case "FLAT":
        return "FLAT";

      case "BUY_PENDING":
        return "BUY_PENDING"; // Awaits broker ACK or partial fill

      case "BUY_ACKNOWLEDGED":
        if (filledQuantity >= targetQuantity && targetQuantity > 0) return "BUY_FILLED";
        if (filledQuantity > 0) return "BUY_PARTIAL";
        return "BUY_ACKNOWLEDGED";

      case "BUY_PARTIAL":
        if (filledQuantity >= targetQuantity && targetQuantity > 0) return "BUY_FILLED";
        return "BUY_PARTIAL";

      case "BUY_FILLED":
        return "HOLD";

      case "HOLD":
        if (!structureValid || (trailingStop != null && currentPrice <= trailingStop)) {
          return "SELL_PENDING";
        }
        if (!momentumHealthy || !aboveVWAP || !macdHealthy) {
          return "SELL_WATCH";
        }
        if (entryPrice != null && currentPrice > entryPrice) {
          return "PROFIT_HOLD";
        }
        return "HOLD";

      case "PROFIT_HOLD":
        if (!structureValid || (trailingStop != null && currentPrice <= trailingStop)) {
          return "SELL_PENDING";
        }
        if (!momentumHealthy || !aboveVWAP || !orderFlowHealthy) {
          return "SELL_WATCH";
        }
        return "PROFIT_HOLD";

      case "SELL_WATCH":
        if (!structureValid || (trailingStop != null && currentPrice <= trailingStop)) {
          return "SELL_PENDING";
        }
        if (momentumHealthy && aboveVWAP && macdHealthy) {
          return entryPrice != null && currentPrice > entryPrice ? "PROFIT_HOLD" : "HOLD";
        }
        return "SELL_WATCH";

      case "SELL_PENDING":
        return "SELL_PENDING"; // Awaits broker sell ACK

      case "SELL_ACKNOWLEDGED":
        if (filledQuantity <= 0) return "CLOSED";
        return "SELL_PARTIAL";

      case "SELL_PARTIAL":
        if (filledQuantity <= 0) return "CLOSED";
        return "SELL_PARTIAL";

      case "CLOSED":
        return "CLOSED";

      default:
        return "FLAT";
    }
  }
}
