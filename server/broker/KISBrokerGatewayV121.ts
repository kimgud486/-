// AISTOCK v12.1 compatibility gateway backed by V12.3 fill/balance truth.
// Domestic LIVE dispatch is overridden here so server.ts uses the current KIS
// cash-order contract while retaining V12.3 OAuth, fill and balance engines.

import {
  KISBrokerGatewayV123,
  KIS_REAL_REST_DOMAIN
} from "./KISBrokerGatewayV123";
import type {
  KISOrderRequest,
  KISOrderGatewayResponse,
  KISFillCheckResult
} from "./KISBrokerGatewayV123";

export type {
  KISOrderRequest,
  KISOrderGatewayResponse,
  KISFillCheckResult
} from "./KISBrokerGatewayV123";

export class KISBrokerGatewayV121 {
  private readonly delegate = new KISBrokerGatewayV123();
  private readonly appKey = process.env.KIS_APPKEY || "";
  private readonly appSecret = process.env.KIS_APPSECRET || "";
  private readonly accountNo = process.env.KIS_CANO || "";
  private readonly productCode = process.env.KIS_ACNT_PRDT_CD || "01";

  public isConfigured(): boolean {
    return this.delegate.isConfigured();
  }

  public getTRID(
    market: "KOREA" | "US" | "BTC",
    side: "BUY" | "SELL",
    isPaper: boolean
  ): string {
    if (isPaper) return "REJECTED_PAPER_TR";
    if (market !== "KOREA") return "LIVE_MARKET_NOT_VERIFIED";
    return side === "BUY" ? "TTTC0012U" : "TTTC0011U";
  }

  /**
   * Real LIVE order dispatch used by /api/broker/v12/order.
   * Fail closed unless server LIVE, OAuth, real quote and notional checks pass.
   */
  public async executeOrder(req: KISOrderRequest): Promise<KISOrderGatewayResponse> {
    const timestamp = new Date().toLocaleTimeString("ko-KR");

    if (process.env.AISTOCK_ALLOW_LIVE_TRADING !== "true") {
      return this.reject(
        req,
        "LIVE_SERVER_GATE_LOCKED",
        "⛔ 서버 실거래 게이트가 잠겨 있습니다. AISTOCK_ALLOW_LIVE_TRADING=true 설정이 필요합니다.",
        timestamp
      );
    }

    if (req.isPaperTrading) {
      return this.reject(
        req,
        "REJECTED_PAPER_TR",
        "⛔ 실거래 주문 게이트에서는 PAPER 주문을 전송하지 않습니다.",
        timestamp
      );
    }

    if (req.market !== "KOREA") {
      return this.reject(
        req,
        "LIVE_MARKET_NOT_VERIFIED",
        "⛔ 현재 LIVE 자동주문은 KOSPI/KOSDAQ만 허용됩니다. 미국 거래소 코드는 추측하지 않습니다.",
        timestamp
      );
    }

    if (!/^\d{6,7}$/.test(String(req.symbol || ""))) {
      return this.reject(req, "INVALID_PDNO", "⛔ 국내주식 종목코드 형식이 올바르지 않습니다.", timestamp);
    }

    if (!Number.isInteger(req.qty) || req.qty <= 0) {
      return this.reject(req, "INVALID_QTY", "⛔ 주문수량은 1주 이상의 정수여야 합니다.", timestamp);
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        orderNo: "",
        symbol: req.symbol,
        side: req.side,
        status: "NOT_CONFIGURED",
        filledQty: 0,
        filledAvgPrice: 0,
        message: "❌ KIS_APPKEY / KIS_APPSECRET / KIS_CANO 환경변수가 미설정되었습니다.",
        trId: "NONE",
        timestamp
      };
    }

    const token = await this.delegate.getOAuthToken(false);
    const trId = this.getTRID(req.market, req.side, false);
    if (!token) {
      return this.reject(
        req,
        trId,
        "⛔ KIS OAuth2 토큰 발급 실패. 주문을 전송하지 않았습니다.",
        timestamp
      );
    }

    // Server-side quote truth check. Never trust a browser/test price for LIVE sizing.
    const livePrice = await this.getDomesticCurrentPrice(req.symbol, token);
    if (!livePrice || livePrice <= 0) {
      return this.reject(
        req,
        trId,
        "⛔ KIS 현재가 검증 실패. 실제 주문을 전송하지 않았습니다.",
        timestamp
      );
    }

    const clientPrice = Number(req.price || 0);
    const maxDeviation = this.safePositiveNumber(process.env.AISTOCK_MAX_LIVE_PRICE_DEVIATION, 0.03);
    if (clientPrice <= 0 || Math.abs(clientPrice - livePrice) / livePrice > maxDeviation) {
      return this.reject(
        req,
        trId,
        `⛔ LIVE 가격 검증 실패. client=${clientPrice} / KIS=${livePrice} / 허용오차=${(maxDeviation * 100).toFixed(1)}%`,
        timestamp
      );
    }

    const maxOrderKRW = this.safePositiveNumber(process.env.AISTOCK_MAX_LIVE_ORDER_KRW, 5_000_000);
    const liveNotional = livePrice * req.qty;
    if (liveNotional > maxOrderKRW) {
      return this.reject(
        req,
        trId,
        `⛔ 서버 단일주문 한도 초과. ${Math.round(liveNotional).toLocaleString()}원 > ${Math.round(maxOrderKRW).toLocaleString()}원`,
        timestamp
      );
    }

    const isMarketOrder = req.orderType === "MARKET";
    const payload = {
      CANO: this.accountNo,
      ACNT_PRDT_CD: this.productCode,
      PDNO: req.symbol,
      ORD_DVSN: isMarketOrder ? "01" : "00",
      ORD_QTY: String(req.qty),
      ORD_UNPR: isMarketOrder ? "0" : String(req.price),
      EXCG_ID_DVSN_CD: "KRX",
      SLL_TYPE: "",
      CNDT_PRIC: ""
    };

    try {
      const res = await fetch(`${KIS_REAL_REST_DOMAIN}/uapi/domestic-stock/v1/trading/order-cash`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
          appkey: this.appKey,
          appsecret: this.appSecret,
          tr_id: trId,
          custtype: "P"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return this.reject(
          req,
          trId,
          `🚨 KIS 주문 HTTP ${res.status}: ${String(data?.msg1 || data?.message || "broker error").slice(0, 160)}`,
          timestamp
        );
      }

      if (data?.rt_cd !== "0" || !data?.output?.ODNO) {
        return this.reject(
          req,
          trId,
          `❌ KIS 주문 거부: ${data?.msg1 || "ODNO 주문번호 미발급"}`,
          timestamp
        );
      }

      const orderNo = String(data.output.ODNO).trim();
      return {
        success: true,
        orderNo,
        symbol: req.symbol,
        side: req.side,
        status: "PENDING",
        filledQty: 0,
        filledAvgPrice: 0,
        message: `✅ KIS 주문 접수 ODNO:${orderNo} | KIS현재가:${livePrice.toLocaleString()}원 | 실제 체결 확인 대기`,
        trId,
        timestamp
      };
    } catch (err: any) {
      return this.reject(
        req,
        trId,
        `🚨 KIS 주문 통신 오류: ${err?.message || String(err)}`,
        timestamp
      );
    }
  }

  public async checkFillStatus(
    orderNo: string,
    symbol: string,
    market: "KOREA" | "US" | "BTC" = "KOREA",
    isPaper = false
  ): Promise<KISFillCheckResult> {
    if (market !== "KOREA") {
      return {
        isFilled: false,
        filledQty: 0,
        filledAvgPrice: 0,
        status: "REJECTED",
        message: "⛔ 현재 LIVE 체결확인은 국내주식 경로만 승인되어 있습니다."
      };
    }
    return this.delegate.checkFillStatus(orderNo, symbol, market, isPaper);
  }

  public async getAccountBalance(market: "KOREA" | "US" = "KOREA", isPaper = false) {
    const result = await this.delegate.getAccountBalance(market, isPaper);
    const liveTradingAllowed = process.env.AISTOCK_ALLOW_LIVE_TRADING === "true";

    // LIVE button account preflight must also prove that the server order gate is enabled.
    if (!isPaper && market === "KOREA" && result.success && !liveTradingAllowed) {
      return {
        ...result,
        success: false,
        liveTradingAllowed,
        message: "⛔ KIS 실계좌 연결은 확인됐지만 서버 LIVE 게이트가 잠겨 있습니다. AISTOCK_ALLOW_LIVE_TRADING=true가 필요합니다."
      };
    }

    return { ...result, liveTradingAllowed };
  }

  private async getDomesticCurrentPrice(symbol: string, token: string): Promise<number | null> {
    try {
      const qs = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: symbol
      });
      const res = await fetch(`${KIS_REAL_REST_DOMAIN}/uapi/domestic-stock/v1/quotations/inquire-price?${qs.toString()}`, {
        method: "GET",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
          appkey: this.appKey,
          appsecret: this.appSecret,
          tr_id: "FHKST01010100",
          custtype: "P"
        }
      });
      if (!res.ok) return null;
      const data = await res.json();
      const price = Number(data?.output?.stck_prpr || data?.output?.STCK_PRPR || 0);
      return Number.isFinite(price) && price > 0 ? price : null;
    } catch (_) {
      return null;
    }
  }

  private safePositiveNumber(raw: string | undefined, fallback: number): number {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private reject(
    req: KISOrderRequest,
    trId: string,
    message: string,
    timestamp: string
  ): KISOrderGatewayResponse {
    return {
      success: false,
      orderNo: "",
      symbol: req.symbol,
      side: req.side,
      status: "REJECTED",
      filledQty: 0,
      filledAvgPrice: 0,
      message,
      trId,
      timestamp
    };
  }
}
