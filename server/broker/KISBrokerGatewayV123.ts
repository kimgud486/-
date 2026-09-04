// AISTOCK v12.3 Server-Side KIS Broker Gateway (REAL FILL ENGINE)
// Implements KIS OAuth2 Token Cache, Official Domestic (TTTC0081R) & Overseas (TTTS3035R) Fill Inquiry,
// and strictly prevents synthetic/mock FILLED responses in LIVE mode.

export interface KISOrderRequest {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  side: "BUY" | "SELL";
  price: number;
  qty: number;
  orderType: "LIMIT" | "MARKET";
  isPaperTrading: boolean;
}

export interface KISOrderGatewayResponse {
  success: boolean;
  orderNo: string;
  symbol: string;
  side: "BUY" | "SELL";
  status: "PENDING" | "FILLED" | "PARTIAL" | "CANCELLED" | "REJECTED" | "NOT_CONFIGURED";
  filledQty: number;
  filledAvgPrice: number;
  message: string;
  trId: string;
  timestamp: string;
}

export interface KISFillCheckResult {
  isFilled: boolean;
  filledQty: number;
  filledAvgPrice: number;
  status: "PENDING" | "FILLED" | "PARTIAL" | "CANCELLED";
  message: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class KISBrokerGatewayV123 {
  private appKey: string;
  private appSecret: string;
  private accountNo: string;
  private productCode: string;
  private tokenCachePaper: TokenCache | null = null;
  private tokenCacheLive: TokenCache | null = null;

  constructor() {
    this.appKey = process.env.KIS_APPKEY || "";
    this.appSecret = process.env.KIS_APPSECRET || "";
    this.accountNo = process.env.KIS_CANO || "";
    this.productCode = process.env.KIS_ACNT_PRDT_CD || "01";
  }

  public isConfigured(): boolean {
    return Boolean(this.appKey && this.appSecret && this.accountNo);
  }

  /**
   * Acquire or reuse cached KIS OAuth2 Access Token (/oauth2/tokenP)
   */
  public async getOAuthToken(isPaper: boolean): Promise<string | null> {
    if (!this.isConfigured()) return null;

    const cache = isPaper ? this.tokenCachePaper : this.tokenCacheLive;
    const now = Date.now();

    if (cache && cache.expiresAt > now + 60000) {
      return cache.accessToken;
    }

    const domain = isPaper
      ? "https://openapivts.koreainvestment.com:29443"
      : "https://openapi.koreainvestment.com:29443";

    try {
      const res = await fetch(`${domain}/oauth2/tokenP`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          appkey: this.appKey,
          appsecret: this.appSecret
        })
      });

      if (!res.ok) {
        console.error(`[KIS OAuth2] Token error HTTP ${res.status}`);
        return null;
      }

      const data = await res.json();
      if (data.access_token) {
        const expiresInMs = (data.expires_in || 86400) * 1000;
        const newCache: TokenCache = {
          accessToken: data.access_token,
          expiresAt: now + expiresInMs
        };
        if (isPaper) {
          this.tokenCachePaper = newCache;
        } else {
          this.tokenCacheLive = newCache;
        }
        return data.access_token;
      }
    } catch (err) {
      console.error("[KIS OAuth2] Failed to acquire token:", err);
    }
    return null;
  }

  /**
   * Determine exact KIS TR_ID based on market, order side, and paper/live mode
   */
  public getTRID(market: "KOREA" | "US" | "BTC", side: "BUY" | "SELL", isPaper: boolean): string {
    if (market === "KOREA") {
      if (isPaper) {
        return side === "BUY" ? "VTTC0802U" : "VTTC0801U";
      }
      return side === "BUY" ? "TTTC0802U" : "TTTC0801U";
    } else if (market === "US") {
      if (isPaper) {
        return side === "BUY" ? "VTTT1002U" : "VTTT1001U";
      }
      // Official KIS US live TR IDs: BUY TTTT1002U, SELL TTTT1006U
      return side === "BUY" ? "TTTT1002U" : "TTTT1006U";
    }
    return "UNKNOWN_TR";
  }

  /**
   * Dispatch Order to KIS OpenAPI Gateway
   */
  public async executeOrder(req: KISOrderRequest): Promise<KISOrderGatewayResponse> {
    const timestamp = new Date().toLocaleTimeString("ko-KR");

    if (!this.isConfigured()) {
      return {
        success: false,
        orderNo: "",
        symbol: req.symbol,
        side: req.side,
        status: "NOT_CONFIGURED",
        filledQty: 0,
        filledAvgPrice: 0,
        message: "❌ [KIS 설정 없음] KIS_APPKEY / KIS_APPSECRET / KIS_CANO 환경변수가 미설정되었습니다.",
        trId: "NONE",
        timestamp
      };
    }

    const token = await this.getOAuthToken(req.isPaperTrading);
    const trId = this.getTRID(req.market, req.side, req.isPaperTrading);
    const domain = req.isPaperTrading
      ? "https://openapivts.koreainvestment.com:29443"
      : "https://openapi.koreainvestment.com:29443";

    const endpoint = req.market === "US"
      ? "/uapi/overseas-stock/v1/trading/order"
      : "/uapi/domestic-stock/v1/trading/order-cash";

    try {
      const payload = req.market === "US"
        ? {
            CANO: this.accountNo,
            ACNT_PRDT_CD: this.productCode,
            OVRS_EXCG_CD: "NASD",
            PDNO: req.symbol,
            ORD_QTY: String(req.qty),
            OVRS_ORD_UNPR: String(req.price),
            ORD_DVSN: "00"
          }
        : {
            CANO: this.accountNo,
            ACNT_PRDT_CD: this.productCode,
            PDNO: req.symbol,
            ORD_DVSN: "01", // Market Order
            ORD_QTY: String(req.qty),
            ORD_UNPR: "0"
          };

      const headers: Record<string, string> = {
        "content-type": "application/json",
        "appkey": this.appKey,
        "appsecret": this.appSecret,
        "tr_id": trId
      };

      if (token) {
        headers["authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${domain}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorMsg = await res.text();
        return {
          success: false,
          orderNo: "",
          symbol: req.symbol,
          side: req.side,
          status: "REJECTED",
          filledQty: 0,
          filledAvgPrice: 0,
          message: `🚨 [KIS 브로커 거부] HTTP ${res.status}: ${errorMsg.slice(0, 100)}`,
          trId,
          timestamp
        };
      }

      const data = await res.json();
      if (data.rt_cd === "0" && (data.output?.ODNO || data.output?.KRX_FWDG_ORD_ORGNO)) {
        const orderNo = data.output.ODNO || data.output.KRX_FWDG_ORD_ORGNO;
        return {
          success: true,
          orderNo,
          symbol: req.symbol,
          side: req.side,
          status: "PENDING", // PENDING state requiring real fill verification!
          filledQty: 0,
          filledAvgPrice: 0,
          message: `✅ [KIS 주문 접수 완료] ODNO: ${orderNo} (상태: PENDING)`,
          trId,
          timestamp
        };
      } else {
        return {
          success: false,
          orderNo: "",
          symbol: req.symbol,
          side: req.side,
          status: "REJECTED",
          filledQty: 0,
          filledAvgPrice: 0,
          message: `❌ [KIS 거절] ${data.msg1 || "주문 전송 오류"}`,
          trId,
          timestamp
        };
      }
    } catch (err: any) {
      return {
        success: false,
        orderNo: "",
        symbol: req.symbol,
        side: req.side,
        status: "REJECTED",
        filledQty: 0,
        filledAvgPrice: 0,
        message: `🚨 [네트워크 오류] KIS 서버 접속 실패: ${err?.message || err}`,
        trId,
        timestamp
      };
    }
  }

  /**
   * Check Fill Execution Status for an ODNO Order Number (REAL FILL ENGINE v12.3)
   * Queries KIS inquire-daily-ccld (domestic TTTC0081R) or inquire-ccnl (overseas TTTS3035R)
   */
  public async checkFillStatus(
    orderNo: string,
    symbol: string,
    market: "KOREA" | "US" | "BTC" = "KOREA",
    isPaper: boolean = false
  ): Promise<KISFillCheckResult> {
    if (!orderNo) {
      return { isFilled: false, filledQty: 0, filledAvgPrice: 0, status: "PENDING", message: "주문번호 없음" };
    }

    // PAPER mode simulated fill response
    if (isPaper) {
      return {
        isFilled: true,
        filledQty: 1,
        filledAvgPrice: 0,
        status: "FILLED",
        message: `[PAPER 모의체결 완료] ODNO: ${orderNo} 체결 완료`
      };
    }

    // LIVE MODE: Real KIS Execution Inquiry
    if (!this.isConfigured()) {
      return {
        isFilled: false,
        filledQty: 0,
        filledAvgPrice: 0,
        status: "PENDING",
        message: "❌ KIS_APPKEY 미설정으로 체결 조회 불가능"
      };
    }

    const token = await this.getOAuthToken(false);
    if (!token) {
      return {
        isFilled: false,
        filledQty: 0,
        filledAvgPrice: 0,
        status: "PENDING",
        message: "⚠️ OAuth 토큰 발급 대기 중"
      };
    }

    const domain = "https://openapi.koreainvestment.com:29443";
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    try {
      if (market === "KOREA") {
        // KIS Domestic Stock Daily Execution Inquiry (inquire-daily-ccld, TR: TTTC0081R)
        const trId = "TTTC0081R";
        const queryParams = new URLSearchParams({
          CANO: this.accountNo,
          ACNT_PRDT_CD: this.productCode,
          INQR_STRT_DT: todayStr,
          INQR_END_DT: todayStr,
          SLL_BUY_DVSN_CD: "00",
          INQR_DVSN: "00",
          PDNO: symbol || "",
          CCLD_DVSN: "00",
          ORD_GNO_BRNO: "",
          ODNO: orderNo,
          INQR_DVSN_3: "00",
          INQR_DVSN_1: "",
          INQR_DVSN_2: ""
        });

        const res = await fetch(`${domain}/uapi/domestic-stock/v1/trading/inquire-daily-ccld?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`,
            "appkey": this.appKey,
            "appsecret": this.appSecret,
            "tr_id": trId,
            "custtype": "P"
          }
        });

        if (!res.ok) {
          return {
            isFilled: false,
            filledQty: 0,
            filledAvgPrice: 0,
            status: "PENDING",
            message: `⚠️ KIS 국내 체결조회 HTTP ${res.status}`
          };
        }

        const data = await res.json();
        const outputList = data.output1 || data.output || [];
        
        // Find matching order in output
        const matched = Array.isArray(outputList)
          ? outputList.find((item: any) => String(item.odno || item.ODNO || "").trim() === String(orderNo).trim())
          : null;

        if (matched) {
          const ordQty = Number(matched.ord_qty || matched.ORD_QTY || 0);
          const ccldQty = Number(matched.tot_ccld_qty || matched.ccld_qty || matched.CCLD_QTY || 0);
          const avgPrice = Number(matched.avg_prc || matched.ccld_prc || matched.CCLD_PRC || 0);

          if (ccldQty >= ordQty && ordQty > 0) {
            return {
              isFilled: true,
              filledQty: ccldQty,
              filledAvgPrice: avgPrice,
              status: "FILLED",
              message: `✅ [KIS 실거래 국내 체결 완료] ODNO:${orderNo} (${ccldQty}/${ordQty}주)`
            };
          } else if (ccldQty > 0) {
            return {
              isFilled: false,
              filledQty: ccldQty,
              filledAvgPrice: avgPrice,
              status: "PARTIAL",
              message: `⏳ [KIS 국내 부분체결] ODNO:${orderNo} (${ccldQty}/${ordQty}주)`
            };
          }
        }

        return {
          isFilled: false,
          filledQty: 0,
          filledAvgPrice: 0,
          status: "PENDING",
          message: `⏳ [KIS 국내 체결 대기] ODNO:${orderNo} 거래소 미체결`
        };
      } else {
        // KIS Overseas Stock Execution Inquiry (inquire-ccnl, TR: TTTS3035R)
        const trId = "TTTS3035R";
        const queryParams = new URLSearchParams({
          CANO: this.accountNo,
          ACNT_PRDT_CD: this.productCode,
          PDNO: symbol || "",
          ORD_STRT_DT: todayStr,
          ORD_END_DT: todayStr,
          SLL_BUY_DVSN: "00",
          CCLD_NCCL_DVSN: "00",
          OVRS_EXCG_CD: "NASD",
          SORT_SQN: "DS",
          CTX_AREA_FK200: "",
          CTX_AREA_NK200: ""
        });

        const res = await fetch(`${domain}/uapi/overseas-stock/v1/trading/inquire-ccnl?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`,
            "appkey": this.appKey,
            "appsecret": this.appSecret,
            "tr_id": trId,
            "custtype": "P"
          }
        });

        if (!res.ok) {
          return {
            isFilled: false,
            filledQty: 0,
            filledAvgPrice: 0,
            status: "PENDING",
            message: `⚠️ KIS 미국 체결조회 HTTP ${res.status}`
          };
        }

        const data = await res.json();
        const outputList = data.output || data.output1 || [];

        const matched = Array.isArray(outputList)
          ? outputList.find((item: any) => String(item.odno || item.ODNO || "").trim() === String(orderNo).trim())
          : null;

        if (matched) {
          const ordQty = Number(matched.ft_ord_qty || matched.ord_qty || 0);
          const ccldQty = Number(matched.ft_ccld_qty || matched.ccld_qty || 0);
          const avgPrice = Number(matched.ft_ccld_unpr3 || matched.ccld_prc || 0);

          if (ccldQty >= ordQty && ordQty > 0) {
            return {
              isFilled: true,
              filledQty: ccldQty,
              filledAvgPrice: avgPrice,
              status: "FILLED",
              message: `✅ [KIS 실거래 미국 체결 완료] ODNO:${orderNo} (${ccldQty}/${ordQty}주)`
            };
          } else if (ccldQty > 0) {
            return {
              isFilled: false,
              filledQty: ccldQty,
              filledAvgPrice: avgPrice,
              status: "PARTIAL",
              message: `⏳ [KIS 미국 부분체결] ODNO:${orderNo} (${ccldQty}/${ordQty}주)`
            };
          }
        }

        return {
          isFilled: false,
          filledQty: 0,
          filledAvgPrice: 0,
          status: "PENDING",
          message: `⏳ [KIS 미국 체결 대기] ODNO:${orderNo} 거래소 미체결`
        };
      }
    } catch (err: any) {
      return {
        isFilled: false,
        filledQty: 0,
        filledAvgPrice: 0,
        status: "PENDING",
        message: `🚨 [체결 조회 오류] ${err?.message || err}`
      };
    }
  }
}
