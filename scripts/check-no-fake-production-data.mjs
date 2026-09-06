// ----------------------------------------------------------------------
// ZERO FAKE DATA PRODUCTION AUDIT SCRIPT
// ----------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");

const forbidden = [
  /tradeValue\s*\*\s*0\.1/,
  /SAMPLE_FLOW_DATA/,
  /m1:\s*true/
];

const allowedFolders = [
  `${path.sep}demo${path.sep}`,
  `${path.sep}test${path.sep}`,
  `${path.sep}tests${path.sep}`
];

let failed = false;

function scan(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scan(full);
      continue;
    }

    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      continue;
    }

    if (allowedFolders.some((folder) => full.includes(folder))) {
      continue;
    }

    const text = fs.readFileSync(full, "utf8");

    for (const pattern of forbidden) {
      if (pattern.test(text)) {
        console.error(`❌ FAKE DATA PATTERN FOUND IN PRODUCTION CODE: ${full}`);
        console.error(`   Pattern: ${pattern}`);
        failed = true;
      }
    }
  }
}

console.log("🔍 Running Production Zero Fake Data Audit...");
scan(ROOT);

if (failed) {
  console.error("💥 Zero Fake Data Audit FAILED!");
  process.exit(1);
} else {
  console.log("✅ Production Zero Fake Data Audit PASSED cleanly.");
}
