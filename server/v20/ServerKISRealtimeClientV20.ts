// ----------------------------------------------------------------------
// SERVER KIS REALTIME CLIENT V20 (AISTOCK RC6)
// Upstream WebSocket client for KIS domestic/overseas market data + fills
// ----------------------------------------------------------------------

import WebSocket from "ws";
import { KISExecutionNoticeParserV20 } from "./KISExecutionNoticeParserV20";
import { brokerExecutionTruthBusV20 } from "./BrokerExecutionTruthBusV20";
import { KISOverseasParserV20 } from "./KISOverseasParserV20";
import { serverRealtimeMarketHubV20 } from "./ServerRealtimeMarketHubV20";
import { H0STCNT0 } from "../../src/services/KISRealtimeFieldSchema";

export interface KISRealtimeClientConfig {
  appKey: string;
  appSecret: string;
  approvalKey: string;
  htsId?: string;
  isPaper?: boolean;
  overseasRealtimeEntitled?: boolean;
}

export interface KISRealtimeStatusV20 {
  connected: boolean;
  connecting: boolean;
  paper: boolean;
  subscriptions: string[];
  lastMessageAt: number | null;
  reconnectCount: number;
  executionNoticeSubscribed: boolean;
}

type MarketTrId = "H0STCNT0" | "HDFSCNT0";

export class ServerKISRealtimeClientV20 {
  private ws: WebSocket | null = null;
  private readonly config: KISRealtimeClientConfig;
  private isConnected = false;
  private subscribedSymbols: Set<string> = new Set();
  private secretKeyHex = "";
  private secretIvHex = "";
  private reconnectTimer: NodeJS.Timeout | null = null;
  private closedIntentionally = false;
  private lastMessageAt: number | null = null;
  private reconnectCount = 0;
  private executionNoticeSubscribed = false;

  constructor(config: KISRealtimeClientConfig) {
    this.config = config;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) return;
    this.closedIntentionally = false;
    const domain = this.config.isPaper
      ? "ops.koreainvestment.com:31000"
      : "ops.koreainvestment.com:21000";
    const url = `ws://${domain}/tryitout/H0STCNT0`;

    try {
      this.ws = new WebSocket(url);
      this.ws.on("open", () => {
        this.isConnected = true;
        this.executionNoticeSubscribed = false;
        this.flushSubscriptions();
        if (this.config.htsId) this.subscribeExecutionNotice(this.config.htsId);
      });
      this.ws.on("message", (data: WebSocket.Data) => {
        this.lastMessageAt = Date.now();
        this.handleMessage(data.toString());
      });
      this.ws.on("close", () => {
        this.isConnected = false;
        this.executionNoticeSubscribed = false;
        this.ws = null;
        if (!this.closedIntentionally) this.scheduleReconnect();
      });
      this.ws.on("error", () => {});
    } catch (_) {
      this.ws = null;
      this.scheduleReconnect();
    }
  }

  public subscribeSymbol(symbol: string, trId: MarketTrId = "H0STCNT0"): void {
    const key = symbol.trim().toUpperCase();
    if (!key) return;
    this.subscribedSymbols.add(`${trId}:${key}`);
    if (this.isConnected) this.sendSubscription(trId, key);
  }

  public unsubscribeSymbol(symbol: string, trId: MarketTrId = "H0STCNT0"): void {
    const key = symbol.trim().toUpperCase();
    this.subscribedSymbols.delete(`${trId}:${key}`);
    if (!this.ws || !this.isConnected || !key) return;
    this.ws.send(JSON.stringify(this.subscriptionPayload(trId, key, "2")));
  }

  public subscribeExecutionNotice(htsId: string): void {
    if (!this.ws || !this.isConnected || !htsId) return;
    const trId = this.config.isPaper ? "H0STCNI9" : "H0STCNI0";
    this.ws.send(JSON.stringify(this.subscriptionPayload(trId, htsId, "1")));
    this.executionNoticeSubscribed = true;
  }

  public getStatus(): KISRealtimeStatusV20 {
    return {
      connected: this.isConnected && this.ws?.readyState === WebSocket.OPEN,
      connecting: this.ws?.readyState === WebSocket.CONNECTING,
      paper: Boolean(this.config.isPaper),
      subscriptions: Array.from(this.subscribedSymbols),
      lastMessageAt: this.lastMessageAt,
      reconnectCount: this.reconnectCount,
      executionNoticeSubscribed: this.executionNoticeSubscribed
    };
  }

  private flushSubscriptions(): void {
    for (const item of this.subscribedSymbols) {
      const splitAt = item.indexOf(":");
      const trId = item.slice(0, splitAt) as MarketTrId;
      const key = item.slice(splitAt + 1);
      if (key) this.sendSubscription(trId, key);
    }
  }

  private sendSubscription(trId: MarketTrId, key: string): void {
    if (!this.ws || !this.isConnected || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(this.subscriptionPayload(trId, key, "1")));
  }

  private subscriptionPayload(trId: string, trKey: string, trType: "1" | "2") {
    return {
      header: {
        approval_key: this.config.approvalKey,
        custtype: "P",
        tr_type: trType,
        "content-type": "utf-8"
      },
      body: { input: { tr_id: trId, tr_key: trKey } }
    };
  }

  private handleMessage(msg: string): void {
    if (!msg) return;
    if (msg.startsWith("{")) {
      try {
        const parsed = JSON.parse(msg);
        const jsonTrId = String(parsed?.header?.tr_id || "");
        if (jsonTrId === "PINGPONG") {
          try { this.ws?.pong(); } catch (_) {}
          return;
        }
        const executionIds = new Set(["H0STCNI0", "H0STCNI9", "H0GSCNI0", "H0GSCNI9"]);
        if (executionIds.has(jsonTrId) && parsed?.body?.output?.key && parsed?.body?.output?.iv) {
          this.secretKeyHex = String(parsed.body.output.key);
          this.secretIvHex = String(parsed.body.output.iv);
        }
      } catch (_) {}
      return;
    }

    const parts = msg.split("|");
    if (parts.length < 4) return;
    const trId = parts[1];
    const dataBody = parts.slice(3).join("|");

    if (["H0STCNI0", "H0STCNI9", "H0GSCNI0", "H0GSCNI9"].includes(trId)) {
      let payload = dataBody;
      if (this.secretKeyHex && this.secretIvHex) {
        payload = KISExecutionNoticeParserV20.decryptPayload(dataBody, this.secretKeyHex, this.secretIvHex);
      }
      const notice = KISExecutionNoticeParserV20.parse(trId, payload);
      if (notice?.isExecuted) brokerExecutionTruthBusV20.publish(notice);
      return;
    }

    if (trId === "H0STCNT0") {
      this.handleDomesticTrade(dataBody);
      return;
    }

    if (trId === "HDFSCNT0") {
      const tick = KISOverseasParserV20.parseHDFSCNT0(dataBody, Boolean(this.config.overseasRealtimeEntitled));
      if (!tick) return;
      serverRealtimeMarketHubV20.updateQuote(
        tick.symbol,
        tick.symbol,
        "US",
        tick.lastPrice,
        0,
        tick.ratePct,
        tick.totalVolume,
        tick.totalAmount,
        "KIS_HDFSCNT0",
        tick.grade,
        tick.askPrice,
        tick.bidPrice,
        tick.executedVolume
      );
    }
  }

  private handleDomesticTrade(dataBody: string): void {
    const f = dataBody.split("^");
    if (f.length <= H0STCNT0.ACC_TRADE_VALUE) return;

    const symbol = String(f[H0STCNT0.SYMBOL] || "").trim();
    const price = Number(f[H0STCNT0.PRICE] || 0);
    if (!symbol || !Number.isFinite(price) || price <= 0) return;

    const changeAmount = Number(f[H0STCNT0.PRDY_CHANGE] || 0);
    const changePct = Number(f[H0STCNT0.CHANGE_RATE] || 0);
    const executionVolume = Math.abs(Number(f[H0STCNT0.TRADE_VOLUME] || 0));
    const cumulativeVolume = Number(f[H0STCNT0.ACC_VOLUME] || 0);
    const cumulativeTradeValue = Number(f[H0STCNT0.ACC_TRADE_VALUE] || 0);
    const ask = Number(f[H0STCNT0.ASK1] || 0);
    const bid = Number(f[H0STCNT0.BID1] || 0);

    serverRealtimeMarketHubV20.updateQuote(
      symbol,
      symbol,
      "KOREA",
      price,
      changeAmount,
      changePct,
      cumulativeVolume,
      cumulativeTradeValue,
      "KIS_H0STCNT0",
      "EXECUTION_GRADE",
      ask,
      bid,
      executionVolume
    );
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectCount += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  public disconnect(): void {
    this.closedIntentionally = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.executionNoticeSubscribed = false;
  }
}
