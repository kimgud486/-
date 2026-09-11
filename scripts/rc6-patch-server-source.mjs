import fs from "node:fs";

const path = "server.ts";
let source = fs.readFileSync(path, "utf8");
let changes = 0;

function replaceOne(regex, replacement, label) {
  const matches = source.match(new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g")) || [];
  if (matches.length !== 1) throw new Error(`${label}: expected 1 match, found ${matches.length}`);
  source = source.replace(regex, replacement);
  changes += 1;
  console.log(`patched: ${label}`);
}

// 1) Legacy endpoint used to fabricate EXECUTED/KIS fill text without a broker call.
replaceOne(
  /app\.post\("\/api\/autotrade\/order", \(req, res\) => \{[\s\S]*?\n\}\);\n\n(?=app\.get\("\/api\/autotrade\/status")/,
  `app.post("/api/autotrade/order", (_req, res) => {\n  return res.status(410).json({\n    success: false,\n    status: "DISABLED_LEGACY_ENDPOINT",\n    message: "Legacy simulated auto-trade endpoint is disabled. Use /api/broker/v12/order after the verified LIVE gate."\n  });\n});\n\n`,
  "disable fake legacy autotrade order"
);

// 2) Remove fake CONNECTED/PRODUCTION broker status and expose actual V20 runtime state.
replaceOne(
  /app\.get\("\/api\/autotrade\/status", \(req, res\) => \{[\s\S]*?\n\}\);\n\n(?=\/\/ Deep Theme & Sector Search Endpoint)/,
  `app.get("/api/autotrade/status", (_req, res) => {\n  return res.json({\n    active: false,\n    legacyEndpointDisabled: true,\n    executionEndpoint: "/api/broker/v12/order",\n    runtime: brokerExecutionRuntimeBridgeV20.getStatus(),\n    message: "Legacy simulated execution is disabled. Runtime state is provider-derived."\n  });\n});\n\napp.get("/api/v20/realtime/status", (_req, res) => {\n  const status = brokerExecutionRuntimeBridgeV20.getStatus();\n  return res.json({\n    ...status,\n    timestamp: Date.now()\n  });\n});\n\n`,
  "truthful autotrade and realtime status"
);

// 3) Never turn an unavailable market-data provider into a fixed 50,000 KRW quote.
replaceOne(
  /  \/\/ Tier 3: Internal Universe fallback to ensure 100% endpoint reliability[\s\S]*?  return res\.json\(\{ datas: universeFallback \}\);/,
  `  return res.status(503).json({\n    datas: [],\n    dataStatus: "NO_DATA",\n    message: "Realtime market providers unavailable. No synthetic fallback was generated."\n  });`,
  "remove fixed-price market batch fallback"
);

// 4) WebSocket snapshots are provider-cache only, never demo fixtures.
if (source.includes("data: cachedList.length > 0 ? cachedList : DEMO_STOCKS,")) {
  source = source.replace("data: cachedList.length > 0 ? cachedList : DEMO_STOCKS,", "data: cachedList,");
  changes += 1;
  console.log("patched: websocket demo snapshot fallback");
}

// 5) Failed stock-list hydration must signal no data rather than return demo quotes.
if (source.includes("return res.json(DEMO_STOCKS);")) {
  source = source.replaceAll("return res.json(DEMO_STOCKS);", "return res.status(503).json([]);");
  changes += 1;
  console.log("patched: stock list demo fallback");
}

// 6) Unknown stock detail starts as unknown price, not fabricated KRX/BTC/US anchors.
const fakePresetPrice = 'price: marketType === "KOREA" ? 50000 : marketType === "BTC" ? 100000000 : 100,';
if (source.includes(fakePresetPrice)) {
  source = source.replace(fakePresetPrice, "price: 0,");
  changes += 1;
  console.log("patched: unknown stock fixed initial price");
}

// 7) A missing quote invalidates market-close prediction input instead of assuming 50,000 KRW.
const predictionFallback = "const basePrice = quote.price > 0 ? quote.price : 50000;";
if (source.includes(predictionFallback)) {
  source = source.replace(
    predictionFallback,
    `if (!quote.price || quote.price <= 0) {\n      return res.status(503).json({ success: false, dataStatus: "NO_DATA", message: "Verified quote unavailable" });\n    }\n    const basePrice = quote.price;`
  );
  changes += 1;
  console.log("patched: market-close fixed base price");
}

if (changes === 0) {
  console.log("RC6 server source already hardened; no changes required.");
  process.exit(0);
}

fs.writeFileSync(path, source, "utf8");
console.log(`RC6 server.ts hardening complete (${changes} patches).`);
