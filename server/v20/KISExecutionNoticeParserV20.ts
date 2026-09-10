// ----------------------------------------------------------------------
// KIS EXECUTION NOTICE PARSER V20 (AISTOCK RC6)
// Parses decrypted KIS account execution notices with deterministic dedup IDs
// ----------------------------------------------------------------------

import crypto from "crypto";
import { H0STCNI0, H0GSCNI0 } from "../../src/services/KISRealtimeFieldSchema";

export interface ParsedExecutionNotice {
  rawTrId: string;
  noticeId: string;
  accountNo: string;
  orderId: string;
  originalOrderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  execQty: number;
  execPrice: number;
  orderQty: number;
  remainingQty: number;
  isExecuted: boolean;
  execTime: string;
  timestamp: number;
  rawFields: string[];
}

const DOMESTIC_EXECUTION_IDS = new Set(["H0STCNI0", "H0STCNI9"]);
const OVERSEAS_EXECUTION_IDS = new Set(["H0GSCNI0", "H0GSCNI9"]);

export class KISExecutionNoticeParserV20 {
  public static decryptPayload(encryptedBase64: string, keyText: string, ivText: string): string {
    try {
      const key = Buffer.from(keyText, "utf8");
      const iv = Buffer.from(ivText, "utf8");
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encryptedBase64, "base64", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (_) {
      // Returning the original payload lets parse() fail closed if it is not valid caret data.
      return encryptedBase64;
    }
  }

  public static parse(trId: string, rawData: string): ParsedExecutionNotice | null {
    if (!rawData) return null;

    const isDomestic = DOMESTIC_EXECUTION_IDS.has(trId);
    const isOverseas = OVERSEAS_EXECUTION_IDS.has(trId);
    if (!isDomestic && !isOverseas) return null;

    const fields = rawData.split("^");
    if (fields.length < 10) return null;
    const schema = isDomestic ? H0STCNI0 : H0GSCNI0;

    const accountNo = String(fields[schema.ACCOUNT_NO] || "").trim();
    const orderId = String(fields[schema.ORDER_ID] || "").trim();
    const originalOrderId = String(fields[schema.ORIGINAL_ORDER_ID] || "").trim();
    const symbol = String(fields[schema.SYMBOL] || "").trim().toUpperCase();
    const sideCode = String(fields[schema.SIDE_CODE] || "").trim();
    if (!orderId || !symbol || (sideCode !== "01" && sideCode !== "02")) return null;

    const side: "BUY" | "SELL" = sideCode === "01" ? "SELL" : "BUY";
    const execQty = Number(fields[schema.EXEC_QTY] || 0);
    const execPrice = Number(fields[schema.EXEC_PRICE] || 0);
    const orderQty = Number(fields[schema.ORDER_QTY] || 0);
    const execFlag = String(fields[schema.EXEC_FLAG] || "").trim();
    const execTime = String(fields[schema.EXEC_TIME] || "").trim();

    // Project schema defines 1 as confirmed execution. Quantity alone must never promote a packet to a fill.
    const isExecuted = execFlag === "1" && execQty > 0 && execPrice > 0;
    const safeExecQty = Number.isFinite(execQty) && execQty > 0 ? execQty : 0;
    const safeExecPrice = Number.isFinite(execPrice) && execPrice > 0 ? execPrice : 0;
    const safeOrderQty = Number.isFinite(orderQty) && orderQty > 0 ? orderQty : 0;

    // Deterministic across reconnect/replay so BrokerExecutionTruthBusV20 can deduplicate safely.
    const noticeKey = [
      trId,
      accountNo,
      orderId,
      originalOrderId,
      symbol,
      side,
      execTime,
      safeExecQty,
      safeExecPrice
    ].join("|");
    const noticeId = `kis_${crypto.createHash("sha256").update(noticeKey).digest("hex").slice(0, 32)}`;

    return {
      rawTrId: trId,
      noticeId,
      accountNo,
      orderId,
      originalOrderId,
      symbol,
      side,
      execQty: safeExecQty,
      execPrice: safeExecPrice,
      orderQty: safeOrderQty,
      remainingQty: safeOrderQty > 0 ? Math.max(0, safeOrderQty - safeExecQty) : 0,
      isExecuted,
      execTime,
      timestamp: Date.now(),
      rawFields: fields
    };
  }
}
