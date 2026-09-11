import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateChartIndicators,
  calculateEma,
  calculateRvol,
  calculateVwap,
  type ChartIndicatorInputCandle,
} from "../src/services/ChartIndicatorEngineV201";

const makeCandles = (count: number, close = 100, volume = 100): ChartIndicatorInputCandle[] =>
  Array.from({ length: count }, (_, index) => ({
    time: index,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume,
  }));

test("EMA waits for a full period and keeps a flat price flat", () => {
  const closes = Array.from({ length: 25 }, () => 100);
  const ema9 = calculateEma(closes, 9);
  const ema20 = calculateEma(closes, 20);

  assert.equal(ema9[7], undefined);
  assert.equal(ema9[8], 100);
  assert.equal(ema20[18], undefined);
  assert.equal(ema20[19], 100);
  assert.equal(ema20[24], 100);
});

test("VWAP uses real OHLCV math instead of copying close price", () => {
  const candles: ChartIndicatorInputCandle[] = [
    { time: 1, open: 99, high: 101, low: 99, close: 100, volume: 10 },
    { time: 2, open: 109, high: 111, low: 109, close: 110, volume: 30 },
  ];

  const vwap = calculateVwap(candles);
  assert.equal(vwap[0], 100);
  assert.equal(vwap[1], 107.5);
});

test("RVOL compares the current volume with previous candles only", () => {
  const volumes = [...Array.from({ length: 20 }, () => 100), 250];
  const rvol = calculateRvol(volumes, 20);

  assert.equal(rvol[19], undefined);
  assert.equal(rvol[20], 2.5);
});

test("chart indicator bundle never changes source OHLCV", () => {
  const candles = makeCandles(21, 100, 100);
  const enhanced = calculateChartIndicators(candles);

  assert.equal(enhanced.length, candles.length);
  assert.equal(enhanced[20].close, 100);
  assert.equal(enhanced[20].volume, 100);
  assert.equal(enhanced[20].ema9, 100);
  assert.equal(enhanced[20].ema20, 100);
  assert.equal(enhanced[20].vwap, 100);
  assert.equal(enhanced[20].rvol20, 1);
});
