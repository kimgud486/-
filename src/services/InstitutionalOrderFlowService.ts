// ----------------------------------------------------------------------
// INSTITUTIONAL ORDER FLOW SERVICE (V14.2 INSTITUTIONAL TRUTH)
// Zero Fake Order Flow - Only Returns Real Data or UNAVAILABLE
// ----------------------------------------------------------------------

export interface InstitutionalFlowAnalysis {
  status: "LIVE" | "UNAVAILABLE" | "STALE";

  bidAskDelta: number | null;
  cumulativeDelta: number | null;

  buyVolume: number | null;
  sellVolume: number | null;

  poc: number | null;
  vah: number | null;
  val: number | null;

  bidImbalance: number | null;
  askImbalance: number | null;

  absorption: boolean | null;
  exhaustion: boolean | null;
}

export function unavailableInstitutionalFlow(): InstitutionalFlowAnalysis {
  return {
    status: "UNAVAILABLE",
    bidAskDelta: null,
    cumulativeDelta: null,
    buyVolume: null,
    sellVolume: null,
    poc: null,
    vah: null,
    val: null,
    bidImbalance: null,
    askImbalance: null,
    absorption: null,
    exhaustion: null
  };
}

class InstitutionalOrderFlowServiceImpl {
  private liveFlowData: Map<string, InstitutionalFlowAnalysis> = new Map();

  /**
   * Get order flow analysis for a symbol.
   * Returns UNAVAILABLE with null fields if no real tick feed is attached.
   */
  public getFlow(symbol: string): InstitutionalFlowAnalysis {
    if (!symbol) return unavailableInstitutionalFlow();
    const cleanSym = symbol.toUpperCase();
    const data = this.liveFlowData.get(cleanSym);
    if (!data) {
      return unavailableInstitutionalFlow();
    }
    return data;
  }

  /**
   * Update order flow with verified tick/orderbook feed only
   */
  public updateRealTickFlow(symbol: string, flow: InstitutionalFlowAnalysis) {
    if (!symbol) return;
    this.liveFlowData.set(symbol.toUpperCase(), flow);
  }
}

export const institutionalOrderFlowService = new InstitutionalOrderFlowServiceImpl();
