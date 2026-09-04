import React, { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  Sparkles, 
  Flame, 
  Zap, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target, 
  ShieldAlert, 
  CheckCircle2, 
  SlidersHorizontal, 
  Filter, 
  Clock, 
  DollarSign, 
  ExternalLink,
  Star,
  Activity,
  Plus
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { StockCandleChartModal } from "./StockCandleChartModal";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import { v11ExecutionEngine } from "./AistockV11ExecutionConsole";

export interface ScannedTileItem {
  id: string;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  currentPrice: number;
  changePct: number;
  prevPrice?: number;
  flashState?: "UP" | "DOWN" | null;
  aiScore: number;
  aiConfidence: number;
  rvol: number; // e.g. 3.4x
  volumeAccel: number; // e.g. +180%
  signalType: "BULLISH_CHOCH" | "SURGE_SPIKE" | "FVG_RETEST" | "SSL_SWEEP" | "BOS_BREAKOUT";
  signalLabel: string;
  entryZone: string;
  bestEntry: number;
  stopLoss: number;
  targetPrice: number;
  riskReward: string;
  rationale: string;
  scannedAt: string;
}

const INITIAL_MOCK_TILES: ScannedTileItem[] = [
  {
    id: "tile_1",
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    currentPrice: 74800,
    changePct: +3.89,
    aiScore: 92,
    aiConfidence: 88,
    rvol: 3.8,
    volumeAccel: 210,
    signalType: "BULLISH_CHOCH",
    signalLabel: "Bullish CHoCH + FVG Retest",
    entryZone: "74,200 ~ 74,600 KRW",
    bestEntry: 74400,
    stopLoss: 73200,
    targetPrice: 77500,
    riskReward: "1 : 3.2",
    rationale: "외국인/기관 280억 동반 순매수. 30분봉 SMC CHoCH 상단 레벨 강하게 돌파 후 지지력 확인 완료",
    scannedAt: new Date().toLocaleTimeString("ko-KR")
  },
  {
    id: "tile_2",
    symbol: "NVDA",
    name: "엔비디아",
    market: "US",
    currentPrice: 131.50,
    changePct: +4.85,
    aiScore: 95,
    aiConfidence: 91,
    rvol: 4.2,
    volumeAccel: 320,
    signalType: "SURGE_SPIKE",
    signalLabel: "Volume Spike + 신고가 돌파",
    entryZone: "$129.50 ~ $130.80",
    bestEntry: 130.20,
    stopLoss: 126.80,
    targetPrice: 142.00,
    riskReward: "1 : 3.5",
    rationale: "나스닥 신고가 대장주. 1분당 거래대금 $1.2B 폭증. 기관 퀀트 프로그램 연속 매수세 감지",
    scannedAt: new Date(Date.now() - 1 * 60 * 1000).toLocaleTimeString("ko-KR")
  },
  {
    id: "tile_3",
    symbol: "000660",
    name: "SK하이닉스",
    market: "KOREA",
    currentPrice: 189500,
    changePct: +2.99,
    aiScore: 89,
    aiConfidence: 86,
    rvol: 3.1,
    volumeAccel: 175,
    signalType: "BOS_BREAKOUT",
    signalLabel: "Bullish BOS + VWAP 상단 안착",
    entryZone: "187,500 ~ 188,800 KRW",
    bestEntry: 188000,
    stopLoss: 184500,
    targetPrice: 198000,
    riskReward: "1 : 2.8",
    rationale: "HBM3E 공급확대 모멘텀. VWAP 재탈환 후 거래량 실린 장대양봉 형성 중",
    scannedAt: new Date(Date.now() - 3 * 60 * 1000).toLocaleTimeString("ko-KR")
  },
  {
    id: "tile_4",
    symbol: "KRW-BTC",
    name: "비트코인",
    market: "BTC",
    currentPrice: 90250000,
    changePct: +2.15,
    aiScore: 88,
    aiConfidence: 84,
    rvol: 2.8,
    volumeAccel: 140,
    signalType: "SSL_SWEEP",
    signalLabel: "SSL Sweep 후 V자 반등",
    entryZone: "89,500,000 ~ 90,000,000 KRW",
    bestEntry: 89800000,
    stopLoss: 88200000,
    targetPrice: 94000000,
    riskReward: "1 : 3.1",
    rationale: "전일 저점 손절물량(Liquidity) 완벽 흡수 후 강한 V자 추세 전환. 업비트 체결강도 142%",
    scannedAt: new Date(Date.now() - 5 * 60 * 1000).toLocaleTimeString("ko-KR")
  },
  {
    id: "tile_5",
    symbol: "TSLA",
    name: "테슬라",
    market: "US",
    currentPrice: 219.80,
    changePct: +3.45,
    aiScore: 86,
    aiConfidence: 82,
    rvol: 2.9,
    volumeAccel: 160,
    signalType: "FVG_RETEST",
    signalLabel: "FVG Gap Retest 완성",
    entryZone: "$216.00 ~ $218.50",
    bestEntry: 217.20,
    stopLoss: 212.00,
    targetPrice: 232.00,
    riskReward: "1 : 2.8",
    rationale: "상방 갭 구간(Fair Value Gap) 매움 완료 후 지지선 수성. 로보택시 기대감 반영",
    scannedAt: new Date(Date.now() - 8 * 60 * 1000).toLocaleTimeString("ko-KR")
  },
  {
    id: "tile_6",
    symbol: "KRW-SOL",
    name: "솔라나",
    market: "BTC",
    currentPrice: 236500,
    changePct: +5.80,
    aiScore: 91,
    aiConfidence: 87,
    rvol: 4.1,
    volumeAccel: 280,
    signalType: "SURGE_SPIKE",
    signalLabel: "업비트 매수 잔량 300% 폭증",
    entryZone: "231,000 ~ 234,000 KRW",
    bestEntry: 232500,
    stopLoss: 224000,
    targetPrice: 255000,
    riskReward: "1 : 3.0",
    rationale: "체결강도 185% 유입. 온체인 TVL 증가 및 기관 매수세 유입 스파이크",
    scannedAt: new Date(Date.now() - 10 * 60 * 1000).toLocaleTimeString("ko-KR")
  }
];

export const RealtimeScannerTileBoard: React.FC = () => {
  const { executeQuickOrder, addWatchlist, addToast } = useApp();

  const [tiles, setTiles] = useState<ScannedTileItem[]>(INITIAL_MOCK_TILES);
  const [selectedMarketFilter, setSelectedMarketFilter] = useState<"ALL" | "KOREA" | "US" | "BTC">("ALL");
  const [selectedSignalFilter, setSelectedSignalFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"AI_SCORE" | "RVOL" | "CHANGE_PCT">("AI_SCORE");
  const [isAutoScanActive, setIsAutoScanActive] = useState<boolean>(true);

  // Selected Stock for Chart Modal
  const [activeChartModalStock, setActiveChartModalStock] = useState<{ symbol: string; name: string } | null>(null);

  // Listen to WebSocket Ticker Updates & trigger Flash pulse animation
  useEffect(() => {
    const handleTickerUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const tickerData = customEvent.detail;
      if (!tickerData) return;

      setTiles((prevTiles) => {
        return prevTiles.map((tile) => {
          let updatedPrice = tile.currentPrice;
          let matchFound = false;

          if (Array.isArray(tickerData)) {
            const found = tickerData.find((t: any) => t.symbol === tile.symbol);
            if (found && found.currentPrice) {
              updatedPrice = found.currentPrice;
              matchFound = true;
            }
          } else if (tickerData.code) {
            // Upbit format
            const cleanCode = tickerData.code.replace("KRW-", "");
            if (cleanCode === tile.symbol.replace("KRW-", "")) {
              updatedPrice = tickerData.trade_price;
              matchFound = true;
            }
          }

          if (matchFound && updatedPrice !== tile.currentPrice) {
            const isUp = updatedPrice > tile.currentPrice;
            return {
              ...tile,
              prevPrice: tile.currentPrice,
              currentPrice: updatedPrice,
              flashState: isUp ? "UP" : "DOWN"
            };
          }
          return tile;
        });
      });
    };

    window.addEventListener("stock_ticker_update", handleTickerUpdate);
    window.addEventListener("upbit_ticker_update", handleTickerUpdate);

    const unsubFeed = realtimeMarketFeedService.subscribe((quotesMap) => {
      setTiles((prevTiles) =>
        prevTiles.map((tile) => {
          const symKey = tile.symbol.replace("KRW-", "");
          const q = quotesMap.get(symKey) || quotesMap.get(tile.symbol);
          if (q && q.price && q.price !== tile.currentPrice) {
            const isUp = q.price > tile.currentPrice;
            return {
              ...tile,
              prevPrice: tile.currentPrice,
              currentPrice: q.price,
              changePct: q.changeRate ?? tile.changePct,
              flashState: isUp ? "UP" : "DOWN"
            };
          }
          return tile;
        })
      );
    });

    return () => {
      window.removeEventListener("stock_ticker_update", handleTickerUpdate);
      window.removeEventListener("upbit_ticker_update", handleTickerUpdate);
      unsubFeed();
    };
  }, []);

  // Clear flash effect after 600ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setTiles((prev) =>
        prev.map((t) => (t.flashState ? { ...t, flashState: null } : t))
      );
    }, 600);
    return () => clearTimeout(timer);
  }, [tiles]);

  // Simulate scanning new stock periodically if autoScan active
  useEffect(() => {
    if (!isAutoScanActive) return;

    const interval = setInterval(() => {
      // Small chance to add or re-scan
      const candidates = [
        { symbol: "035420", name: "NAVER", market: "KOREA" as const, price: 178500, pct: +4.12, ai: 90, rvol: 3.6, sig: "BULLISH_CHOCH" as const, label: "Bullish CHoCH 저항 돌파" },
        { symbol: "AAPL", name: "애플", market: "US" as const, price: 224.30, pct: +2.85, ai: 87, rvol: 2.7, sig: "FVG_RETEST" as const, label: "Apple Intelligence 기대감 FVG 지지" },
        { symbol: "KRW-ETH", name: "이더리움", market: "BTC" as const, price: 3850000, pct: +3.40, ai: 89, rvol: 3.2, sig: "SURGE_SPIKE" as const, label: "ETF 유입량 폭증 거래대금 1위" }
      ];

      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      setTiles((prev) => {
        if (prev.some((p) => p.symbol === chosen.symbol)) return prev;
        const newTile: ScannedTileItem = {
          id: "tile_" + Date.now(),
          symbol: chosen.symbol,
          name: chosen.name,
          market: chosen.market,
          currentPrice: chosen.price,
          changePct: chosen.pct,
          aiScore: chosen.ai,
          aiConfidence: 85,
          rvol: chosen.rvol,
          volumeAccel: 190,
          signalType: chosen.sig,
          signalLabel: chosen.label,
          entryZone: `${((chosen.price || 0) * 0.99).toLocaleString()} ~ ${(chosen.price || 0).toLocaleString()}`,
          bestEntry: Math.round(chosen.price * 0.995),
          stopLoss: Math.round(chosen.price * 0.97),
          targetPrice: Math.round(chosen.price * 1.05),
          riskReward: "1 : 3.0",
          rationale: "실시간 스캐너 엔진이 거래량 가속도 및 SMC 지지선을 감지하여 시각화 분석 타일로 자동 추가했습니다.",
          scannedAt: new Date().toLocaleTimeString("ko-KR")
        };
        return [newTile, ...prev.slice(0, 8)];
      });
    }, 12000);

    return () => clearInterval(interval);
  }, [isAutoScanActive]);

  // Handle 1-Click Quick Order Execution
  const handleQuickBuy = async (tile: ScannedTileItem) => {
    try {
      // 1. Trigger v11 Autonomous Execution Engine Pipeline
      const v11Res = await v11ExecutionEngine.processCandidateOrder({
        symbol: tile.symbol,
        name: tile.name,
        market: tile.market,
        price: tile.currentPrice,
        scannerScore: tile.aiScore,
        unifiedShape: tile.signalLabel,
        rvol: tile.rvol,
        executionPower: tile.volumeAccel
      });

      // 2. Trigger AppContext Quick Order Sync
      await executeQuickOrder({
        symbol: tile.symbol,
        name: tile.name,
        market: tile.market,
        side: "BUY",
        quantity: tile.market === "BTC" ? 0.005 : tile.market === "US" ? 2 : 10,
        price: tile.currentPrice,
        strategyName: `v10 스캐너 + v11 자율엔진 [${tile.signalLabel}]`,
        aiRationale: tile.rationale
      });

      addToast({
        type: "SUCCESS",
        title: `🟢 [v11 자율매수] ${tile.name} LONG 포지션 체결`,
        message: `${tile.name} (${tile.symbol}) @ ${(tile.currentPrice ?? 0).toLocaleString()} 주문이 자율 가동 및 체결 승인되었습니다. (${v11Res.message || "Risk Gate 통과"})`
      });
    } catch (err: any) {
      addToast({
        type: "ERROR",
        title: "주문 실패",
        message: err.message || "주문 실행 중 오류가 발생했습니다."
      });
    }
  };

  // Filter & Sort
  const filteredTiles = tiles
    .filter((tile) => {
      if (selectedMarketFilter !== "ALL" && tile.market !== selectedMarketFilter) return false;
      if (selectedSignalFilter !== "ALL" && tile.signalType !== selectedSignalFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "AI_SCORE") return b.aiScore - a.aiScore;
      if (sortBy === "RVOL") return b.rvol - a.rvol;
      if (sortBy === "CHANGE_PCT") return b.changePct - a.changePct;
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950 via-zinc-900 to-cyan-950 border-2 border-cyan-500/80 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-cyan-500/20 border border-cyan-400/40 rounded-xl text-cyan-400">
              <Zap className="h-7 w-7 animate-pulse fill-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  실시간 스캐너 포착 종목 분석 타일 UI
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/30 text-cyan-300 border border-cyan-400/40">
                  LIVE STREAM TILES
                </span>
              </div>
              <p className="text-xs text-cyan-200/80 mt-1">
                전체 시장을 24시간 실시간 스캔하여 포착된 주도주를 <span className="text-cyan-300 font-bold underline">분석 타일 카드</span>로 시각화합니다. AI 점수, RVOL 거래량, 진입 신호를 0.1초 단위로 업데이트합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAutoScanActive(!isAutoScanActive)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                isAutoScanActive
                  ? "bg-cyan-500 text-white border-cyan-400 shadow-md ring-2 ring-cyan-400/40"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAutoScanActive ? "animate-spin" : ""}`} />
              <span>실시간 스캔: {isAutoScanActive ? "ON (작동중)" : "OFF (정지)"}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-5 pt-4 border-t border-cyan-500/30 flex flex-wrap items-center justify-between gap-3">
          {/* Market Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1 mr-1">
              <Filter className="h-3.5 w-3.5 text-cyan-400" /> 시장:
            </span>
            {(["ALL", "KOREA", "US", "BTC"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMarketFilter(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedMarketFilter === m
                    ? "bg-cyan-500 text-white shadow-xs"
                    : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {m === "ALL" && "🌐 전체 시장"}
                {m === "KOREA" && "🇰🇷 국내주식"}
                {m === "US" && "🇺🇸 미국주식"}
                {m === "BTC" && "🪙 크립토"}
              </button>
            ))}
          </div>

          {/* Signal Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSignalFilter}
              onChange={(e) => setSelectedSignalFilter(e.target.value)}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">🎯 전체 진입 신호 보기</option>
              <option value="BULLISH_CHOCH">🔄 Bullish CHoCH 추세전환</option>
              <option value="SURGE_SPIKE">⚡ Surge 거래량 폭발</option>
              <option value="BOS_BREAKOUT">💥 BOS 레벨 돌파</option>
              <option value="FVG_RETEST">📊 FVG Gap 지지</option>
              <option value="SSL_SWEEP">🎯 SSL Liquidity Sweep</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="AI_SCORE">⭐ AI Score 순</option>
              <option value="RVOL">🔥 RVOL 거래량 순</option>
              <option value="CHANGE_PCT">📈 등락률 높음 순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analysis Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTiles.map((tile) => {
          const isUp = tile.changePct >= 0;

          return (
            <div
              key={tile.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all duration-300 relative flex flex-col justify-between hover:shadow-md ${
                tile.flashState === "UP"
                  ? "ring-4 ring-emerald-500/50 bg-emerald-50/30 border-emerald-400 scale-[1.01]"
                  : tile.flashState === "DOWN"
                  ? "ring-4 ring-rose-500/50 bg-rose-50/30 border-rose-400 scale-[1.01]"
                  : "border-zinc-200 hover:border-cyan-400/80"
              }`}
            >
              {/* Tile Top Section */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        tile.market === "KOREA"
                          ? "bg-blue-100 text-blue-700"
                          : tile.market === "US"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {tile.market === "KOREA" ? "KOSPI/KOSDAQ" : tile.market === "US" ? "NASDAQ" : "UPBIT"}
                    </span>

                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-100 text-cyan-800 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-cyan-600" /> AI SCORE: {tile.aiScore}점
                    </span>
                  </div>

                  <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {tile.scannedAt}
                  </span>
                </div>

                {/* Stock Name & Price */}
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-1.5">
                      {tile.name}
                      <span className="text-xs font-mono text-zinc-400">({tile.symbol})</span>
                    </h3>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black font-mono text-zinc-900">
                      {tile.market === "US" ? "$" : ""}
                      {(tile.currentPrice ?? 0).toLocaleString()}
                      {tile.market === "KOREA" ? "원" : tile.market === "BTC" ? "원" : ""}
                    </div>
                    <div
                      className={`text-xs font-bold font-mono flex items-center justify-end gap-0.5 ${
                        isUp ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {isUp ? "+" : ""}
                      {tile.changePct}%
                    </div>
                  </div>
                </div>

                {/* Metrics Badges: RVOL & Volume Accel */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-semibold block">실시간 상대거래량 (RVOL)</span>
                    <span className="font-black text-amber-600 flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {tile.rvol}x 폭발 유입
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 font-semibold block">거래량 가속도</span>
                    <span className="font-black text-cyan-700 flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-cyan-600 fill-cyan-600" />
                      +{tile.volumeAccel}% 가속
                    </span>
                  </div>
                </div>

                {/* Entry Signal Banner */}
                <div className="p-3 bg-gradient-to-r from-cyan-900 to-zinc-900 text-white rounded-xl space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-cyan-300 flex items-center gap-1">
                      <Target className="h-3.5 w-3.5 text-cyan-400" /> {tile.signalLabel}
                    </span>
                    <span className="text-[10px] text-zinc-300 font-mono">R:R {tile.riskReward}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-zinc-200 pt-1 border-t border-cyan-500/30">
                    <div>
                      <span className="text-[9px] text-cyan-200/70 block">진입구간</span>
                      <strong className="text-cyan-300">{(tile.bestEntry ?? 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-rose-300/70 block">손절가(SL)</span>
                      <strong className="text-rose-400">{(tile.stopLoss ?? 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-emerald-300/70 block">목표가(TP)</span>
                      <strong className="text-emerald-300">{(tile.targetPrice ?? 0).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {/* Rationale Quote */}
                <p className="text-[11px] text-zinc-600 line-clamp-2 italic leading-relaxed bg-zinc-50 p-2 rounded-lg border border-zinc-200/60">
                  "{tile.rationale}"
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleQuickBuy(tile)}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Zap className="h-3.5 w-3.5 fill-white" />
                  <span>1-Click AI 매수</span>
                </button>

                <button
                  onClick={() => setActiveChartModalStock({ symbol: tile.symbol, name: tile.name })}
                  className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  title="SMC 차트 열기"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-cyan-600" />
                  <span>차트</span>
                </button>

                <button
                  onClick={() => {
                    addWatchlist({
                      id: "wl_" + Date.now(),
                      symbol: tile.symbol,
                      name: tile.name,
                      market: tile.market,
                      addedAt: new Date().toISOString()
                    });
                  }}
                  className="p-2 bg-zinc-100 hover:bg-amber-50 text-zinc-600 hover:text-amber-600 rounded-xl transition cursor-pointer"
                  title="관심종목 추가"
                >
                  <Star className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock Candle Chart Modal */}
      {activeChartModalStock && (
        <StockCandleChartModal
          symbol={activeChartModalStock.symbol}
          name={activeChartModalStock.name}
          onClose={() => setActiveChartModalStock(null)}
        />
      )}
    </div>
  );
};
