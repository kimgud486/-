import test from "node:test";
import assert from "node:assert/strict";

import { BollingerSqueezeEngine } from "../src/realtime/BollingerSqueezeEngine";
import type { LiveCandle } from "../src/realtime/types";

function candlesFromCloses(closes: number[], lastClosed = true): LiveCandle[] {
  return closes.map((close, index) => ({
    time: 1_700_000_000 + index * 60,
    open: close,
    high: close + 0.2,
    low: close - 0.2,
    close,
    volume: 1_000,
    isClosed: index === closes.length - 1 ? lastClosed : true
  }));
}

test("Bollinger series stays NaN before warmup and uses aligned 20-bar windows", () => {
  const closes = Array.from({ length: 30 }, (_, index) => 100 + Math.sin(index / 2) * 2);
  const series = BollingerSqueezeEngine.calculateSeries(closes, 20, 2, 20, 0.75);

  assert.equal(series.length, closes.length);
  assert.equal(Number.isFinite(series[18].middle), false);
  assert.equal(Number.isFinite(series[19].middle), true);
  assert.ok(series[19].upper > series[19].middle);
  assert.ok(series[19].middle > series[19].lower);
  assert.ok(series[19].bandwidthPct > 0);
});

test("Bollinger squeeze compares current bandwidth with previous bars only", () => {
  const wide = Array.from({ length: 45 }, (_, index) => index % 2 === 0 ? 94 : 106);
  const narrow = Array.from({ length: 8 }, (_, index) => index % 2 === 0 ? 99.9 : 100.1);
  const closes = [...wide, ...narrow];
  const series = BollingerSqueezeEngine.calculateSeries(closes, 20, 2, 20, 0.75);
  const last = series[series.length - 1];

  assert.equal(last.squeeze, true);
  assert.ok(last.squeezeRatio <= 0.75);
  assert.ok(last.bandwidthPct < series[44].bandwidthPct);
});

test("closed upper-band cross is confirmed, forming cross stays candidate only", () => {
  const wide = Array.from({ length: 45 }, (_, index) => index % 2 === 0 ? 95 : 105);
  const narrow = Array.from({ length: 8 }, (_, index) => index % 2 === 0 ? 99.9 : 100.1);
  const closes = [...wide, ...narrow, 110];

  const confirmed = BollingerSqueezeEngine.analyze(candlesFromCloses(closes, true));
  assert.equal(confirmed.direction, "UP");
  assert.equal(confirmed.breakoutCandidate, true);
  assert.equal(confirmed.breakoutConfirmed, true);
  assert.equal(confirmed.squeezeRelease, true);

  const forming = BollingerSqueezeEngine.analyze(candlesFromCloses(closes, false));
  assert.equal(forming.direction, "UP");
  assert.equal(forming.breakoutCandidate, true);
  assert.equal(forming.breakoutConfirmed, false);
});

test("lower-band cross is detected symmetrically", () => {
  const stable = Array.from({ length: 50 }, (_, index) => 100 + Math.sin(index) * 0.5);
  const closes = [...stable, 90];
  const result = BollingerSqueezeEngine.analyze(candlesFromCloses(closes, true));

  assert.equal(result.direction, "DOWN");
  assert.equal(result.breakoutConfirmed, true);
});
