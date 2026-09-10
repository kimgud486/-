// ----------------------------------------------------------------------
// AISTOCK RC6 SERVER REALTIME PROVIDER RUNTIME
// Starts/stops KIS + Upbit providers and wires provider ticks into ServerRealtimeMarketHubV20.
// ----------------------------------------------------------------------

import { ServerKISRealtimeClientV20 } from "./ServerKISRealtimeClientV20";
import { serverUpbitRealtimeClientV20 } from "./ServerUpbitRealtimeClientV20";
import { serverRealtimeMarketHubV20 } from "./ServerRealtimeMarketHubV20";

export interface ServerRealtimeRuntimeStatusV20 {
  started: boolean;
  kisConfigured: boolean;
  kisApprovalReady: boolean;
  kis: ReturnType<ServerKISRealtimeClientV20["getStatus"]> | null;
  upbit: ReturnType<typeof serverUpbitRealtimeClientV20.getStatus>;
  hub: ReturnType<typeof serverRealtimeMarketHubV20.getStatus>;
  krSubscriptions: string[];
  usSubscriptions: string[];
  lastError: string | null;
}

function envFirst(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function parseExplicitList(raw: string): string[] {
  return Array.from(new Set(raw
    .split(/[;,\s]+/)
    .map(v => v.trim().toUpperCase())
    .filter(Boolean)));
}

export class ServerRealtimeRuntimeV20 {
  private kisClient: ServerKISRealtimeClientV20 | null = null;
  private started = false;
  private kisApprovalReady = false;
  private lastError: string | null = null;
  private upbitUnsubscribe: (() => void) | null = null;
  private krSubscriptions: string[] = [];
  private usSubscriptions: string[] = [];

  public async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.lastError = null;

    if (process.env.ENABLE_UPBIT_REALTIME !== "false") {
      const explicitUpbitMarkets = parseExplicitList(process.env.UPBIT_REALTIME_MARKETS || "");
      for (const market of explicitUpbitMarkets) serverUpbitRealtimeClientV20.subscribeMarket(market);
      this.upbitUnsubscribe = serverUpbitRealtimeClientV20.onTick(tick => {
        serverRealtimeMarketHubV20.updateQuote(
          tick.symbol,
          tick.symbol,
          "UPBIT",
          tick.price,
          tick.signedChangePrice,
          tick.signedChangeRate,
          tick.accTradeVolume24h,
          tick.accTradePrice24h,
          "UPBIT_WEBSOCKET",
          tick.grade,
          undefined,
          undefined,
          tick.tradeVolume
        );
      });
      serverUpbitRealtimeClientV20.connect();
    }

    const appKey = envFirst("KIS_APPKEY", "KIS_APP_KEY");
    const appSecret = envFirst("KIS_APPSECRET", "KIS_APP_SECRET");
    const htsId = envFirst("KIS_HTS_ID");
    const isPaper = process.env.KIS_IS_PAPER === "true" || process.env.KIS_ENV === "PAPER";
    this.krSubscriptions = parseExplicitList(process.env.KIS_KR_SYMBOLS || "");
    this.usSubscriptions = parseExplicitList(process.env.KIS_US_TR_KEYS || "");

    if (!appKey || !appSecret) return;

    try {
      const approvalKey = await this.requestApprovalKey(appKey, appSecret, isPaper);
      if (!approvalKey) {
        this.lastError = "KIS_APPROVAL_KEY_UNAVAILABLE";
        return;
      }
      this.kisApprovalReady = true;
      this.kisClient = new ServerKISRealtimeClientV20({
        appKey,
        appSecret,
        approvalKey,
        htsId: htsId || undefined,
        isPaper,
        overseasRealtimeEntitled: process.env.KIS_US_REALTIME_ENTITLED === "true"
      });

      // Queue desired subscriptions before connecting. Client replays them after every reconnect.
      for (const symbol of this.krSubscriptions) this.kisClient.subscribeSymbol(symbol, "H0STCNT0");
      for (const trKey of this.usSubscriptions) this.kisClient.subscribeSymbol(trKey, "HDFSCNT0");
      this.kisClient.connect();
    } catch (err: any) {
      this.lastError = err?.message || String(err);
    }
  }

  public stop(): void {
    this.started = false;
    this.kisApprovalReady = false;
    this.kisClient?.disconnect();
    this.kisClient = null;
    this.upbitUnsubscribe?.();
    this.upbitUnsubscribe = null;
    serverUpbitRealtimeClientV20.close();
  }

  public getStatus(): ServerRealtimeRuntimeStatusV20 {
    const appKey = envFirst("KIS_APPKEY", "KIS_APP_KEY");
    const appSecret = envFirst("KIS_APPSECRET", "KIS_APP_SECRET");
    return {
      started: this.started,
      kisConfigured: Boolean(appKey && appSecret),
      kisApprovalReady: this.kisApprovalReady,
      kis: this.kisClient?.getStatus() || null,
      upbit: serverUpbitRealtimeClientV20.getStatus(),
      hub: serverRealtimeMarketHubV20.getStatus(),
      krSubscriptions: [...this.krSubscriptions],
      usSubscriptions: [...this.usSubscriptions],
      lastError: this.lastError
    };
  }

  private async requestApprovalKey(appKey: string, appSecret: string, isPaper: boolean): Promise<string | null> {
    const base = isPaper
      ? "https://openapivts.koreainvestment.com:29443"
      : "https://openapi.koreainvestment.com:9443";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(`${base}/oauth2/Approval`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          appkey: appKey,
          secretkey: appSecret
        }),
        signal: controller.signal
      });
      if (!res.ok) return null;
      const data = await res.json();
      const approvalKey = String(data?.approval_key || "").trim();
      return approvalKey || null;
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const serverRealtimeRuntimeV20 = new ServerRealtimeRuntimeV20();
