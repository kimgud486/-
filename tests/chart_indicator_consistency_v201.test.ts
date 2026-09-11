import test from "node:test";
import assert from "node:assert/strict";

import { IndicatorEngine } from "../src/realtime/IndicatorEngine";
import type { LiveCandle } from "../src/realtime/types";

function candle(
  time: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  sessionKey?: string,
): LiveCandle {
  return {
    time,
    open,
    high,
    low,
    close,
    volume,
    isClosed: true,
    sessionKey,
  } as LiveCandle;
}

test("session VWAP resets when the market session changes", () => {
  const candles: LiveCandle[] = [
    candle(1, 10, 12, 8, 10, 100, "2026-09-10"),
    candle(2, 20, 22, 18, 20, 100, "2026-09-10"),
    candle(3, 30, 32, 28, 30, 100, "2026-09-11"),
    candle(4, 40, 42, 38, 40, 300, "2026-09-11"),
  ];

  const series = IndicatorEngine.calculateSessionVWAPSeries(candles);

  assert.deepEqual(series, [10, 15, 30, 37.5]);
  assert.equal(IndicatorEngine.calculateSessionVWAP(candles), 37.5);
});

test("RVOL compares the current candle with the previous 20 candles", () => {
  const candles: LiveCandle[] = Array.from({ length: 20 }, (_, index) =>
    candle(index + 1, 100, 101, 99, 100, 100, "2026-09-11"),
  );
  candles.push(candle(21, 100, 102, 99, 101, 250, "2026-09-11"));

  const series = IndicatorEngine.calcRVOLSeries(candles, 20);
  const snapshot = IndicatorEngine.calculate(candles);

  assert.equal(series[20], 2.5);
  assert.equal(snapshot.rvol, 2.5);
});

test("RVOL does not dilute a spike by including the current bar in its baseline", () => {
  const candles: LiveCandle[] = Array.from({ length: 20 }, (_, index) =>
    candle(index + 1, 100, 101, 99, 100, 100, "2026-09-11"),
  );
  candles.push(candle(21, 100, 105, 99, 104, 500, "2026-09-11"));

  const series = IndicatorEngine.calcRVOLSeries(candles, 20);

  assert.equal(series[20], 5);
});
