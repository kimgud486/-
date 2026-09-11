import test from "node:test";
import assert from "node:assert/strict";

import { IndicatorEngine } from "../src/realtime/IndicatorEngine";
import type { LiveCandle } from "../src/realtime/types";

function buildTrendCandles(count: number): LiveCandle[] {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index;
    return {
      time: 1_700_000_000 + index * 60,
      open: close - 0.5,
      high: close + 2,
      low: close - 2,
      close,
      volume: 1_000 + index * 10,
      isClosed: true,
      sessionKey: "2026-09-11",
    } as LiveCandle;
  });
}

test("RSI series stays aligned and reaches 100 on an uninterrupted uptrend", () => {
  const candles = buildTrendCandles(80);
  const closes = candles.map(c => c.close);
  const rsi = IndicatorEngine.calcRSISeries(closes, 14);

  assert.equal(rsi.length, closes.length);
  assert.ok(Number.isNaN(rsi[13]));
  assert.equal(rsi[14], 100);
  assert.equal(rsi[rsi.length - 1], 100);
});

test("MACD line, signal line, and histogram share the candle timeline", () => {
  const candles = buildTrendCandles(80);
  const closes = candles.map(c => c.close);
  const macd = IndicatorEngine.calcMACDSeries(closes);

  assert.equal(macd.macd.length, closes.length);
  assert.equal(macd.signal.length, closes.length);
  assert.equal(macd.hist.length, closes.length);
  assert.ok(Number.isNaN(macd.macd[24]));
  assert.ok(Number.isFinite(macd.macd[25]));
  assert.ok(Number.isNaN(macd.signal[32]));
  assert.ok(Number.isFinite(macd.signal[33]));
  assert.ok(Number.isFinite(macd.hist[33]));
});

test("ATR series is Wilder-smoothed and aligned to candle timestamps", () => {
  const candles = buildTrendCandles(80);
  const atr = IndicatorEngine.calcATRSeries(candles, 14);

  assert.equal(atr.length, candles.length);
  assert.ok(Number.isNaN(atr[13]));
  assert.equal(atr[14], 4);
  assert.equal(atr[atr.length - 1], 4);
});

test("series helpers agree with the live indicator snapshot on the latest bar", () => {
  const candles = buildTrendCandles(80);
  const closes = candles.map(c => c.close);
  const rsi = IndicatorEngine.calcRSISeries(closes, 14);
  const macd = IndicatorEngine.calcMACDSeries(closes);
  const atr = IndicatorEngine.calcATRSeries(candles, 14);
  const snapshot = IndicatorEngine.calculate(candles);
  const last = candles.length - 1;

  assert.equal(snapshot.rsi14, rsi[last]);
  assert.equal(snapshot.macd, macd.macd[last]);
  assert.equal(snapshot.macdSignal, macd.signal[last]);
  assert.equal(snapshot.macdHistogram, macd.hist[last]);
  assert.equal(snapshot.atr14, atr[last]);
});
