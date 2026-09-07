// ----------------------------------------------------------------------
// AISTOCK V20 KIS OVERSEAS REALTIME PARSER & ENTITLEMENT GATE
// KIS Official Specs: HDFSCNT0 (Trade Tick), HDFSASP0 (Orderbook Depth), H0GSCNI0 (Account Execution)
// ----------------------------------------------------------------------

export type DataGradeV20 = "EXECUTION_GRADE" | "ANALYSIS_ONLY" | "DISPLAY_ONLY";

export interface OverseasTradeTickV20 {
  symbol: string;
  market: "US";
  lastPrice: number;
  ratePct: number;
  bidPrice: number;
  askPrice: number;
  executedVolume: number;
  totalVolume: number;
  totalAmount: number;
  timestamp: number;
  sequence: number;
  grade: DataGradeV20;
  rawPayload: string;
}

export class KISOverseasParserV20 {
  /**
   * Parse raw HDFSCNT0 WebSocket packet string into structured OverseasTradeTickV20.
   * Field structure: RSYM, SYMB, ZDIV, TYMD, XYMD, XTIM, LAST, SIGN, DIFF, RATE, PBID, PASK, EVOL, TVOL, TAMT
   */
  public static parseHDFSCNT0(rawMessage: string, isEntitled: boolean = false): OverseasTradeTickV20 | null {
    if (!rawMessage || !rawMessage.includes("^")) {
      return null;
    }

    const tokens = rawMessage.split("^");
    if (tokens.length < 15) {
      return null;
    }

    try {
      const symbol = (tokens[1] || tokens[0] || "US_STOCK").trim().toUpperCase();
      const lastPrice = parseFloat(tokens[6] || "0");
      const ratePct = parseFloat(tokens[9] || "0");
      const bidPrice = parseFloat(tokens[10] || "0");
      const askPrice = parseFloat(tokens[11] || "0");
      const executedVolume = parseFloat(tokens[12] || "0");
      const totalVolume = parseFloat(tokens[13] || "0");
      const totalAmount = parseFloat(tokens[14] || "0");

      if (isNaN(lastPrice) || lastPrice <= 0) {
        return null;
      }

      // Entitlement Rule: KIS officially designates HDFSCNT0 as delayed by default unless real-time entitlement is verified
      const grade: DataGradeV20 = isEntitled ? "EXECUTION_GRADE" : "ANALYSIS_ONLY";

      return {
        symbol,
        market: "US",
        lastPrice,
        ratePct,
        bidPrice,
        askPrice,
        executedVolume,
        totalVolume,
        totalAmount,
        timestamp: Date.now(),
        sequence: Date.now(),
        grade,
        rawPayload: rawMessage
      };
    } catch (e) {
      return null;
    }
  }
}
