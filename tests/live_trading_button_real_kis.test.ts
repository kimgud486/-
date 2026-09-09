import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { KISBrokerGatewayV121 } from "../server/broker/KISBrokerGatewayV121";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("LIVE domestic cash order uses current KIS TR IDs", () => {
  const gateway = new KISBrokerGatewayV121();
  assert.equal(gateway.getTRID("KOREA", "BUY", false), "TTTC0012U");
  assert.equal(gateway.getTRID("KOREA", "SELL", false), "TTTC0011U");
  assert.equal(gateway.getTRID("US", "BUY", false), "LIVE_MARKET_NOT_VERIFIED");
});

test("server rejects LIVE order while explicit server gate is off", async () => {
  const previous = process.env.AISTOCK_ALLOW_LIVE_TRADING;
  process.env.AISTOCK_ALLOW_LIVE_TRADING = "false";

  try {
    const gateway = new KISBrokerGatewayV121();
    const result = await gateway.executeOrder({
      symbol: "005930",
      name: "삼성전자",
      market: "KOREA",
      side: "BUY",
      price: 70000,
      qty: 1,
      orderType: "MARKET",
      isPaperTrading: false
    });

    assert.equal(result.success, false);
    assert.equal(result.status, "REJECTED");
    assert.equal(result.trId, "LIVE_SERVER_GATE_LOCKED");
    assert.match(result.message, /AISTOCK_ALLOW_LIVE_TRADING/);
  } finally {
    if (previous === undefined) delete process.env.AISTOCK_ALLOW_LIVE_TRADING;
    else process.env.AISTOCK_ALLOW_LIVE_TRADING = previous;
  }
});

test("browser adapter routes LIVE through server and separates ACK from FILL", () => {
  const source = read("src/services/v11/KISBrokerAdapter.ts");
  assert.match(source, /\/api\/broker\/v12\/account-balance\?market=KOREA&isPaper=false/);
  assert.match(source, /\/api\/broker\/v12\/order/);
  assert.match(source, /\/api\/broker\/v12\/fill-status/);
  assert.match(source, /waitForFinalFill/);
  assert.match(source, /status: data\.status === "FILLED" \|\| data\.status === "PARTIAL" \? data\.status : "PENDING"/);
});

test("LIVE engine blocks the legacy hard-coded Samsung test BUY", () => {
  const source = read("src/services/v11/AutonomousExecutionEngineV11.ts");
  assert.match(source, /isLegacyUiTestCandidate/);
  assert.match(source, /candidate\.price === 74800/);
  assert.match(source, /LIVE에서는 하드코딩된 테스트 BUY를 실행할 수 없습니다/);
});

test("LIVE automatic exit cannot use the synthetic fallback bar", () => {
  const source = read("src/services/v11/AutonomousExecutionEngineV11.ts");
  assert.match(source, /smStatus\.mode !== "LIVE"/);
  assert.match(source, /if \(this\.stateMachine\.getStatus\(\)\.mode === "LIVE"\) return/);
});

test("server validates current KIS quote and order notional before dispatch", () => {
  const source = read("server/broker/KISBrokerGatewayV121.ts");
  assert.match(source, /FHKST01010100/);
  assert.match(source, /AISTOCK_MAX_LIVE_PRICE_DEVIATION/);
  assert.match(source, /AISTOCK_MAX_LIVE_ORDER_KRW/);
  assert.match(source, /EXCG_ID_DVSN_CD: "KRX"/);
  assert.match(source, /status: "PENDING"/);
});
