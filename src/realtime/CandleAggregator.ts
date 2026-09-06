import type { LiveTick, LiveCandle, FeedQuality } from "./types";

export class CandleAggregator {
  private candle: LiveCandle | null = null;
  private currentSlotMs: number = 0;

  constructor(
    public timeframeMs = 60_000
  ) {}

  public reset(timeframeMs?: number) {
    if (timeframeMs && timeframeMs > 0) {
      this.timeframeMs = timeframeMs;
    }
    this.candle = null;
    this.currentSlotMs = 0;
  }

  public getCurrentCandle(): LiveCandle | null {
    return this.candle;
  }

  public update(tick: LiveTick): {
    candle: LiveCandle;
    closed: boolean;
  } {
    const slotTimeMs = Math.floor(tick.timestamp / this.timeframeMs) * this.timeframeMs;
    // Lightweight Charts expects time in seconds for intraday
    const timeInSec = Math.floor(slotTimeMs / 1000);

    if (!this.candle) {
      this.currentSlotMs = slotTimeMs;
      this.candle = this.createCandle(timeInSec, tick);
      return {
        candle: this.candle,
        closed: false
      };
    }

    // If tick belongs to a new time window, close the existing candle
    if (slotTimeMs !== this.currentSlotMs) {
      const closedCandle: LiveCandle = {
        ...this.candle,
        isClosed: true
      };

      this.currentSlotMs = slotTimeMs;
      this.candle = this.createCandle(timeInSec, tick);

      return {
        candle: closedCandle,
        closed: true
      };
    }

    // Still in the current candle window -> update ongoing bar
    this.candle.high = Math.max(this.candle.high, tick.price);
    this.candle.low = Math.min(this.candle.low, tick.price);
    this.candle.close = tick.price;
    this.candle.volume += tick.volume;

    this.candle.bidVolume =
      (this.candle.bidVolume ?? 0) + (tick.bidVolume ?? 0);

    this.candle.askVolume =
      (this.candle.askVolume ?? 0) + (tick.askVolume ?? 0);

    this.candle.isClosed = false;

    if (tick.source) this.candle.source = tick.source;
    if (tick.quality) this.candle.quality = tick.quality;

    return {
      candle: this.candle,
      closed: false
    };
  }

  private createCandle(
    timeInSec: number,
    tick: LiveTick
  ): LiveCandle {
    return {
      time: timeInSec,
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      volume: tick.volume,
      bidVolume: tick.bidVolume ?? 0,
      askVolume: tick.askVolume ?? 0,
      isClosed: false,
      source: tick.source || "KIS_REALTIME_WS",
      quality: tick.quality || "BROKER_REALTIME"
    };
  }
}
