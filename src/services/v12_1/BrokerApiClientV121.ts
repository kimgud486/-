// AISTOCK v12.1 Broker API Client
// Handles client-side execution requests, enforcing domestic vs US market order separation and ODNO PENDING validation.

import { KISBrokerGatewayV121, KISOrderRequest, KISOrderGatewayResponse } from "../../../server/broker/KISBrokerGatewayV121";

export type ExecutionModeV121 = "PAPER" | "DRY_RUN" | "LIVE";

export interface BrokerOrderResultV121 {
  success: boolean;
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  qty: number;
  status: "PENDING" | "FILLED" | "PARTIAL" | "CANCELLED" | "REJECTED" | "NOT_CONFIGURED";
  filledQty: number;
  filledAvgPrice: number;
  message: string;
  timestamp: string;
  mode: ExecutionModeV121;
}

export class BrokerApiClientV121 {
  private gateway: KISBrokerGatewayV121;
  private mode: ExecutionModeV121;
  private liveTradingEnabled: boolean;

  constructor(mode: ExecutionModeV121 = "PAPER", liveTradingEnabled: boolean = false) {
    this.gateway = new KISBrokerGatewayV121();
    this.mode = mode;
    this.liveTradingEnabled = liveTradingEnabled;
  }

  public setMode(mode: ExecutionModeV121, liveTradingEnabled: boolean = false) {
    this.mode = mode;
    this.liveTradingEnabled = liveTradingEnabled;
  }

  public async placeOrder(req: {
    symbol: string;
    name: string;
    market: "KOREA" | "US" | "BTC";
    side: "BUY" | "SELL";
    price: number;
    qty: number;
    orderType?: "LIMIT" | "MARKET";
  }): Promise<BrokerOrderResultV121> {
    const timestamp = new Date().toLocaleTimeString("ko-KR");
    const orderType = req.orderType || "MARKET";

    // 1. PAPER Mode Handling
    if (this.mode === "PAPER") {
      const mockOrderId = `PAPER_V121_${Date.now()}`;
      return {
        success: true,
        orderId: mockOrderId,
        symbol: req.symbol,
        side: req.side,
        price: req.price,
        qty: req.qty,
        status: "FILLED",
        filledQty: req.qty,
        filledAvgPrice: req.price,
        message: `[PAPER 모의체결 완료] ${req.name}(${req.symbol}) ${req.qty}주 ${req.side} 모의주문 체결`,
        timestamp,
        mode: "PAPER"
      };
    }

    // 2. DRY_RUN Mode Handling
    if (this.mode === "DRY_RUN") {
      return {
        success: true,
        orderId: `DRY_RUN_V121_${Date.now()}`,
        symbol: req.symbol,
        side: req.side,
        price: req.price,
        qty: req.qty,
        status: "PENDING",
        filledQty: 0,
        filledAvgPrice: 0,
        message: `[DRY_RUN 주문 검증 완료] ${req.name}(${req.symbol}) 주문 검증 통과 (실제 발주 없음)`,
        timestamp,
        mode: "DRY_RUN"
      };
    }

    // 3. LIVE Mode Handling with Fail-Closed Fail-Safe
    if (this.mode === "LIVE") {
      if (!this.liveTradingEnabled) {
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
          message: "🚨 [LIVE 거부] 이중 잠금(liveTradingEnabled)이 비활성화 상태입니다.",
          timestamp,
          mode: "LIVE"
        };
      }

      const kisReq: KISOrderRequest = {
        symbol: req.symbol,
        name: req.name,
        market: req.market,
        side: req.side,
        price: req.price,
        qty: req.qty,
        orderType,
        isPaperTrading: false
      };

      const gwRes: KISOrderGatewayResponse = await this.gateway.executeOrder(kisReq);

      if (!gwRes.success) {
        return {
          success: false,
          orderId: "",
          symbol: req.symbol,
          side: req.side,
          price: req.price,
          qty: req.qty,
          status: gwRes.status,
          filledQty: 0,
          filledAvgPrice: 0,
          message: gwRes.message,
          timestamp,
          mode: "LIVE"
        };
      }

      // CRITICAL V12.1 RULE: ODNO returning means PENDING! Perform fill confirmation query!
      const fillCheck = await this.gateway.checkFillStatus(gwRes.orderNo, req.symbol, false);

      if (fillCheck.isFilled) {
        return {
          success: true,
          orderId: gwRes.orderNo,
          symbol: req.symbol,
          side: req.side,
          price: req.price,
          qty: req.qty,
          status: "FILLED",
          filledQty: fillCheck.filledQty || req.qty,
          filledAvgPrice: fillCheck.filledAvgPrice || req.price,
          message: `✅ [LIVE 실거래 체결 승인] KIS 주문번호 ODNO:${gwRes.orderNo} 체결 완료`,
          timestamp,
          mode: "LIVE"
        };
      } else {
        return {
          success: true,
          orderId: gwRes.orderNo,
          symbol: req.symbol,
          side: req.side,
          price: req.price,
          qty: req.qty,
          status: "PENDING",
          filledQty: 0,
          filledAvgPrice: 0,
          message: `⏳ [LIVE 주문 접수 완료] KIS ODNO:${gwRes.orderNo} (체결 대기 중)`,
          timestamp,
          mode: "LIVE"
        };
      }
    }

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
      message: "알 수 없는 실행 모드입니다.",
      timestamp,
      mode: this.mode
    };
  }
}
