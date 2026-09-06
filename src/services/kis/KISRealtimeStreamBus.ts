// ----------------------------------------------------------------------
// KIS REALTIME STREAM BUS V18.3
// Official KIS WebSocket Protocol Normalizer (H0STCNT0, H0STASP0, H0STCNI0)
// ----------------------------------------------------------------------

export interface VerifiedTradeTick {
  trId: "H0STCNT0";
  symbol: string;
  price: number;
  size: number;
  changeRate: number;
  aggressor: "BUY" | "SELL" | "NEUTRAL";
  timestamp: number;
  source: "KIS_WS_H0STCNT0";
  isVerified: boolean;
}

export interface VerifiedOrderbookSnapshot {
  trId: "H0STASP0";
  symbol: string;
  bestAsk: number;
  bestBid: number;
  spread: number;
  spreadPct: number;
  askDepthTotal: number;
  bidDepthTotal: number;
  imbalancePct: number; // positive = bid heavy, negative = ask heavy
  timestamp: number;
  source: "KIS_WS_H0STASP0";
  isVerified: boolean;
}

export interface KISExecutionNotice {
  trId: "H0STCNI0";
  accountNo: string;
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  execQty: number;
  execPrice: number;
  remainingQty: number;
  timestamp: number;
  source: "KIS_WS_H0STCNI0";
  isVerified: boolean;
}

export class KISRealtimeStreamBus {
  /**
   * Parse raw H0STCNT0 trade tick frame
   */
  public static parseTradeTick(symbol: string, rawData: string[]): VerifiedTradeTick | null {
    if (!rawData || rawData.length < 5) return null;
    const price = parseFloat(rawData[2]) || 0;
    const size = parseFloat(rawData[3]) || 0;
    const changeRate = parseFloat(rawData[4]) || 0;
    const sign = rawData[5] || "3"; // 1: Upper limit, 2: Up, 3: Unchanged, 4: Lower limit, 5: Down

    if (price <= 0 || size <= 0) return null;

    const aggressor = sign === "1" || sign === "2" ? "BUY" : sign === "4" || sign === "5" ? "SELL" : "NEUTRAL";

    return {
      trId: "H0STCNT0",
      symbol,
      price,
      size,
      changeRate,
      aggressor,
      timestamp: Date.now(),
      source: "KIS_WS_H0STCNT0",
      isVerified: true
    };
  }

  /**
   * Parse raw H0STASP0 orderbook frame
   */
  public static parseOrderbook(symbol: string, rawData: string[]): VerifiedOrderbookSnapshot | null {
    if (!rawData || rawData.length < 10) return null;
    const bestAsk = parseFloat(rawData[3]) || 0;
    const bestBid = parseFloat(rawData[13]) || 0;
    const askDepthTotal = parseFloat(rawData[23]) || 0;
    const bidDepthTotal = parseFloat(rawData[24]) || 0;

    if (bestAsk <= 0 || bestBid <= 0) return null;

    const spread = +(bestAsk - bestBid).toFixed(2);
    const spreadPct = +((spread / bestBid) * 100).toFixed(4);
    const totalDepth = askDepthTotal + bidDepthTotal;
    const imbalancePct = totalDepth > 0 ? +(((bidDepthTotal - askDepthTotal) / totalDepth) * 100).toFixed(2) : 0;

    return {
      trId: "H0STASP0",
      symbol,
      bestAsk,
      bestBid,
      spread,
      spreadPct,
      askDepthTotal,
      bidDepthTotal,
      imbalancePct,
      timestamp: Date.now(),
      source: "KIS_WS_H0STASP0",
      isVerified: true
    };
  }

  /**
   * Parse raw H0STCNI0 account execution notice frame
   */
  public static parseExecutionNotice(rawData: string[]): KISExecutionNotice | null {
    if (!rawData || rawData.length < 8) return null;
    const accountNo = rawData[0] || "";
    const orderId = rawData[1] || "";
    const symbol = rawData[2] || "";
    const sideCode = rawData[3] || "02"; // 01: SELL, 02: BUY
    const execQty = parseFloat(rawData[4]) || 0;
    const execPrice = parseFloat(rawData[5]) || 0;
    const remainingQty = parseFloat(rawData[6]) || 0;

    if (!symbol || execQty <= 0) return null;

    return {
      trId: "H0STCNI0",
      accountNo,
      orderId,
      symbol,
      side: sideCode === "01" ? "SELL" : "BUY",
      execQty,
      execPrice,
      remainingQty,
      timestamp: Date.now(),
      source: "KIS_WS_H0STCNI0",
      isVerified: true
    };
  }
}
