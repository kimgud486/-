// ----------------------------------------------------------------------
// VERIFIED EXECUTION TICK V19.0 (AISTOCK DATA TRUTH CANONICAL TICK)
// ----------------------------------------------------------------------

export type DataTruthStatus =
  | "REALTIME_VERIFIED"
  | "REALTIME_DERIVED"
  | "STALE"
  | "NO_DATA"
  | "INVALID"
  | "CLOSED";

export interface VerifiedExecutionTick {
  symbol: string;
  market: "KOREA" | "US" | "CRYPTO" | "KR";
  price: number;
  sourceTimestamp: number;
  receivedAt: number;
  ageMs: number;
  sequence: number;
  dataStatus: DataTruthStatus;
  sessionStatus?: string;
  brokerHealth?: "HEALTHY" | "DEGRADED" | "DISCONNECTED";
}

export class VerifiedExecutionTickValidator {
  public static validate(tick: VerifiedExecutionTick, expectedSymbol?: string): void {
    if (!tick) {
      throw new Error("EMPTY_EXECUTION_TICK");
    }

    if (expectedSymbol && tick.symbol && tick.symbol.toUpperCase() !== expectedSymbol.toUpperCase()) {
      throw new Error(`SYMBOL_MISMATCH: expected ${expectedSymbol}, got ${tick.symbol}`);
    }

    if (tick.dataStatus !== "REALTIME_VERIFIED" && tick.dataStatus !== "REALTIME_DERIVED") {
      throw new Error(`UNVERIFIED_DATA_STATUS: ${tick.dataStatus}`);
    }

    if (!Number.isFinite(tick.price) || tick.price <= 0) {
      throw new Error(`INVALID_EXECUTION_PRICE: ${tick.price}`);
    }

    const calculatedAge = Date.now() - (tick.sourceTimestamp || tick.receivedAt || Date.now());
    const effectiveAge = tick.ageMs ?? calculatedAge;

    if (effectiveAge > 300000 || effectiveAge < -60000) {
      throw new Error(`STALE_EXECUTION_TICK: ageMs=${effectiveAge}`);
    }

    if (tick.brokerHealth === "DISCONNECTED") {
      throw new Error("BROKER_DISCONNECTED_TICK_REJECTED");
    }
  }

  public static isValid(tick: VerifiedExecutionTick, expectedSymbol?: string): boolean {
    try {
      this.validate(tick, expectedSymbol);
      return true;
    } catch {
      return false;
    }
  }
}
