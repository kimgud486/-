import type { LiveCandle, MarketStructureSnapshot } from "./types";

export class MarketStructureEngine {
  public static analyze(candles: LiveCandle[], vwap: number): MarketStructureSnapshot {
    if (candles.length < 5) {
      return {
        trend: "SIDEWAYS",
        hhhlValid: false,
        breakoutValid: false,
        pullbackValid: false,
        vwapReclaim: false,
        volumeExpansion: false,
        chochDetected: false,
        bosDetected: false
      };
    }

    const recent = candles.slice(-20);
    const last = recent[recent.length - 1];
    const prev = recent[recent.length - 2];

    // Find pivot highs and pivot lows
    const swingHighs: { price: number; idx: number }[] = [];
    const swingLows: { price: number; idx: number }[] = [];

    for (let i = 2; i < recent.length - 2; i++) {
      const c = recent[i];
      const isHigh =
        c.high > recent[i - 1].high &&
        c.high > recent[i - 2].high &&
        c.high > recent[i + 1].high &&
        c.high > recent[i + 2].high;

      const isLow =
        c.low < recent[i - 1].low &&
        c.low < recent[i - 2].low &&
        c.low < recent[i + 1].low &&
        c.low < recent[i + 2].low;

      if (isHigh) swingHighs.push({ price: c.high, idx: i });
      if (isLow) swingLows.push({ price: c.low, idx: i });
    }

    // HH / HL check
    let hhhlValid = false;
    let trend: "BULLISH" | "BEARISH" | "SIDEWAYS" = "SIDEWAYS";
    const lastHigh = swingHighs[swingHighs.length - 1]?.price;
    const prevHigh = swingHighs[swingHighs.length - 2]?.price;
    const lastLow = swingLows[swingLows.length - 1]?.price;
    const prevLow = swingLows[swingLows.length - 2]?.price;

    if (lastHigh && prevHigh && lastLow && prevLow) {
      if (lastHigh >= prevHigh && lastLow >= prevLow) {
        hhhlValid = true;
        trend = "BULLISH";
      } else if (lastHigh <= prevHigh && lastLow <= prevLow) {
        trend = "BEARISH";
      }
    } else {
      // Fallback simple slope
      const firstClose = recent[0].close;
      hhhlValid = last.close > firstClose && last.close > vwap;
      trend = hhhlValid ? "BULLISH" : "SIDEWAYS";
    }

    // Breakout detection
    const highRange = Math.max(...recent.slice(0, -1).map(c => c.high));
    const breakoutValid = last.close > highRange;

    // Pullback detection: price dipped towards vwap or previous high and held
    const pullbackValid = prev.low <= vwap * 1.002 && last.close > vwap;

    // VWAP Reclaim: previous was below vwap, current closed above
    const vwapReclaim = prev.close < vwap && last.close >= vwap;

    // Volume expansion: current volume > 1.5x average
    const avgVol = recent.reduce((a, b) => a + b.volume, 0) / recent.length;
    const volumeExpansion = last.volume > avgVol * 1.35;

    // BOS / CHOCH
    const bosDetected = breakoutValid && volumeExpansion;
    const chochDetected = trend === "BEARISH" && vwapReclaim && last.close > prev.high;

    return {
      trend,
      hhhlValid,
      lastHigherHigh: lastHigh,
      lastHigherLow: lastLow,
      lastLowerHigh: prevHigh,
      lastLowerLow: prevLow,
      breakoutValid,
      pullbackValid,
      vwapReclaim,
      volumeExpansion,
      chochDetected,
      bosDetected
    };
  }
}
