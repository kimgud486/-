// ----------------------------------------------------------------------
// POSITION STATE MACHINE (V16 REAL TRADING INTELLIGENCE)
// Formal Lifecycle State Transitions for Position & Trailing Execution
// ----------------------------------------------------------------------

export type PositionState =
  | "FLAT"
  | "BUY_PENDING"
  | "BUY_FILLED"
  | "HOLD"
  | "PROFIT_HOLD"
  | "SELL_WATCH"
  | "SELL_PENDING"
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
}

export class PositionStateMachine {
  /**
   * Evaluate next position state based on price action and technical integrity
   */
  public static evaluateNextState(ctx: PositionContext): PositionState {
    const {
      state,
      entryPrice,
      currentPrice,
      highestPrice,
      trailingStop,
      structureValid,
      aboveVWAP,
      macdHealthy,
      momentumHealthy,
      orderFlowHealthy
    } = ctx;

    // 1. FLAT state remains FLAT until order intent is created
    if (state === "FLAT") {
      return "FLAT";
    }

    // 2. BUY_PENDING awaits Broker ACK + Fill Verification
    if (state === "BUY_PENDING") {
      return "BUY_PENDING"; // Transits to BUY_FILLED only via verified fill callback
    }

    // 3. BUY_FILLED immediately transits to HOLD
    if (state === "BUY_FILLED") {
      return "HOLD";
    }

    // 4. HOLD state evaluation
    if (state === "HOLD") {
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
    }

    // 5. PROFIT_HOLD state evaluation (Trailing Profit Protection)
    if (state === "PROFIT_HOLD") {
      if (!structureValid || (trailingStop != null && currentPrice <= trailingStop)) {
        return "SELL_PENDING";
      }
      if (!momentumHealthy || !aboveVWAP || !orderFlowHealthy) {
        return "SELL_WATCH";
      }
      return "PROFIT_HOLD";
    }

    // 6. SELL_WATCH state evaluation
    if (state === "SELL_WATCH") {
      if (!structureValid || (trailingStop != null && currentPrice <= trailingStop)) {
        return "SELL_PENDING";
      }
      if (momentumHealthy && aboveVWAP && macdHealthy) {
        return entryPrice != null && currentPrice > entryPrice ? "PROFIT_HOLD" : "HOLD";
      }
      return "SELL_WATCH";
    }

    // 7. SELL_PENDING transits to CLOSED only after Broker SELL ACK
    if (state === "SELL_PENDING") {
      return "SELL_PENDING";
    }

    return "CLOSED";
  }
}
