import test from "node:test";
import assert from "node:assert/strict";

import {
  LiveVolumeProfileAccumulator,
  VolumeProfileEngine
} from "../src/realtime/VolumeProfileEngine";
import type { LiveCandle } from "../src/realtime/types";

test("live trade profile finds POC and expands a contiguous 70% value area", () => {
  const profile = new LiveVolumeProfileAccumulator();
  profile.addTrade(100, 10);
  profile.addTrade(101, 50);
  profile.addTrade(102, 20);
  profile.addTrade(103, 20);

  const result = profile.snapshot(0.7);

  assert.equal(result.quality, "LIVE_TICK_PARTIAL");
  assert.equal(result.totalVolume, 100);
  assert.equal(result.sampleCount, 4);
  assert.equal(result.poc, 101);
  assert.equal(result.val, 101);
  assert.equal(result.vah, 102);
  assert.equal(result.topLevels[0].price, 101);
  assert.equal(result.topLevels[0].volumePct, 50);
});

test("invalid live trades are ignored instead of creating fake profile levels", () => {
  const profile = new LiveVolumeProfileAccumulator();
  profile.addTrade(100, 10);
  profile.addTrade(Number.NaN, 20);
  profile.addTrade(101, 0);
  profile.addTrade(-1, 5);

  const result = profile.snapshot();
  assert.equal(result.sampleCount, 1);
  assert.equal(result.poc, 100);
  assert.equal(result.totalVolume, 10);
});

test("historical candle profile is explicitly estimated and conserves OHLCV volume", () => {
  const candles: LiveCandle[] = [
    { time: 1_700_000_000, open: 100, high: 102, low: 100, close: 101, volume: 1_000, isClosed: true },
    { time: 1_700_000_060, open: 101, high: 103, low: 101, close: 102, volume: 2_000, isClosed: true },
    { time: 1_700_000_120, open: 102, high: 104, low: 102, close: 103, volume: 1_500, isClosed: true }
  ];

  const result = VolumeProfileEngine.estimateFromCandles(candles, 24, 0.7);
  const distributedVolume = result.levels.reduce((sum, level) => sum + level.volume, 0);

  assert.equal(result.quality, "OHLCV_ESTIMATED");
  assert.equal(result.sampleCount, 3);
  assert.ok(Number.isFinite(result.poc));
  assert.ok(result.val <= result.poc);
  assert.ok(result.vah >= result.poc);
  assert.ok(Math.abs(distributedVolume - 4_500) < 1e-6);
  assert.ok(Math.abs(result.totalVolume - 4_500) < 1e-6);
});
