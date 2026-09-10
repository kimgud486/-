// ----------------------------------------------------------------------
// BROKER EXECUTION RUNTIME BRIDGE V20 (AISTOCK RC6)
// Connects provider runtime + BrokerExecutionTruthBusV20 to LivePositionRuntimeService
// ----------------------------------------------------------------------

import { brokerExecutionTruthBusV20 } from "./BrokerExecutionTruthBusV20";
import { ParsedExecutionNotice } from "./KISExecutionNoticeParserV20";
import { livePositionRuntimeService, BrokerExecutionNotice } from "../../src/trading/LivePositionRuntimeService";
import { serverRealtimeRuntimeV20 } from "./ServerRealtimeRuntimeV20";

export class BrokerExecutionRuntimeBridgeV20 {
  private static instance: BrokerExecutionRuntimeBridgeV20;
  private unsubscribe: (() => void) | null = null;
  private orderToPositionMap: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): BrokerExecutionRuntimeBridgeV20 {
    if (!BrokerExecutionRuntimeBridgeV20.instance) {
      BrokerExecutionRuntimeBridgeV20.instance = new BrokerExecutionRuntimeBridgeV20();
    }
    return BrokerExecutionRuntimeBridgeV20.instance;
  }

  public registerOrderToPosition(orderId: string, positionId: string): void {
    const order = orderId.trim();
    const position = positionId.trim();
    if (!order || !position) return;
    this.orderToPositionMap.set(order, position);
  }

  public startBridge(): void {
    if (this.unsubscribe) return;

    this.unsubscribe = brokerExecutionTruthBusV20.subscribe((notice: ParsedExecutionNotice) => {
      this.routeNoticeToRuntime(notice);
    });

    // Provider startup is owned by the server bridge so server.ts cannot import a client and forget to connect it.
    void serverRealtimeRuntimeV20.start().catch(err => {
      console.error("[BrokerExecutionRuntimeBridgeV20] Realtime provider startup failed:", err);
    });
  }

  public stopBridge(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    serverRealtimeRuntimeV20.stop();
  }

  public routeNoticeToRuntime(parsed: ParsedExecutionNotice): boolean {
    if (!parsed?.isExecuted || parsed.execQty <= 0 || parsed.execPrice <= 0) return false;

    let positionId = this.orderToPositionMap.get(parsed.orderId);
    if (!positionId) {
      const allPositions = livePositionRuntimeService.getAllPositions();
      const match = allPositions.find(p => p.symbol === parsed.symbol && p.state !== "CLOSED");
      if (match) positionId = match.positionId;
    }

    if (!positionId) return false;

    const runtimeNotice: BrokerExecutionNotice = {
      noticeId: parsed.noticeId,
      symbol: parsed.symbol,
      side: parsed.side,
      execQty: parsed.execQty,
      execPrice: parsed.execPrice,
      remainingQty: parsed.remainingQty,
      timestamp: parsed.timestamp
    };

    const newState = livePositionRuntimeService.onBrokerExecutionNotice(positionId, runtimeNotice);
    if (newState === "CLOSED") this.orderToPositionMap.delete(parsed.orderId);
    return true;
  }

  public getStatus() {
    return {
      listeningForFills: Boolean(this.unsubscribe),
      mappedOrders: this.orderToPositionMap.size,
      realtime: serverRealtimeRuntimeV20.getStatus()
    };
  }
}

export const brokerExecutionRuntimeBridgeV20 = BrokerExecutionRuntimeBridgeV20.getInstance();
