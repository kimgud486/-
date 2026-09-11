import type { LiveCandle, LiveTick } from "./types";

export type VolumeProfileQuality =
  | "LIVE_TICK_PARTIAL"
  | "OHLCV_ESTIMATED"
  | "EMPTY";

export interface VolumeProfileLevel {
  price: number;
  volume: number;
  volumePct: number;
}

export interface VolumeProfileSnapshot {
  poc: number;
  vah: number;
  val: number;
  valueAreaPct: number;
  totalVolume: number;
  sampleCount: number;
  quality: VolumeProfileQuality;
  levels: VolumeProfileLevel[];
  topLevels: VolumeProfileLevel[];
}

interface ValueAreaInputLevel {
  price: number;
  volume: number;
}

const roundPrice = (price: number) => Number(price.toFixed(8));

function emptySnapshot(valueAreaPct = 0.7): VolumeProfileSnapshot {
  return {
    poc: Number.NaN,
    vah: Number.NaN,
    val: Number.NaN,
    valueAreaPct,
    totalVolume: 0,
    sampleCount: 0,
    quality: "EMPTY",
    levels: [],
    topLevels: []
  };
}

function buildSnapshot(
  inputLevels: ValueAreaInputLevel[],
  quality: VolumeProfileQuality,
  sampleCount: number,
  valueAreaPct = 0.7
): VolumeProfileSnapshot {
  const safeValueArea = Math.max(0.5, Math.min(0.9, valueAreaPct));
  const levels = inputLevels
    .filter(level => Number.isFinite(level.price) && Number.isFinite(level.volume) && level.volume > 0)
    .sort((a, b) => a.price - b.price);

  if (levels.length === 0) return emptySnapshot(safeValueArea);

  const totalVolume = levels.reduce((sum, level) => sum + level.volume, 0);
  if (!Number.isFinite(totalVolume) || totalVolume <= 0) return emptySnapshot(safeValueArea);

  let pocIndex = 0;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i].volume > levels[pocIndex].volume) pocIndex = i;
  }

  let lowerIndex = pocIndex;
  let upperIndex = pocIndex;
  let valueAreaVolume = levels[pocIndex].volume;
  const targetVolume = totalVolume * safeValueArea;

  while (valueAreaVolume < targetVolume && (lowerIndex > 0 || upperIndex < levels.length - 1)) {
    const lowerVolume = lowerIndex > 0 ? levels[lowerIndex - 1].volume : -1;
    const upperVolume = upperIndex < levels.length - 1 ? levels[upperIndex + 1].volume : -1;

    if (upperVolume > lowerVolume) {
      upperIndex += 1;
      valueAreaVolume += levels[upperIndex].volume;
    } else if (lowerIndex > 0) {
      lowerIndex -= 1;
      valueAreaVolume += levels[lowerIndex].volume;
    } else {
      upperIndex += 1;
      valueAreaVolume += levels[upperIndex].volume;
    }
  }

  const normalizedLevels: VolumeProfileLevel[] = levels.map(level => ({
    price: roundPrice(level.price),
    volume: level.volume,
    volumePct: Number(((level.volume / totalVolume) * 100).toFixed(2))
  }));

  const topLevels = [...normalizedLevels]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8);

  return {
    poc: roundPrice(levels[pocIndex].price),
    vah: roundPrice(levels[upperIndex].price),
    val: roundPrice(levels[lowerIndex].price),
    valueAreaPct: safeValueArea,
    totalVolume,
    sampleCount,
    quality,
    levels: normalizedLevels,
    topLevels
  };
}

export class LiveVolumeProfileAccumulator {
  private readonly levels = new Map<number, number>();
  private sampleCount = 0;

  public reset(): void {
    this.levels.clear();
    this.sampleCount = 0;
  }

  public addTrade(price: number, volume: number): void {
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(volume) || volume <= 0) return;
    const key = roundPrice(price);
    this.levels.set(key, (this.levels.get(key) ?? 0) + volume);
    this.sampleCount += 1;
  }

  public addTick(tick: Pick<LiveTick, "price" | "volume">): void {
    this.addTrade(tick.price, tick.volume);
  }

  public snapshot(valueAreaPct = 0.7): VolumeProfileSnapshot {
    return buildSnapshot(
      [...this.levels.entries()].map(([price, volume]) => ({ price, volume })),
      this.sampleCount > 0 ? "LIVE_TICK_PARTIAL" : "EMPTY",
      this.sampleCount,
      valueAreaPct
    );
  }
}

export class VolumeProfileEngine {
  /**
   * Estimate price-by-volume from historical OHLCV candles.
   * This is intentionally labelled OHLCV_ESTIMATED because a candle does not
   * contain the exact traded volume at each price.
   */
  public static estimateFromCandles(
    candles: LiveCandle[],
    binCount = 48,
    valueAreaPct = 0.7
  ): VolumeProfileSnapshot {
    const valid = candles.filter(c =>
      Number.isFinite(c.low) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.close) &&
      Number.isFinite(c.volume) &&
      c.low > 0 &&
      c.high >= c.low &&
      c.volume > 0
    );

    if (valid.length === 0) return emptySnapshot(valueAreaPct);

    const minPrice = Math.min(...valid.map(c => c.low));
    const maxPrice = Math.max(...valid.map(c => c.high));
    if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || maxPrice <= 0) {
      return emptySnapshot(valueAreaPct);
    }

    const safeBins = Math.max(12, Math.min(120, Math.floor(binCount)));
    const range = Math.max(maxPrice - minPrice, Math.max(maxPrice, 1) * 1e-8);
    const binSize = range / safeBins;
    const bins = new Array<number>(safeBins).fill(0);

    for (const candle of valid) {
      const candleRange = candle.high - candle.low;

      if (candleRange <= 0) {
        const index = Math.max(0, Math.min(safeBins - 1, Math.floor((candle.close - minPrice) / binSize)));
        bins[index] += candle.volume;
        continue;
      }

      const firstIndex = Math.max(0, Math.min(safeBins - 1, Math.floor((candle.low - minPrice) / binSize)));
      const lastIndex = Math.max(0, Math.min(safeBins - 1, Math.floor((candle.high - minPrice) / binSize)));
      let overlapTotal = 0;
      const overlaps: Array<{ index: number; overlap: number }> = [];

      for (let index = firstIndex; index <= lastIndex; index++) {
        const binLow = minPrice + index * binSize;
        const binHigh = index === safeBins - 1 ? maxPrice : binLow + binSize;
        const overlap = Math.max(0, Math.min(candle.high, binHigh) - Math.max(candle.low, binLow));
        if (overlap > 0) {
          overlaps.push({ index, overlap });
          overlapTotal += overlap;
        }
      }

      if (overlapTotal <= 0) {
        const index = Math.max(0, Math.min(safeBins - 1, Math.floor((candle.close - minPrice) / binSize)));
        bins[index] += candle.volume;
        continue;
      }

      for (const item of overlaps) {
        bins[item.index] += candle.volume * (item.overlap / overlapTotal);
      }
    }

    const levels = bins.map((volume, index) => ({
      price: minPrice + (index + 0.5) * binSize,
      volume
    }));

    return buildSnapshot(levels, "OHLCV_ESTIMATED", valid.length, valueAreaPct);
  }
}
