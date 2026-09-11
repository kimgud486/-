// ----------------------------------------------------------------------
// AISTOCK V20 UPBIT REALTIME WEBSOCKET CLIENT & TICKER HUB
// Connects to wss://api.upbit.com/websocket/v1 for 24/7 execution-grade crypto stream
// ----------------------------------------------------------------------

import { WebSocket } from "ws";

export interface UpbitRealtimeTickV20 {
  type: "ticker" | "trade" | "orderbook";
  symbol: string;
  price: number;
  signedChangePrice: number;
  signedChangeRate: number;
  accTradeVolume24h: number;
  accTradePrice24h: number;
  highest52WeekPrice: number;
  lowest52WeekPrice: number;
  tradeVolume: number;
  askBid: "ASK" | "BID";
  timestamp: number;
  grade: "EXECUTION_GRADE";
}

export interface UpbitRealtimeStatusV20 {
  connected: boolean;
  connecting: boolean;
  subscribedMarkets: string[];
  lastMessageAt: number | null;
  reconnectCount: number;
}

export type UpbitTickCallbackV20 = (tick: UpbitRealtimeTickV20) => void;

export class ServerUpbitRealtimeClientV20 {
  private ws: WebSocket | null = null;
  private subscribedMarkets: Set<string> = new Set(["KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL"]);
  private listeners: Set<UpbitTickCallbackV20> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isClosedIntentionally = false;
  private lastMessageAt: number | null = null;
  private reconnectCount = 0;

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isClosedIntentionally = false;
    try {
      this.ws = new WebSocket("wss://api.upbit.com/websocket/v1");

      this.ws.on("open", () => {
        this.sendSubscription();
      });

      this.ws.on("message", (data: Buffer | string) => {
        try {
          const parsed = JSON.parse(data.toString("utf8"));
          if (!parsed || !parsed.code || !Number.isFinite(Number(parsed.trade_price))) return;

          this.lastMessageAt = Date.now();
          const tick: UpbitRealtimeTickV20 = {
            type: "ticker",
            symbol: String(parsed.code).replace("KRW-", ""),
            price: Number(parsed.trade_price),
            signedChangePrice: Number(parsed.signed_change_price || 0),
            signedChangeRate: Number(parsed.signed_change_rate || 0) * 100,
            accTradeVolume24h: Number(parsed.acc_trade_volume_24h || 0),
            accTradePrice24h: Number(parsed.acc_trade_price_24h || 0),
            highest52WeekPrice: Number(parsed.highest_52_week_price || 0),
            lowest52WeekPrice: Number(parsed.lowest_52_week_price || 0),
            tradeVolume: Number(parsed.trade_volume || 0),
            askBid: parsed.ask_bid === "ASK" ? "ASK" : "BID",
            timestamp: Number(parsed.timestamp || Date.now()),
            grade: "EXECUTION_GRADE"
          };

          for (const callback of this.listeners) callback(tick);
        } catch (_) {
          // Malformed provider packets are ignored rather than converted into synthetic ticks.
        }
      });

      this.ws.on("error", () => {
        // close event owns reconnect scheduling
      });

      this.ws.on("close", () => {
        this.ws = null;
        if (!this.isClosedIntentionally) this.scheduleReconnect();
      });
    } catch (_) {
      this.ws = null;
      this.scheduleReconnect();
    }
  }

  public subscribeMarket(symbol: string): void {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;
    const market = normalized.startsWith("KRW-") ? normalized : `KRW-${normalized}`;
    if (!this.subscribedMarkets.has(market)) {
      this.subscribedMarkets.add(market);
      if (this.ws?.readyState === WebSocket.OPEN) this.sendSubscription();
    }
  }

  public onTick(callback: UpbitTickCallbackV20): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public getStatus(): UpbitRealtimeStatusV20 {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      connecting: this.ws?.readyState === WebSocket.CONNECTING,
      subscribedMarkets: Array.from(this.subscribedMarkets),
      lastMessageAt: this.lastMessageAt,
      reconnectCount: this.reconnectCount
    };
  }

  private sendSubscription(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify([
      { ticket: "AISTOCK_V20_SERVER_HUB" },
      { type: "ticker", codes: Array.from(this.subscribedMarkets) },
      { format: "DEFAULT" }
    ]));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectCount += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  public close(): void {
    this.isClosedIntentionally = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const serverUpbitRealtimeClientV20 = new ServerUpbitRealtimeClientV20();
