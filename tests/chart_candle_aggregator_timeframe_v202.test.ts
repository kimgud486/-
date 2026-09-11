import test from "node:test";
import assert from "node:assert/strict";

import { CandleAggregator } from "../src/realtime/CandleAggregator";
import type { LiveTick } from "../src/realtime/types";

test("numeric reset keeps the matching timeframe label and duration", () => {
  const aggregator = new CandleAggregator("1m");
  aggregator.reset(5 * 60_000);

  const tick: LiveTick = {
    symbol: "005930",
    timestamp: 1_700_000_001_000,
    price: 70_000,
    volume: 10,
  };

  const result = aggregator.update(tick, "KOREA");
  assert.equal(result.candle.timeframe, "5m");
  assert.equal(result.candle.endedAt - result.candle.startedAt, 5 * 60_000);
});

test("daily aggregation uses a real 24-hour bucket", () => {
  const aggregator = new CandleAggregator("1D");
  const tick: LiveTick = {
    symbol: "KRW-BTC",
    timestamp: 1_700_000_001_000,
    price: 100_000_000,
    volume: 0.01,
  };

  const result = aggregator.update(tick, "CRYPTO");
  assert.equal(result.candle.timeframe, "1D");
  assert.equal(result.candle.endedAt - result.candle.startedAt, 24 * 60 * 60_000);
  assert.equal(result.candle.market, "CRYPTO");
});
