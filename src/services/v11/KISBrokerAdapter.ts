// AISTOCK 24 v11 Browser Broker Adapter
// PAPER stays local. DRY_RUN never transmits. LIVE is server-authoritative.

export type KISExecutionMode = "PAPER" | "DRY_RUN" | "LIVE";

export interface KISCredentials {
  appKey: string;
  appSecret: string;
  accountNo: string;
  productCode: string;
  isPaperTrading: boolean;
}

export interface KISOrderRequest {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  side: "BUY" | "SELL";
  price: number;
  qty: number;
  orderType: "LIMIT" | "MARKET";
}

export interface KISOrderResult {
  success: boolean;
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  qty: number;
  status: "PENDING" | "FILLED" | "PARTIAL" | "CANCELLED" | "REJECTED";
  filledQty: number;
  filledAvgPrice: number;
  message: string;
  timestamp: string;
}

export interface KISPosition {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  qty: number;
  avgBuyPrice: number;
  currentPrice: number;
  evalAmount: number;
  pnlAmount: number;
  pnlPct: number;
}

export interface KISBalance {
  totalEvalAmount: number;
  cashBalance: number;
  buyingPower: number;
  realizedPnLToday: number;
  unrealizedPnLToday: number;
}

export interface KISLiveReadinessResult {
  ready: boolean;
  reason: string;
  brokerConfigured: boolean;
  accountVerified: boolean;
  buyingPower: number;
}

interface ServerOrderResponse {
  success?: boolean;
  orderNo?: string;
  status?: KISOrderResult["status"] | "NOT_CONFIGURED";
  filledQty?: number;
  filledAvgPrice?: number;
  message?: string;
}

interface ServerFillResponse {
  isFilled?: boolean;
  filledQty?: number;
  filledAvgPrice?: number;
  status?: KISOrderResult["status"];
  message?: string;
}

export class KISBrokerAdapter {
  private mode: KISExecutionMode = "PAPER";
  private liveTradingEnabled = false;
  private localPositions = new Map<string, KISPosition>();
  private localCashBalance = 10_000_000;

  constructor(_customCredentials?: Partial<KISCredentials>) {}

  public setExecutionMode(mode: KISExecutionMode, liveTradingEnabled = false): void {
    this.mode = mode;
    this.liveTradingEnabled = mode === "LIVE" && liveTradingEnabled;
  }

  public getExecutionMode(): KISExecutionMode {
    return this.mode;
  }

  public getCredentials(): KISCredentials {
    // LIVE credentials must never be exposed to the browser bundle.
    return {
      appKey: "",
      appSecret: "",
      accountNo: "",
      productCode: "01",
      isPaperTrading: this.mode !== "LIVE"
    };
  }

  public async ensureAccessToken(): Promise<string> {
    if (this.mode === "LIVE") {
      throw new Error("LIVE OAuth is server-only.");
    }
    return `LOCAL_${this.mode}_${Date.now()}`;
  }

  /**
   * LIVE button preflight. A real KIS account query must succeed before the
   * engine is allowed to switch its state machine to LIVE.
   */
  public async verifyLiveReadiness(): Promise<KISLiveReadinessResult> {
    try {
      const res = await fetch("/api/broker/v12/account-balance?market=KOREA&isPaper=false", {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store"
      });
      const data = await res.json().catch(() => ({}));
      const buyingPower = Number(data?.depositKRW ?? data?.buyingPower ?? 0);
      const ready = res.ok && data?.success === true && Number.isFinite(buyingPower) && buyingPower >= 0;

      return {
        ready,
        reason: ready
          ? "KIS 실계좌 조회 성공"
          : data?.message || `KIS 실계좌 검증 실패 HTTP ${res.status}`,
        brokerConfigured: data?.success !== false || !String(data?.message || "").includes("미설정"),
        accountVerified: ready,
        buyingPower: ready ? buyingPower : 0
      };
    } catch (err: any) {
      return {
        ready: false,
        reason: `KIS 실계좌 검증 서버 연결 실패: ${err?.message || String(err)}`,
        brokerConfigured: false,
        accountVerified: false,
        buyingPower: 0
      };
    }
  }

  public async deactivateLiveSession(): Promise<void> {
    this.liveTradingEnabled = false;
    if (this.mode === "LIVE") this.mode = "PAPER";
  }

  public async placeOrder(req: KISOrderRequest): Promise<KISOrderResult> {
    if (!Number.isFinite(req.price) || req.price <= 0 || !Number.isInteger(req.qty) || req.qty <= 0) {
      return this.reject(req, "주문 가격/수량 검증 실패");
    }

    if (this.mode === "PAPER") {
      return this.placePaperOrder(req);
    }

    if (this.mode === "DRY_RUN") {
      return {
        success: true,
        orderId: `DRY_RUN_${Date.now()}`,
        symbol: req.symbol,
        side: req.side,
        price: req.price,
        qty: req.qty,
        status: "PENDING",
        filledQty: 0,
        filledAvgPrice: 0,
        message: `[DRY_RUN] ${req.name} ${req.side} 주문 검증 완료. 증권사 전송 없음.`,
        timestamp: new Date().toLocaleTimeString("ko-KR")
      };
    }

    if (!this.liveTradingEnabled) {
      return this.reject(req, "LIVE 실거래 이중 잠금이 승인되지 않았습니다.");
    }

    // Do not guess overseas exchange routing. Promote US separately after exact routing is verified.
    if (req.market !== "KOREA") {
      return this.reject(req, "현재 LIVE 자동주문은 KOSPI/KOSDAQ만 허용됩니다.");
    }

    try {
      const res = await fetch("/api/broker/v12/order", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          symbol: req.symbol,
          name: req.name,
          market: req.market,
          side: req.side,
          price: req.price,
          qty: req.qty,
          orderType: req.orderType,
          isPaperTrading: false
        })
      });
      const data: ServerOrderResponse = await res.json().catch(() => ({}));

      if (!res.ok || data.success !== true || !data.orderNo) {
        return this.reject(req, data.message || `KIS 주문 전송 실패 HTTP ${res.status}`);
      }

      return {
        success: true,
        orderId: String(data.orderNo),
        symbol: req.symbol,
        side: req.side,
        price: req.price,
        qty: req.qty,
        status: data.status === "FILLED" || data.status === "PARTIAL" ? data.status : "PENDING",
        filledQty: Number(data.filledQty || 0),
        filledAvgPrice: Number(data.filledAvgPrice || 0),
        message: data.message || `KIS 주문 접수 ODNO=${data.orderNo}`,
        timestamp: new Date().toLocaleTimeString("ko-KR")
      };
    } catch (err: any) {
      return this.reject(req, `KIS LIVE 주문 통신 실패: ${err?.message || String(err)}`);
    }
  }

  /** Broker ACK is not a fill. Poll the real server-side KIS fill inquiry. */
  public async waitForFinalFill(
    orderId: string,
    req: KISOrderRequest,
    timeoutMs = 120_000,
    intervalMs = 1_500
  ): Promise<KISOrderResult> {
    const startedAt = Date.now();
    let lastStatus: KISOrderResult["status"] = "PENDING";
    let lastFilledQty = 0;
    let lastFilledAvgPrice = 0;
    let lastMessage = `KIS 체결 대기 ODNO=${orderId}`;

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const qs = new URLSearchParams({
          orderNo: orderId,
          symbol: req.symbol,
          market: req.market,
          isPaper: "false"
        });
        const res = await fetch(`/api/broker/v12/fill-status?${qs.toString()}`, {
          method: "GET",
          headers: { accept: "application/json" },
          cache: "no-store"
        });
        const data: ServerFillResponse = await res.json().catch(() => ({}));

        if (res.ok) {
          lastStatus = data.status || "PENDING";
          lastFilledQty = Number(data.filledQty || 0);
          lastFilledAvgPrice = Number(data.filledAvgPrice || 0);
          lastMessage = data.message || lastMessage;

          if (lastStatus === "FILLED" || data.isFilled === true) {
            return {
              success: true,
              orderId,
              symbol: req.symbol,
              side: req.side,
              price: req.price,
              qty: req.qty,
              status: "FILLED",
              filledQty: lastFilledQty,
              filledAvgPrice: lastFilledAvgPrice,
              message: lastMessage,
              timestamp: new Date().toLocaleTimeString("ko-KR")
            };
          }

          if (lastStatus === "REJECTED" || lastStatus === "CANCELLED") {
            return {
              success: false,
              orderId,
              symbol: req.symbol,
              side: req.side,
              price: req.price,
              qty: req.qty,
              status: lastStatus,
              filledQty: lastFilledQty,
              filledAvgPrice: lastFilledAvgPrice,
              message: lastMessage,
              timestamp: new Date().toLocaleTimeString("ko-KR")
            };
          }
        }
      } catch (err: any) {
        lastMessage = `체결조회 일시 실패: ${err?.message || String(err)}`;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return {
      success: true,
      orderId,
      symbol: req.symbol,
      side: req.side,
      price: req.price,
      qty: req.qty,
      status: lastFilledQty > 0 ? "PARTIAL" : lastStatus,
      filledQty: lastFilledQty,
      filledAvgPrice: lastFilledAvgPrice,
      message: `${lastMessage} | 체결확인 제한시간 초과. 계좌 대조 전 신규 주문을 잠가야 합니다.`,
      timestamp: new Date().toLocaleTimeString("ko-KR")
    };
  }

  public async getOrderStatus(_orderId: string): Promise<KISOrderResult | null> {
    return null;
  }

  public async cancelOrder(_orderId: string): Promise<boolean> {
    // Fail closed until the real cancel endpoint is wired to this UI adapter.
    return false;
  }

  public async getPositions(): Promise<KISPosition[]> {
    return this.mode === "LIVE" ? [] : Array.from(this.localPositions.values());
  }

  public async getBalance(): Promise<KISBalance> {
    if (this.mode === "LIVE") {
      try {
        const res = await fetch("/api/broker/v12/account-balance?market=KOREA&isPaper=false", {
          cache: "no-store"
        });
        const data = await res.json();
        if (res.ok && data?.success === true) {
          const cash = Number(data.depositKRW ?? data.buyingPower ?? 0);
          const total = Number(data.totalEvalAmt ?? cash);
          return {
            totalEvalAmount: Number.isFinite(total) ? total : 0,
            cashBalance: Number.isFinite(cash) ? cash : 0,
            buyingPower: Number.isFinite(cash) ? cash : 0,
            realizedPnLToday: 0,
            unrealizedPnLToday: 0
          };
        }
      } catch (_) {}

      return {
        totalEvalAmount: 0,
        cashBalance: 0,
        buyingPower: 0,
        realizedPnLToday: 0,
        unrealizedPnLToday: 0
      };
    }

    let totalEval = this.localCashBalance;
    let unrealizedPnl = 0;
    this.localPositions.forEach(pos => {
      totalEval += pos.currentPrice * pos.qty;
      unrealizedPnl += (pos.currentPrice - pos.avgBuyPrice) * pos.qty;
    });

    return {
      totalEvalAmount: totalEval,
      cashBalance: this.localCashBalance,
      buyingPower: Math.round(this.localCashBalance * 0.95),
      realizedPnLToday: 0,
      unrealizedPnLToday: unrealizedPnl
    };
  }

  public async reconcilePositions(): Promise<{ synchronized: boolean; reconciledCount: number; message: string }> {
    if (this.mode !== "LIVE") {
      return {
        synchronized: true,
        reconciledCount: this.localPositions.size,
        message: `PAPER 로컬 포지션 동기화 완료 (${this.localPositions.size}개)`
      };
    }

    try {
      const res = await fetch("/api/broker/v12/reconcile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activePosition: null, mode: "LIVE" })
      });
      const data = await res.json();
      return {
        synchronized: res.ok && data?.matched !== false && data?.autoTradingLocked !== true,
        reconciledCount: 0,
        message: data?.message || "KIS 실계좌 대조 완료"
      };
    } catch (err: any) {
      return { synchronized: false, reconciledCount: 0, message: err?.message || "계좌 대조 실패" };
    }
  }

  public connectWebSocket(_onExecutionEvent: (event: any) => void): void {
    // Browser broker websocket intentionally disabled. Server V20 owns credentials/fill notices.
  }

  public disconnectWebSocket(): void {}

  private placePaperOrder(req: KISOrderRequest): KISOrderResult {
    const timestamp = new Date().toLocaleTimeString("ko-KR");
    const orderId = `PAPER_${req.market}_${Date.now()}`;
    const totalCost = req.price * req.qty;
    const isUs = req.market === "US";

    if (req.side === "BUY" && !isUs && totalCost > this.localCashBalance) {
      return this.reject(req, "PAPER 예수금 부족");
    }

    if (req.side === "BUY") {
      if (!isUs) this.localCashBalance -= totalCost;
      const existing = this.localPositions.get(req.symbol);
      if (existing) {
        const newQty = existing.qty + req.qty;
        existing.avgBuyPrice = (existing.avgBuyPrice * existing.qty + req.price * req.qty) / newQty;
        existing.qty = newQty;
        existing.currentPrice = req.price;
      } else {
        this.localPositions.set(req.symbol, {
          symbol: req.symbol,
          name: req.name,
          market: req.market,
          qty: req.qty,
          avgBuyPrice: req.price,
          currentPrice: req.price,
          evalAmount: totalCost,
          pnlAmount: 0,
          pnlPct: 0
        });
      }
    } else {
      const existing = this.localPositions.get(req.symbol);
      if (existing) {
        if (!isUs) this.localCashBalance += totalCost;
        this.localPositions.delete(req.symbol);
      }
    }

    return {
      success: true,
      orderId,
      symbol: req.symbol,
      side: req.side,
      price: req.price,
      qty: req.qty,
      status: "FILLED",
      filledQty: req.qty,
      filledAvgPrice: req.price,
      message: `[PAPER ${req.market} ${req.side}] ${req.name} ${req.qty}주 모의체결`,
      timestamp
    };
  }

  private reject(req: KISOrderRequest, message: string): KISOrderResult {
    return {
      success: false,
      orderId: "",
      symbol: req.symbol,
      side: req.side,
      price: req.price,
      qty: req.qty,
      status: "REJECTED",
      filledQty: 0,
      filledAvgPrice: 0,
      message,
      timestamp: new Date().toLocaleTimeString("ko-KR")
    };
  }
}
