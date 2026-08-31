import React, { useState, useEffect, useMemo } from "react";
import {
  Brain,
  Search,
  Activity,
  Bell,
  Settings,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Zap,
  ShieldAlert,
  Flame,
  Power,
  Clock,
  Home,
  Monitor,
  Smartphone,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Coins,
  ArrowUpRight,
  Radio,
  Sliders,
  DollarSign,
  BarChart3,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Code2,
  FileText,
  Star,
  Cpu,
  ShieldCheck,
  Plus,
  PieChart,
  Bot,
  Filter,
  BarChart2,
  Users,
  Building2,
  Eye,
  Play,
  Pause,
  Key,
  Download,
  Trophy,
  Award,
  X,
  Lock,
  Unlock,
  Wallet,
  Bug,
  History
} from "lucide-react";
import { PwaInstallModal } from "./PwaInstallModal";
import { StockItem, getAllStocks, INITIAL_STOCK_UNIVERSE } from "../data/stockUniverse";
import { matchesChosungOrKeyword } from "../lib/stockDictionary";
import { BotPresetItem, getAllBots, DEFAULT_BOT_PRESETS } from "../data/botPresets";
import { InvestorFlowChart } from "./trading/InvestorFlowChart";
import { AiCoreNeuralNetwork } from "./trading/AiCoreNeuralNetwork";
import { LightCandlestickChart } from "./trading/LightCandlestickChart";
import { StockSearchAndAddModal } from "./trading/StockSearchAndAddModal";
import { BotCreatorModal } from "./trading/BotCreatorModal";
import { BotConfigModal } from "./trading/BotConfigModal";
import { PortfolioHoldingsModal } from "./trading/PortfolioHoldingsModal";
import { D3BotPerformanceMatrix } from "./trading/D3BotPerformanceMatrix";
import { AiDecisionBoard } from "./trading/AiDecisionBoard";
import { RiskGovernorPanel } from "./trading/RiskGovernorPanel";
import { BotStatusDashboard } from "./trading/BotStatusDashboard";
import { QuickOrderModal } from "./QuickOrderModal";
import { MultiModelSecuritiesConsensusModal } from "./MultiModelSecuritiesConsensusModal";
import { MasterFeatureModalHub, MasterFeatureKey, MASTER_FEATURE_LIST } from "./trading/MasterFeatureModalHub";
import { MasterSystemPipelineHubModal } from "./trading/MasterSystemPipelineHubModal";
import { MasterHubIntegratedGrid } from "./trading/MasterHubIntegratedGrid";
import { TopMarketHoursLiveWidget } from "./trading/TopMarketHoursLiveWidget";
import { AiActivePoolRealtimeScannerBar } from "./trading/AiActivePoolRealtimeScannerBar";
import { ThresholdSettingsModal } from "./trading/ThresholdSettingsModal";
import { BrokerApiConnectModal } from "./trading/BrokerApiConnectModal";
import { HomeLiveAutoTradeLogWidget } from "./trading/HomeLiveAutoTradeLogWidget";
import { AiLongShortAnalysisScannerSuite } from "./trading/AiLongShortAnalysisScannerSuite";
import { TradeExecutionHistoryView } from "./trading/TradeExecutionHistoryView";
import { AiSignalPushNotificationOverlay } from "./trading/AiSignalPushNotificationOverlay";
import { HomeRealtimeProfitBoard } from "./trading/HomeRealtimeProfitBoard";
import { PortfolioAssetStatusWidget } from "./trading/PortfolioAssetStatusWidget";
import { SwipeableStockListItem } from "./trading/SwipeableStockListItem";
import { MarketDataSkeleton } from "./trading/MarketDataSkeleton";
import { AiPredictiveTrendRechartsWidget } from "./AiPredictiveTrendRechartsWidget";
import { AiPricePredictionEngine } from "./AiPricePredictionEngine";
import { BearishPatternsLifecycleEngine } from "./BearishPatternsLifecycleEngine";
import { BullishPatternsLifecycleEngine } from "./BullishPatternsLifecycleEngine";
import { Ai30DayPriceForecastChart } from "./Ai30DayPriceForecastChart";
import { PriceTargetAlertModal } from "./trading/PriceTargetAlertModal";
import { AiDecisionLogsSidebar } from "./trading/AiDecisionLogsSidebar";
import { GeminiNewsSentimentLayer } from "./trading/GeminiNewsSentimentLayer";
import { MarketNewsSentiment } from "./MarketNewsSentiment";
import { AiPerformanceAnalysisDashboard } from "./trading/AiPerformanceAnalysisDashboard";
import { AiCumulativePnLPerformanceChart } from "./trading/AiCumulativePnLPerformanceChart";
import { MockInvestmentDashboard } from "./trading/MockInvestmentDashboard";
import { HistoricalAssetGrowthChart } from "./trading/HistoricalAssetGrowthChart";
import { AiDailyTradingReportPanel } from "./trading/AiDailyTradingReportPanel";
import { AiProfitImprovementSolutionSection } from "./trading/AiProfitImprovementSolutionSection";
import { StockTradePointsVisualizerDashboard } from "./trading/StockTradePointsVisualizerDashboard";
import { GithubQuantPatternEngineHub } from "./trading/GithubQuantPatternEngineHub";
import { UnifiedSearchAndCommandBar } from "./trading/UnifiedSearchAndCommandBar";
import { YieldImprovementGuideModal } from "./trading/YieldImprovementGuideModal";
import { BotAutoTuningPanel } from "./trading/BotAutoTuningPanel";
import { ProfitabilityHealthCheckModal } from "./trading/ProfitabilityHealthCheckModal";
import { RoadToBillionChallengeDashboard } from "./trading/RoadToBillionChallengeDashboard";
import { RealBrokerDetailedBalanceAndHoldings } from "./trading/RealBrokerDetailedBalanceAndHoldings";
import { SmartSafetyGovernanceModal } from "./trading/SmartSafetyGovernanceModal";
import { PredictionChart } from "./PredictionChart";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { AntiDowntrendV5Indicator } from "./trading/AntiDowntrendV5Indicator";
import { StockAiTradingFloorMasterScreen } from "./trading/StockAiTradingFloorMasterScreen";
import { DayNight24hTradingEngineSuite } from "./trading/DayNight24hTradingEngineSuite";
import { RealtimeTradingIssueLoggerModal, AiProblemResolverPanel } from "./trading/RealtimeTradingIssueLoggerModal";
import { RoadTo100BTrackerOverlay } from "./trading/RoadTo100BTrackerOverlay";
import { GlobalAutoTradingMasterSwitch } from "./trading/GlobalAutoTradingMasterSwitch";
import { AiBotHistoricalSuccessRateChart } from "./trading/AiBotHistoricalSuccessRateChart";
import { AiHighVolatilityAlertSystem } from "./trading/AiHighVolatilityAlertSystem";
import { AiBotThresholdActivityLogPanel } from "./trading/AiBotThresholdActivityLogPanel";
import { MirofishQuantLightDashboard } from "./trading/MirofishQuantLightDashboard";
import { ScalperCommandCenterUi } from "./trading/ScalperCommandCenterUi";
import { useApp } from "../context/AppContext";
import { useModalScrollLock } from "../hooks/useModalScrollLock";
import { thresholdAlertEngine } from "../lib/thresholdAlertEngine";
import { realtimeMarketFeedService, LiveMarketQuote } from "../services/realtimeMarketFeedService";

interface AiBotCommandCenterUiProps {
  onOpenConsensusModal?: (symbol: string) => void;
}

export const AiBotCommandCenterUi: React.FC<AiBotCommandCenterUiProps> = ({
  onOpenConsensusModal
}) => {
  const { 
    profile, 
    updateProfileSettings, 
    positions, 
    trades,
    marketStatus,
    addToast, 
    syncRealAccountBalance,
    isKillSwitchActive,
    toggleKillSwitch,
    safetyMode
  } = useApp();
  const [isGovernanceModalOpen, setIsGovernanceModalOpen] = useState(false);
  const [isIssueLoggerModalOpen, setIsIssueLoggerModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"pc" | "mobile">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      return "mobile";
    }
    return "pc";
  });
  const [mobileTab, setMobileTab] = useState<"scalper" | "home" | "floor" | "challenge" | "predict" | "chart" | "bots" | "holdings" | "menu">("scalper");
  const [activeNav, setActiveNav] = useState<string>("홈");

  // Auto-detect mobile screen on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setViewMode("mobile");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Master Console Hub Modal Key
  const [activeMasterHubKey, setActiveMasterHubKey] = useState<MasterFeatureKey | null>(null);

  // Real-Account Trading Mode Switch (vs Mock Virtual Mode) linked to AppContext
  const isRealTradingMode = Boolean(profile?.isRealTrade);
  const isProfitOptActive = Boolean(profile?.aiProfitOptimization);
  const setIsRealTradingMode = (next: boolean) => {
    updateProfileSettings({ isRealTrade: next });
  };

  // Threshold Notification Modal & API Connect Modal
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState<boolean>(false);
  const [isApiConnectModalOpen, setIsApiConnectModalOpen] = useState<boolean>(false);
  const [alertCount, setAlertCount] = useState<number>(() => thresholdAlertEngine.getHistory().length);

  // Market Mode Tab (KOREA STOCKS vs US STOCKS vs ALL)
  const [marketMode, setMarketMode] = useState<"ALL" | "KOSPI" | "KOSDAQ" | "US">("ALL");

  // Center View Mode
  const [centerTab, setCenterTab] = useState<
    | "scalper_command_center"
    | "mirofish_quant"
    | "stock_ai_trading_floor"
    | "road_to_billion"
    | "network"
    | "trade_logs"
    | "master_hub"
    | "d3_matrix"
    | "decision_board"
    | "ai_predictive_trend"
    | "bearish_engine"
    | "bullish_engine"
    | "pnl_chart"
    | "news_sentiment"
    | "mock_dashboard"
    | "ai_solution"
    | "trade_points"
    | "github_pattern_hub"
    | "asset_growth"
    | "ai_daily_report"
    | "performance_analysis"
    | "real_broker_holdings"
    | "portfolio_asset_classification"
    | "bot_status"
    | "risk_governor"
  >("mirofish_quant");

  // Active Category for Center View Tabs to prevent horizontal clutter
  const [activeCenterCategory, setActiveCenterCategory] = useState<"AI_TRADING_FLOOR" | "CHALLENGE" | "AI_QUANT" | "BOT_SYSTEM" | "PERFORMANCE">("AI_QUANT");

  // Sync category when centerTab changes
  useEffect(() => {
    if (centerTab === "stock_ai_trading_floor") {
      setActiveCenterCategory("AI_TRADING_FLOOR");
    } else if (["road_to_billion", "trade_logs", "scalper_command_center"].includes(centerTab)) {
      setActiveCenterCategory("CHALLENGE");
    } else if (["mirofish_quant", "ai_predictive_trend", "decision_board", "bullish_engine", "bearish_engine", "github_pattern_hub"].includes(centerTab)) {
      setActiveCenterCategory("AI_QUANT");
    } else if (["network", "bot_status", "master_hub", "risk_governor"].includes(centerTab)) {
      setActiveCenterCategory("BOT_SYSTEM");
    } else if (["ai_solution", "trade_points", "asset_growth", "ai_daily_report", "mock_dashboard", "d3_matrix", "pnl_chart", "performance_analysis", "real_broker_holdings", "portfolio_asset_classification"].includes(centerTab)) {
      setActiveCenterCategory("PERFORMANCE");
    }
  }, [centerTab]);

  // AI Autonomous Trading Master Switch
  const [isAutoTradingActive, setIsAutoTradingActive] = useState<boolean>(true);

  // Price Alert Target Modal state
  const [isPriceTargetModalOpen, setIsPriceTargetModalOpen] = useState(false);

  // Modals state
  const [isPwaInstallModalOpen, setIsPwaInstallModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isBotCreatorOpen, setIsBotCreatorOpen] = useState(false);
  const [isHoldingsModalOpen, setIsHoldingsModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [isPipelineHubModalOpen, setIsPipelineHubModalOpen] = useState(false);
  const [isYieldGuideOpen, setIsYieldGuideOpen] = useState(false);
  const [isBotAutoTuningOpen, setIsBotAutoTuningOpen] = useState(false);
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);
  const [isProfitSupervisoryModalOpen, setIsProfitSupervisoryModalOpen] = useState(false);
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");

  useEffect(() => {
    const handleOpenPipelineModal = () => setIsPipelineHubModalOpen(true);
    const handleOpenPriceAlert = () => setIsPriceTargetModalOpen(true);
    const handleOpenSupervisory = () => setIsProfitSupervisoryModalOpen(true);
    window.addEventListener("open-master-pipeline-modal", handleOpenPipelineModal);
    window.addEventListener("open-price-target-alert-modal", handleOpenPriceAlert);
    window.addEventListener("open-ai-profit-supervisory-modal", handleOpenSupervisory);
    return () => {
      window.removeEventListener("open-master-pipeline-modal", handleOpenPipelineModal);
      window.removeEventListener("open-price-target-alert-modal", handleOpenPriceAlert);
      window.removeEventListener("open-ai-profit-supervisory-modal", handleOpenSupervisory);
    };
  }, []);

  const handleOpenPredictionTrend = () => {
    setIsPredictionModalOpen(true);
    setCenterTab("ai_predictive_trend");
  };

  // Bot Config Modal State
  const [selectedConfigBot, setSelectedConfigBot] = useState<BotPresetItem | null>(null);
  const [isBotConfigModalOpen, setIsBotConfigModalOpen] = useState(false);

  // Master Scroll Lock for any open modal in Command Center
  const isAnyCommandCenterModalOpen =
    isGovernanceModalOpen ||
    isIssueLoggerModalOpen ||
    isThresholdModalOpen ||
    isApiConnectModalOpen ||
    isPriceTargetModalOpen ||
    isPwaInstallModalOpen ||
    isSearchModalOpen ||
    isHoldingsModalOpen ||
    isOrderModalOpen ||
    isPredictionModalOpen ||
    isPipelineHubModalOpen ||
    isProfitSupervisoryModalOpen ||
    isBotConfigModalOpen ||
    isBotCreatorOpen ||
    isYieldGuideOpen ||
    isBotAutoTuningOpen ||
    isHealthCheckOpen ||
    Boolean(activeMasterHubKey);

  useModalScrollLock(isAnyCommandCenterModalOpen);

  // Selected Stock State
  const [stocksList, setStocksList] = useState<StockItem[]>(() => getAllStocks());
  const [selectedStock, setSelectedStock] = useState<StockItem>(() => getAllStocks()[0]);
  const [predictionSearchQuery, setPredictionSearchQuery] = useState<string>("");

  const filteredModalStocks = useMemo(() => {
    if (!predictionSearchQuery.trim()) return [];
    const q = predictionSearchQuery.trim();
    return stocksList.filter(s =>
      matchesChosungOrKeyword(s.name, s.symbol, q, [s.theme, s.categoryLabel, s.strategy, s.market])
    ).slice(0, 12);
  }, [predictionSearchQuery, stocksList]);

  // Watchlist & Right list filter tab
  const [watchlist, setWatchlist] = useState<string[]>(["012450", "000660", "277810", "SOL", "034020"]);
  const [rightListTab, setRightListTab] = useState<"realtime" | "watch" | "holdings" | "risk">("realtime");

  // Bot Category Filter
  const [botCategoryFilter, setBotCategoryFilter] = useState<"ALL" | "SMALL" | "MID" | "LARGE" | "CRYPTO">("ALL");

  // Real-time Clock string & Tick Timestamp
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [lastTickTimestamp, setLastTickTimestamp] = useState<string>("");
  const [isTickPulseActive, setIsTickPulseActive] = useState<boolean>(false);

  // Live Alerts stream
  const [liveAlerts, setLiveAlerts] = useState<
    { id: string; time: string; name: string; symbol: string; text: string; type: "CRITICAL" | "INFO" | "SUCCESS"; timestamp?: number }[]
  >([
    { id: "init_1", time: "09:36:12", name: "한화에어로스페이스", symbol: "012450", text: "Bull Flag 돌파 가속 신호 감지", type: "SUCCESS", timestamp: Date.now() - 50000 },
    { id: "init_2", time: "09:35:48", name: "레인보우로보틱스", symbol: "277810", text: "소형주 거래대금 500% 폭발 세력 유입", type: "CRITICAL", timestamp: Date.now() - 40000 },
    { id: "init_3", time: "09:34:20", name: "두산에너빌리티", symbol: "034020", text: "BOS 구조 상방 돌파 및 거래량 가속", type: "SUCCESS", timestamp: Date.now() - 30000 },
    { id: "init_4", time: "09:33:05", name: "솔라나 (SOL)", symbol: "SOL", text: "업비트 24H 볼륨 브레이크 1위 달성", type: "INFO", timestamp: Date.now() - 20000 },
    { id: "init_5", time: "09:31:18", name: "삼성전자", symbol: "005930", text: "기관 VWAP 지지선 안착 확인", type: "INFO", timestamp: Date.now() - 10000 }
  ]);

  // Real-time clock ticker
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hours = d.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      const hStr = String(hours % 12 || 12).padStart(2, "0");
      const mStr = String(d.getMinutes()).padStart(2, "0");
      const sStr = String(d.getSeconds()).padStart(2, "0");
      setCurrentTimeStr(`${ampm} ${hStr}:${mStr}:${sStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Screen resize handler (Automatic PC vs Mobile screen ratio optimization)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setViewMode("mobile");
      } else {
        setViewMode("pc");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Real-time market data quotes subscription (KRX & Upbit Live)
  useEffect(() => {
    const unsubFeed = realtimeMarketFeedService.subscribe((quotesMap) => {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, "0");
      const da = String(now.getDate()).padStart(2, "0");
      const hr = String(now.getHours()).padStart(2, "0");
      const mi = String(now.getMinutes()).padStart(2, "0");
      const se = String(now.getSeconds()).padStart(2, "0");
      const ms = String(now.getMilliseconds()).padStart(3, "0");
      setLastTickTimestamp(`${yr}.${mo}.${da} ${hr}:${mi}:${se}.${ms}`);
      setIsTickPulseActive(true);
      setTimeout(() => setIsTickPulseActive(false), 400);

      setStocksList((prev) =>
        prev.map((item) => {
          const live = quotesMap.get(item.symbol);
          if (live) {
            return {
              ...item,
              price: live.price,
              changeRate: live.changeRate,
              changeAmount: live.changeAmount,
              tradeValue: live.tradeValue || item.tradeValue,
              volume: live.volume || item.volume
            };
          }
          return item;
        })
      );

      setSelectedStock((prev) => {
        const live = quotesMap.get(prev.symbol);
        if (live) {
          return {
            ...prev,
            price: live.price,
            changeRate: live.changeRate,
            changeAmount: live.changeAmount,
            tradeValue: live.tradeValue || prev.tradeValue,
            volume: live.volume || prev.volume
          };
        }
        return prev;
      });
    });

    return () => unsubFeed();
  }, []);

  // Threshold alert subscription & real-time evaluation loop
  useEffect(() => {
    const handleOpenApiConnect = () => {
      setIsApiConnectModalOpen(true);
    };
    window.addEventListener("open-api-connect-modal", handleOpenApiConnect);
    return () => {
      window.removeEventListener("open-api-connect-modal", handleOpenApiConnect);
    };
  }, []);

  useEffect(() => {
    const unsub = thresholdAlertEngine.subscribe((event) => {
      setAlertCount(thresholdAlertEngine.getHistory().length);
      setLiveAlerts((prev) => [
        {
          id: event.id,
          time: event.timestamp,
          name: event.botName,
          symbol: event.botId,
          text: event.message,
          type: event.type === "PROFIT_TARGET_HIT" ? "SUCCESS" : "CRITICAL"
        },
        ...prev.slice(0, 7)
      ]);
    });

    // Real-time market feed subscription for bot threshold evaluations and live price alerts
    const unsubFeed = realtimeMarketFeedService.subscribe((quotesMap) => {
      if (!isAutoTradingActive) return;

      // 1. Evaluate bots using actual portfolio positions or real-time market quote performances
      const bots = getAllBots();
      if (bots.length > 0) {
        bots.forEach((bot) => {
          // Find matching active position or stock quote
          const topStockName = bot.topDiscoveredStocks && bot.topDiscoveredStocks.length > 0 ? bot.topDiscoveredStocks[0] : "";
          const matchingPos = positions.find(p => (topStockName && p.name.includes(topStockName)) || p.name.includes(bot.name));
          if (matchingPos && matchingPos.avgPrice > 0) {
            const actualReturn = Number((((matchingPos.currentPrice - matchingPos.avgPrice) / matchingPos.avgPrice) * 100).toFixed(2));
            thresholdAlertEngine.evaluateBot(bot.id, bot.name, actualReturn);
          } else {
            const liveQuote = quotesMap.get("005930") || Array.from(quotesMap.values())[0];
            if (liveQuote) {
              thresholdAlertEngine.evaluateBot(bot.id, bot.name, Number(liveQuote.changeRate.toFixed(2)));
            }
          }
        });
      }

      // 2. Generate live market alerts from real-time price movers & volume surges
      const quotes = Array.from(quotesMap.values());
      const highMovers = quotes.filter(q => {
        const vol = typeof q.volume === "number" ? q.volume : (Number(q.volume) || 0);
        return Math.abs(q.changeRate) >= 1.5 || vol > 500000;
      });
      if (highMovers.length > 0) {
        const pick = highMovers[Math.floor(Math.random() * highMovers.length)];
        const d = new Date();
        const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
        const isUp = pick.changeRate >= 0;

        setLiveAlerts((prev) => {
          const nowMs = Date.now();
          // Avoid immediate duplicate alerts within 5 seconds for the same symbol
          if (prev.length > 0 && prev[0].symbol === pick.symbol && prev[0].timestamp && (nowMs - prev[0].timestamp < 5000)) {
            return prev;
          }
          const uniqueId = `alert_${pick.symbol}_${nowMs}_${Math.random().toString(36).substring(2, 9)}`;
          return [
            {
              id: uniqueId,
              time,
              name: pick.name,
              symbol: pick.symbol,
              text: `${pick.name} 실시간 ${isUp ? "+" : ""}${pick.changeRate.toFixed(2)}% ${isUp ? "상승 돌파" : "변동성 포착"} (현재가: ₩${pick.price.toLocaleString()})`,
              type: isUp ? ("SUCCESS" as const) : ("CRITICAL" as const),
              timestamp: nowMs
            },
            ...prev.slice(0, 7)
          ];
        });
      }
    });

    return () => {
      unsub();
      unsubFeed();
    };
  }, [isAutoTradingActive, positions]);

  // Open stock search modal custom event listener
  const handleViewStockDeepScan = (symbol: string) => {
    const found = stocksList.find((s) => s.symbol === symbol) || getAllStocks().find((s) => s.symbol === symbol);
    if (found) {
      setSelectedStock(found);
    } else {
      setSelectedStock({
        symbol,
        name: symbol,
        price: 10000,
        changeRate: 0,
        changeAmount: 0,
        volume: "1,000,000",
        market: symbol === "BTC" || symbol === "ETH" || symbol.startsWith("KRW-") ? "BTC" : "KOREA",
        category: "MID"
      });
    }
    setIsPredictionModalOpen(true);
    setCenterTab("ai_predictive_trend");
  };

  useEffect(() => {
    const handleOpenModal = () => setIsSearchModalOpen(true);
    const handleDeepScanEvent = (e: any) => {
      const sym = e.detail?.symbol;
      if (sym) {
        handleViewStockDeepScan(sym);
      }
    };
    window.addEventListener("open-stock-search-modal", handleOpenModal);
    window.addEventListener("open-stock-deepscan", handleDeepScanEvent);
    return () => {
      window.removeEventListener("open-stock-search-modal", handleOpenModal);
      window.removeEventListener("open-stock-deepscan", handleDeepScanEvent);
    };
  }, [stocksList]);

  const handleSelectStock = (stock: StockItem) => {
    setSelectedStock(stock);
  };

  const handleSelectStockBySymbol = (symbol: string) => {
    const found = stocksList.find((s) => s.symbol === symbol) || getAllStocks().find((s) => s.symbol === symbol);
    if (found) {
      setSelectedStock(found);
    }
  };

  const handleAddToWatchlist = (stock: StockItem) => {
    if (!watchlist.includes(stock.symbol)) {
      setWatchlist((prev) => [...prev, stock.symbol]);
    }
  };

  const handleOpenBotConfig = (bot: BotPresetItem) => {
    setSelectedConfigBot(bot);
    setIsBotConfigModalOpen(true);
  };

  // Nav click handler for all sidebar buttons
  const handleNavClick = (name: string) => {
    setActiveNav(name);
    if (name === "AI 플로어" || name === "홈") {
      setCenterTab("stock_ai_trading_floor");
      setActiveCenterCategory("AI_TRADING_FLOOR");
    } else if (name === "24H 자율순환") {
      setCenterTab("day_night_24h_engine");
      setActiveCenterCategory("AI_TRADING_FLOOR");
    } else if (name === "10억 챌린지") {
      setCenterTab("road_to_billion");
      setActiveCenterCategory("CHALLENGE");
    } else if (name === "스캐너" || name === "종목검색") {
      setActiveMasterHubKey("keyword_scanner");
    } else if (name === "AI TOP") {
      setActiveMasterHubKey("securities_consensus");
    } else if (name === "보유종목") {
      setIsHoldingsModalOpen(true);
    } else if (name === "알림") {
      setIsThresholdModalOpen(true);
    } else if (name === "BOT 센터") {
      setActiveMasterHubKey("multi_bot_securities");
    } else if (name === "성과 분석") {
      setActiveMasterHubKey("quant_setup_matrix");
    } else if (name === "전략 LAB") {
      setActiveMasterHubKey("strategy_sandbox");
    } else if (name === "시장" || name === "업종/테마") {
      setActiveMasterHubKey("orderbook_scanner");
    } else if (name === "차트") {
      setCenterTab("trade_points");
      setActiveCenterCategory("AI_QUANT");
    } else if (name === "설정") {
      setActiveMasterHubKey("unified_trading_control");
    } else if (name === "API 연결") {
      setIsApiConnectModalOpen(true);
    } else if (name === "AI 문제 해결사" || name === "AI Resolver" || name === "시스템 오류 보고") {
      setIsIssueLoggerModalOpen(true);
      setCenterTab("ai_problem_resolver");
      setActiveCenterCategory("BOT_SYSTEM");
    } else if (name === "AI예측 그래프" || name === "AI예측") {
      handleOpenPredictionTrend();
    }
  };

  // Filtered right list items
  const filteredRightList = stocksList.filter((s) => {
    if (rightListTab === "watch") return watchlist.includes(s.symbol);
    if (rightListTab === "holdings") {
      if (positions && positions.length > 0) {
        return positions.some((p) => p.symbol === s.symbol);
      }
      return ["012450", "277810", "005930", "034020", "BTC"].includes(s.symbol);
    }
    if (rightListTab === "risk") return s.signal === "AVOID" || s.signal === "EXIT_RISK" || s.grade === "C";
    return true; // realtime
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col antialiased select-none">
      {/* 0. TOP MARKET HOURS LIVE WIDGET & GLOBAL PIPELINE STATUS */}
      <TopMarketHoursLiveWidget
        isRealTradingMode={isRealTradingMode}
        onSetRealTradingMode={(setReal) => {
          if (setReal) {
            updateProfileSettings({ isRealTrade: true });
            if (addToast) {
              addToast({
                type: "SUCCESS",
                title: "🔥 실전계좌 LIVE 모드로 전환되었습니다.",
                message: "한국투자증권, 업비트, 토스증권 API 실시간 잔고가 연결됩니다."
              });
            }
            syncRealAccountBalance("all", true).catch(() => {});
          } else {
            updateProfileSettings({ isRealTrade: false });
            if (addToast) {
              addToast({
                type: "INFO",
                title: "🛡️ 모의투자 모드로 전환되었습니다.",
                message: "가상 모의투자 시뮬레이션 환경으로 전환되었습니다."
              });
            }
          }
        }}
        onToggleRealTradingMode={() => {
          const nextMode = !isRealTradingMode;
          if (nextMode) {
            updateProfileSettings({ isRealTrade: true });
            if (addToast) {
              addToast({
                type: "SUCCESS",
                title: "🔥 실전계좌 LIVE 모드로 전환되었습니다.",
                message: "한국투자증권, 업비트, 토스증권 API 실시간 잔고가 연결됩니다."
              });
            }
            syncRealAccountBalance("all", true).catch(() => {});
          } else {
            updateProfileSettings({ isRealTrade: false });
            if (addToast) {
              addToast({
                type: "INFO",
                title: "🛡️ 모의투자 모드로 전환되었습니다.",
                message: "가상 모의투자 시뮬레이션 환경으로 전환되었습니다."
              });
            }
          }
        }}
        onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
        onOpenApiConnectModal={() => setIsApiConnectModalOpen(true)}
        onOpenPipelineHubModal={() => setIsPipelineHubModalOpen(true)}
        alertCount={alertCount}
        isAutoTradingActive={isAutoTradingActive}
        onToggleAutoTrading={() => {
          const next = !isAutoTradingActive;
          setIsAutoTradingActive(next);
          alert(next ? "⚡ [AI 자율매매 가동] 12개 봇의 실시간 매매 알고리즘이 재개되었습니다." : "🛑 [AI 자율매매 정지] 모든 봇의 자동 주문 및 매매 파이프라인이 동결되었습니다.");
        }}
      />

      {/* 0.5 REAL-TIME AI ACTIVE POOL SCANNER BANNER (10-BILLION CHALLENGE TRANSPARENCY) */}
      <AiActivePoolRealtimeScannerBar />

      {/* 1. TOP HEADER BAR */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-3 sm:px-4 py-2 shadow-2xs transition-colors duration-200">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-3">
          {/* Brand Logo & Version */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap">
                AI 자율투자 통합 관제 센터
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-bold whitespace-nowrap">
                전문가용 V6.2
              </span>
            </div>
          </div>

          {/* Unified Search & Bot Command Bar */}
          <div className="flex-1 min-w-[280px] max-w-2xl lg:max-w-3xl hidden md:block">
            <UnifiedSearchAndCommandBar
              onSelectStock={(sym) => handleSelectStock(sym)}
              onExecuteCommand={(cmd) => {
                if (cmd.includes("start")) {
                  setIsAutoTradingActive(true);
                } else if (cmd.includes("stop")) {
                  setIsAutoTradingActive(false);
                } else {
                  setIsSearchModalOpen(true);
                }
              }}
            />
          </div>

          {/* Market Ticker Strip */}
          <div className="hidden 2xl:flex items-center gap-4 text-xs font-mono shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 dark:text-slate-400">KOSPI</span>
              <span className={`font-black ${
                (marketStatus?.kospi?.change ?? 0) >= 0 ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
              }`}>
                {marketStatus?.kospi?.current?.toLocaleString() || "2,674.31"} {marketStatus?.kospi?.changeRate ? `${marketStatus.kospi.changeRate > 0 ? "+" : ""}${marketStatus.kospi.changeRate.toFixed(2)}%` : "+0.65%"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 dark:text-slate-400">KOSDAQ</span>
              <span className={`font-black ${
                (marketStatus?.kosdaq?.change ?? 0) >= 0 ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
              }`}>
                {marketStatus?.kosdaq?.current?.toLocaleString() || "873.22"} {marketStatus?.kosdaq?.changeRate ? `${marketStatus.kosdaq.changeRate > 0 ? "+" : ""}${marketStatus.kosdaq.changeRate.toFixed(2)}%` : "+1.23%"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 dark:text-slate-400">외국인</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">+2,854억 ▲</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 dark:text-slate-400">기관</span>
              <span className="font-black text-sky-600 dark:text-sky-400">+1,247억 ▲</span>
            </div>
          </div>

          {/* Right Controls Group */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 py-0.5 max-w-full">
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0">
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{currentTimeStr || "AM 09:36:25"}</span>
            </div>

            {/* ANTI-DOWNTREND ENGINE V5 LIVE STATUS INDICATOR & PUSH ALERTS */}
            <div className="shrink-0">
              <AntiDowntrendV5Indicator />
            </div>

            {/* KILL-SWITCH ON / OFF HOME MASTER BUTTON */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (isKillSwitchActive) {
                    toggleKillSwitch(false);
                    addToast({
                      type: "SUCCESS",
                      title: "🟢 [킬-스위치 해제] 정상 자율매매 가동",
                      message: "킬-스위치가 OFF 되었습니다. AI 주문 및 실시간 매수 스캔이 재개됩니다."
                    });
                  } else {
                    toggleKillSwitch(true, "USER_MANUAL_EMERGENCY");
                    addToast({
                      type: "CRITICAL",
                      title: "🛑 [킬-스위치 가동] 전 종목 매수 긴급 동결",
                      message: "킬-스위치가 ON 되었습니다. 신규 매수가 전면 차단되고 안전 방어 모드가 가동됩니다."
                    });
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black transition cursor-pointer whitespace-nowrap shadow-xs ${
                  isKillSwitchActive
                    ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-1 ring-rose-400"
                    : "bg-emerald-600/10 dark:bg-emerald-950/50 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                }`}
                title={
                  isKillSwitchActive
                    ? "킬-스위치 ON (신규 매수 차단 중). 클릭하여 정상 매매로 해제(OFF)"
                    : "킬-스위치 OFF (정상 가동 중). 비상 시 클릭하여 신규 매수 전면 차단(ON)"
                }
              >
                {isKillSwitchActive ? (
                  <>
                    <Lock className="w-3.5 h-3.5 fill-white text-white shrink-0" />
                    <span>킬스위치 ON</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>킬스위치 OFF</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsGovernanceModalOpen(true)}
                className="px-1.5 py-1 text-slate-400 hover:text-slate-900 dark:hover:text-white text-[11px] font-mono hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                title="AI 세이프티 거버넌스 및 손절 쿨다운 상세 관제"
              >
                ⚙️
              </button>
            </div>

            {/* PWA Download / Install App Button */}
            <button
              onClick={() => setIsPwaInstallModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              title="AISTOCK 24 앱 다운로드 & 홈 화면 설치 (PWA)"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">PWA 앱</span>
            </button>

            {/* REALTIME ISSUE DIAGNOSIS & AI SOLUTION BUTTON */}
            <button
              onClick={() => setIsIssueLoggerModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-xs whitespace-nowrap shrink-0 border border-rose-400/30"
              title="실거래 중 문제발생 원인 기록 & AI 해결방안 도출"
            >
              <Bug className="w-3.5 h-3.5 text-rose-200 shrink-0" />
              <span>🚨 문제진단/AI해결</span>
            </button>

            {/* Instant Dark / Light Theme Switcher */}
            <div className="shrink-0">
              <ThemeSwitcher />
            </div>

            {/* View Mode Toggle (PC / Mobile) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setViewMode("pc")}
                className={`p-1 rounded-md transition cursor-pointer ${
                  viewMode === "pc" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                title="PC 터미널 뷰"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`p-1 rounded-md transition cursor-pointer ${
                  viewMode === "mobile" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                title="모바일 뷰"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MASTER FEATURE CONSOLE QUICK LAUNCH STRIP */}
      <div className="bg-slate-900 text-white px-3 py-1.5 border-b border-slate-800 shadow-inner flex items-center justify-between gap-3 overflow-x-auto scrollbar-none text-xs font-sans shrink-0">
        <div className="flex items-center gap-1.5 shrink-0 font-bold text-blue-400 whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="hidden sm:inline">AI 통합 콘솔 ({MASTER_FEATURE_LIST.length}):</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {MASTER_FEATURE_LIST.map((feat) => (
            <button
              key={feat.key}
              onClick={() => {
                setActiveMasterHubKey(feat.key);
                setIsPipelineHubModalOpen(true);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border ${
                activeMasterHubKey === feat.key
                  ? "bg-blue-600 text-white border-blue-400 shadow-xs"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <span>{feat.badge}</span>
              <span>{feat.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE VIEW */}
      {viewMode === "mobile" ? (
        <div className="flex-1 flex flex-col pb-20">
          <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (isRealTradingMode) {
                    updateProfileSettings({ isRealTrade: false });
                    addToast({
                      type: "INFO",
                      title: "🛡️ 모의투자 모드 전환",
                      message: "안전한 가상 모의투자 모드로 전환되었습니다."
                    });
                  }
                }}
                className={`px-1.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold transition cursor-pointer ${
                  !isRealTradingMode
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="모의투자 모드"
              >
                <span>🛡️ 모의</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isRealTradingMode) {
                    updateProfileSettings({ isRealTrade: true });
                    addToast({
                      type: "SUCCESS",
                      title: "🔥 실전계좌 LIVE 가동",
                      message: "업비트/증권사 실계좌 자율 매매가 활성화되었습니다!"
                    });
                    syncRealAccountBalance("all", true).catch(() => {});
                  } else {
                    addToast({
                      type: "INFO",
                      title: "🔥 이미 실전계좌 LIVE 모드입니다.",
                      message: "실시간 계좌 잔고를 갱신합니다."
                    });
                    syncRealAccountBalance("all", true).catch(() => {});
                  }
                }}
                className={`px-1.5 py-1 rounded-md text-[10px] sm:text-[11px] font-black transition cursor-pointer ${
                  isRealTradingMode
                    ? "bg-rose-600 text-white shadow-xs animate-pulse"
                    : "text-slate-400 hover:text-white"
                }`}
                title="실전계좌 LIVE"
              >
                <span>🔥 실전</span>
              </button>
            </div>
            <div className="flex-1 min-w-[130px] sm:min-w-[200px]">
              <UnifiedSearchAndCommandBar
                onSelectStock={(sym) => handleSelectStock(sym)}
                onExecuteCommand={(cmd) => {
                  if (cmd.includes("start")) {
                    setIsAutoTradingActive(true);
                  } else if (cmd.includes("stop")) {
                    setIsAutoTradingActive(false);
                  } else {
                    setIsSearchModalOpen(true);
                  }
                }}
              />
            </div>
            <button
              onClick={() => {
                if (isKillSwitchActive) {
                  toggleKillSwitch(false);
                  addToast({
                    type: "SUCCESS",
                    title: "🟢 [킬-스위치 해제] 정상 자율매매 가동",
                    message: "킬-스위치가 OFF 되었습니다. AI 주문이 재개됩니다."
                  });
                } else {
                  toggleKillSwitch(true, "USER_MANUAL_EMERGENCY");
                  addToast({
                    type: "CRITICAL",
                    title: "🛑 [킬-스위치 가동] 전 종목 매수 긴급 동결",
                    message: "킬-스위치가 ON 되었습니다. 신규 매수가 전면 차단됩니다."
                  });
                }
              }}
              className={`px-2 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shrink-0 cursor-pointer shadow-xs transition ${
                isKillSwitchActive
                  ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse"
                  : "bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40"
              }`}
              title={isKillSwitchActive ? "킬-스위치 작동 중 (클릭 시 해제)" : "킬-스위치 정상 (클릭 시 긴급 정지)"}
            >
              {isKillSwitchActive ? (
                <>
                  <Lock className="w-3.5 h-3.5 fill-white text-white" />
                  <span className="text-[10px]">킬ON</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px]">킬OFF</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsHoldingsModalOpen(true)}
              className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 rounded-xl text-xs font-black flex items-center gap-1 shrink-0 cursor-pointer shadow-sm active:scale-95 min-h-[44px]"
              title="실시간 보유종목 및 계좌 잔고 모달 열기"
            >
              <Layers className="w-4 h-4 text-emerald-200 shrink-0" />
              <span className="font-bold">💼 보유 ({positions?.length || 0})</span>
            </button>
            <button
              onClick={() => setIsApiConnectModalOpen(true)}
              className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-400/40 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer min-h-[44px]"
              title="증권사/업비트 연동 설정"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">API</span>
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Global Master Switch for Mobile */}
            <GlobalAutoTradingMasterSwitch
              isAutoTradingActive={isAutoTradingActive}
              onToggleAutoTrading={setIsAutoTradingActive}
            />

            {(mobileTab === "scalper" || mobileTab === "home" || mobileTab === "floor" || mobileTab === "challenge") && (
              <div className="space-y-3">
                {/* Mobile Quick Mode Selector: Scalper V1 vs 30인 AI Floor vs 10-Billion Challenge */}
                <div className="flex items-center gap-1 p-1 bg-slate-800/90 border border-slate-700/80 rounded-xl overflow-x-auto">
                  <button
                    onClick={() => setMobileTab("scalper")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                      mobileTab === "scalper"
                        ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 shadow-md ring-1 ring-emerald-300"
                        : "text-emerald-400 hover:text-white"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>🔥 스캘퍼 V1</span>
                  </button>
                  <button
                    onClick={() => setMobileTab("floor")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                      mobileTab === "floor"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>🏢 AI 플로어</span>
                  </button>
                  <button
                    onClick={() => setMobileTab("challenge")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                      mobileTab === "challenge"
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5 fill-current" />
                    <span>⚡ 10억 챌린지</span>
                  </button>
                </div>

                {mobileTab === "scalper" ? (
                  <ScalperCommandCenterUi />
                ) : mobileTab === "challenge" ? (
                  <div className="space-y-3">
                    <RoadToBillionChallengeDashboard />
                  </div>
                ) : (
                  <StockAiTradingFloorMasterScreen />
                )}

                {/* Mobile Performance & Logs */}
                <AiBotHistoricalSuccessRateChart />
                <AiBotThresholdActivityLogPanel />
              </div>
            )}

            {mobileTab === "predict" && (
              <div className="space-y-4">
                <PredictionChart stock={selectedStock} daysForecast={30} />
                <AiPricePredictionEngine />
              </div>
            )}

            {mobileTab === "chart" && (
              <LightCandlestickChart
                stock={selectedStock}
                onTradeClick={(side) => {
                  setOrderType(side);
                  setIsOrderModalOpen(true);
                }}
              />
            )}

            {mobileTab === "bots" && (
              <D3BotPerformanceMatrix />
            )}

            {mobileTab === "holdings" && (
              <div className="space-y-4">
                <RealBrokerDetailedBalanceAndHoldings
                  onSelectAssetForChart={(symbol, name, market) => {
                    handleSelectStockBySymbol(symbol);
                    setMobileTab("chart");
                  }}
                />
                <PortfolioAssetStatusWidget
                  onOpenHoldingsModal={() => setIsHoldingsModalOpen(true)}
                  onOpenQuickOrder={(sym, name, type) => {
                    handleSelectStockBySymbol(sym);
                    setOrderType(type);
                    setIsOrderModalOpen(true);
                  }}
                  onOpenApiConnectModal={() => setIsApiConnectModalOpen(true)}
                />
              </div>
            )}

            {mobileTab === "menu" && (
              <div className="space-y-4 pb-8">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 p-4 rounded-2xl border border-blue-500/40 text-white shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-cyan-300">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-cyan-300">📱 모바일 전체 기능 제어 센터</h3>
                      <p className="text-[11px] text-slate-300 mt-0.5">화면에 안 보이는 모든 실거래/AI 기능을 바로 실행할 수 있습니다.</p>
                    </div>
                  </div>
                </div>

                {/* 🚨 AI 고변동성 종목 임계치 이탈 경보 시스템 (전체 메뉴 배치) */}
                <div className="space-y-3 p-1 bg-slate-950/80 border border-rose-500/30 rounded-2xl">
                  <div className="flex items-center justify-between p-2 pb-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
                      <h3 className="text-xs font-black text-rose-300">
                        ⚡ AI 고변동성 종목 임계치 경보 관제 센터
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsThresholdModalOpen(true)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>임계치 설정</span>
                    </button>
                  </div>

                  <AiHighVolatilityAlertSystem
                    onSelectStock={handleViewStockDeepScan}
                    onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
                  />

                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                        <span>AI 임계치 실시간 트리거 &amp; 체결 반응 기록</span>
                      </span>
                    </div>
                    <AiBotThresholdActivityLogPanel />
                  </div>
                </div>

                {/* System Error & Issue Diagnosis Logger Highlight Banner */}
                <div className="bg-gradient-to-r from-rose-950 via-pink-950 to-slate-900 border-2 border-rose-500/60 p-3.5 rounded-2xl shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-rose-600/30 border border-rose-400/40 rounded-xl text-rose-300 shrink-0">
                        <Bug className="w-6 h-6 text-rose-400 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full">
                            🚨 필수 진단
                          </span>
                          <span className="text-xs font-black text-rose-200">시스템 오류 현상 기록 & AI 해결사</span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-medium mt-0.5">매매 지연 · 손실 누적 · UI 버튼 멈춤 현상 원인 자동 진단</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsIssueLoggerModalOpen(true)}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Bug className="w-3.5 h-3.5 text-white" />
                      <span>🚨 오류기록 / AI해결</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsIssueLoggerModalOpen(true);
                      }}
                      className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span>🛠️ 실거래 진단 로그</span>
                    </button>
                  </div>
                </div>

                {/* Quick Grid Menu Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setIsIssueLoggerModalOpen(true)}
                    className="p-3.5 bg-gradient-to-br from-rose-950/90 to-slate-900 border-2 border-rose-500/50 rounded-xl text-left hover:border-rose-400 active:scale-98 transition shadow-md flex flex-col justify-between min-h-[100px] cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-black">
                        🚨 오류/이상 보고
                      </span>
                      <Bug className="w-5 h-5 text-rose-400 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white mt-2">시스템 오류 현상 기록</div>
                      <div className="text-[10px] text-rose-300/80">AI 원인분석 & 즉시 패치</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveMasterHubKey("micro_capital_auto");
                      setIsPipelineHubModalOpen(true);
                    }}
                    className="p-3.5 bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/40 rounded-xl text-left hover:border-emerald-400 active:scale-98 transition shadow-md flex flex-col justify-between min-h-[100px] cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black">
                        ⚡ 소액실거래
                      </span>
                      <Coins className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white mt-2">소액전용 자율매매</div>
                      <div className="text-[10px] text-emerald-300/80">실잔고 맞춤형 스캘핑</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setIsPipelineHubModalOpen(true)}
                    className="p-3.5 bg-gradient-to-br from-blue-950/80 to-slate-900 border border-blue-500/40 rounded-xl text-left hover:border-blue-400 active:scale-98 transition shadow-md flex flex-col justify-between min-h-[100px] cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-black">
                        🚀 13파이프라인
                      </span>
                      <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white mt-2">마스터 파이프라인</div>
                      <div className="text-[10px] text-blue-300/80">13개 AI 엔진 관제</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setIsApiConnectModalOpen(true)}
                    className="p-3.5 bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/40 rounded-xl text-left hover:border-indigo-400 active:scale-98 transition shadow-md flex flex-col justify-between min-h-[100px] cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-black">
                        🔑 API 계좌연결
                      </span>
                      <Key className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white mt-2">증권사 / 업비트 연동</div>
                      <div className="text-[10px] text-indigo-300/80">한투·업비트·토스 키 설정</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setIsOrderModalOpen(true)}
                    className="p-3.5 bg-gradient-to-br from-amber-950/80 to-slate-900 border border-amber-500/40 rounded-xl text-left hover:border-amber-400 active:scale-98 transition shadow-md flex flex-col justify-between min-h-[100px] cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-black">
                        📊 호가 주문
                      </span>
                      <TrendingUp className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white mt-2">빠른 호가 매수/매도</div>
                      <div className="text-[10px] text-amber-300/80">스마트 주문 창</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMobileTab("challenge")}
                    className="p-3.5 bg-gradient-to-br from-purple-950/80 to-slate-900 border border-purple-500/40 rounded-xl text-left hover:border-purple-400 active:scale-98 transition shadow-md flex flex-col justify-between min-h-[100px] cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-black">
                        🏆 10억 챌린지
                      </span>
                      <Trophy className="w-5 h-5 text-amber-400 fill-amber-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white mt-2">1분봉 단타 스캘핑</div>
                      <div className="text-[10px] text-purple-300/80">복리 고속 성장 시스템</div>
                    </div>
                  </button>

                  <button
                    onClick={handleOpenPredictionTrend}
                    className="p-3.5 bg-gradient-to-br from-cyan-950/80 to-slate-900 border border-cyan-500/40 rounded-xl text-left hover:border-cyan-400 active:scale-98 transition shadow-md flex flex-col justify-between min-h-[100px] cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-black">
                        🔮 30일 AI 예측
                      </span>
                      <Sparkles className="w-5 h-5 text-cyan-400 animate-spin" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white mt-2">딥러닝 시뮬레이션</div>
                      <div className="text-[10px] text-cyan-300/80">미래 주가 곡선 분석</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveMasterHubKey("risk_governor");
                      setIsPipelineHubModalOpen(true);
                    }}
                    className="p-3.5 bg-gradient-to-br from-rose-950/80 to-slate-900 border border-rose-500/40 rounded-xl text-left hover:border-rose-400 active:scale-98 transition shadow-md flex flex-col justify-between min-h-[100px] cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-black">
                        🛡️ 리스크 관제
                      </span>
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white mt-2">서킷브레이커 & 킬스위치</div>
                      <div className="text-[10px] text-rose-300/80">원금 손실 차단 방어선</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setIsThresholdModalOpen(true)}
                    className="p-3.5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700 rounded-xl text-left hover:border-slate-500 active:scale-98 transition shadow-md flex flex-col justify-between min-h-[100px] cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-black">
                        🔔 실시간 알림
                      </span>
                      <Bell className="w-5 h-5 text-amber-400 animate-bounce" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white mt-2">급등락 푸시 알림</div>
                      <div className="text-[10px] text-slate-400">목표가 & 변동성 감지</div>
                    </div>
                  </button>
                </div>

                {/* Additional Quick Action Row */}
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isRealTradingMode ? "bg-rose-500 animate-ping" : "bg-blue-400"}`}></span>
                    <span className="font-bold">현재 투자 모드: {isRealTradingMode ? "🔥 실전계좌 LIVE" : "🛡️ 모의투자"}</span>
                  </div>
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 shadow-xs">
                    <button
                      type="button"
                      onClick={() => {
                        if (isRealTradingMode) {
                          updateProfileSettings({ isRealTrade: false });
                          addToast({
                            type: "INFO",
                            title: "🛡️ 모의투자 모드로 전환",
                            message: "가상 모의투자 시뮬레이션 모드가 활성화되었습니다."
                          });
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                        !isRealTradingMode ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      모의
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isRealTradingMode) {
                          updateProfileSettings({ isRealTrade: true });
                          addToast({
                            type: "SUCCESS",
                            title: "🔥 실전계좌 LIVE 모드로 전환",
                            message: "실전 계좌 LIVE 거래가 활성화되었습니다."
                          });
                          syncRealAccountBalance("all", true).catch(() => {});
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md font-black transition cursor-pointer ${
                        isRealTradingMode ? "bg-rose-600 text-white animate-pulse" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      실전 LIVE
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around p-1 sm:p-1.5 z-50 shadow-lg pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            {[
              { key: "scalper", label: "⚡스캘퍼V1", icon: Zap },
              { key: "home", label: "10억챌린지", icon: Trophy },
              { key: "holdings", label: "보유종목", icon: Layers, badge: positions?.length || 0 },
              { key: "predict", label: "AI예측", icon: Sparkles },
              { key: "chart", label: "차트", icon: BarChart3 },
              { key: "bots", label: "AI봇", icon: Cpu },
              { key: "menu", label: "전체메뉴", icon: Sliders }
            ].map((t) => {
              const Icon = t.icon;
              const isActive = mobileTab === t.key || (t.key === "home" && (mobileTab === "challenge" || mobileTab === "home"));
              const isScalper = t.key === "scalper";
              const isHoldings = t.key === "holdings";
              return (
                <button
                  key={t.key}
                  onClick={() => setMobileTab(t.key as any)}
                  className={`flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-bold transition cursor-pointer min-h-[48px] justify-center flex-1 relative ${
                    isScalper && isActive
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black shadow-md ring-1 ring-emerald-300"
                      : isHoldings && isActive
                      ? "bg-emerald-600 text-white font-black shadow-md"
                      : isActive
                      ? "text-amber-500 dark:text-amber-400 font-extrabold"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-4 h-4 shrink-0 ${t.key === "predict" && isActive ? "text-cyan-400 animate-spin" : ""}`} />
                    {isHoldings && t.badge !== undefined && t.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-rose-500 text-white text-[8px] font-black border border-slate-900">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <span className="whitespace-nowrap tracking-tighter">{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      ) : (
        /* 2. PC 1920x1080 3-COLUMN TERMINAL LAYOUT */
        <div className="flex-1 max-w-[1920px] w-full mx-auto flex overflow-hidden">
          {/* LEFT SLIM ICON/LABEL SIDEBAR */}
          <aside className="w-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between py-3 shrink-0 transition-colors">
            <div className="space-y-1 px-1.5">
              {[
                { name: "홈", icon: Home },
                { name: "AI 플로어", icon: Brain },
                { name: "24H 자율순환", icon: Clock },
                { name: "10억 챌린지", icon: Trophy },
                { name: "AI예측 그래프", icon: Sparkles },
                { name: "스캐너", icon: Search },
                { name: "AI TOP", icon: Star },
                { name: "관심종목", icon: Star },
                { name: "보유종목", icon: PieChart },
                { name: "알림", icon: Bell },
                { name: "시장", icon: Activity },
                { name: "업종/테마", icon: Layers },
                { name: "차트", icon: BarChart3 },
                { name: "전략 LAB", icon: Sliders },
                { name: "성과 분석", icon: FileText },
                { name: "BOT 센터", icon: Bot },
                { name: "AI 문제 해결사", icon: Bug },
                { name: "설정", icon: Settings },
                { name: "API 연결", icon: Key }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.name)}
                    className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition cursor-pointer text-center ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black shadow-2xs ring-1 ring-blue-200 dark:ring-blue-800"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] tracking-tight leading-none whitespace-nowrap font-medium">{item.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="px-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto mb-1 animate-pulse"></div>
              <div className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 leading-tight">12개 봇<br/>정상 가동중</div>
            </div>
          </aside>

          {/* MAIN 3-COLUMN CONTENT CANVAS */}
          <main className="flex-1 p-3 overflow-y-auto space-y-3">
            {/* Global Master Switch to pause or resume automated trading immediately */}
            <GlobalAutoTradingMasterSwitch
              isAutoTradingActive={isAutoTradingActive}
              onToggleAutoTrading={setIsAutoTradingActive}
            />

            {/* Visual Alert System highlighting stocks experiencing high volatility outside thresholds */}
            <AiHighVolatilityAlertSystem
              onSelectStock={handleViewStockDeepScan}
              onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
            />

            {/* AI Total Profit Supervisory & Performance Governance Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 border border-emerald-500/40 rounded-2xl p-3 sm:p-3.5 shadow-lg shadow-emerald-500/5 flex flex-col md:flex-row items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shrink-0 shadow-md shadow-emerald-500/20">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-white">
                      👑 AI 총괄 수익 관리감독 &amp; 성과 극대화 거버넌스
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      실시간 성과 극대화 가동 중
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-300 mt-1 flex-wrap font-sans">
                    <span>AI 승률: <strong className="text-emerald-400 font-mono">86.4%</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>손익비: <strong className="text-cyan-400 font-mono">3.12 : 1</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>보존 이익금: <strong className="text-teal-400 font-mono">₩1,850,000</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>함정매수 차단: <strong className="text-amber-400 font-mono">38건</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => setIsProfitSupervisoryModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white hover:opacity-95 shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Award className="w-4 h-4 text-amber-300" />
                  관리감독 관제센터 열기
                </button>
              </div>
            </div>

            {/* Autonomous Trading Frozen Banner */}
            {!isAutoTradingActive && (
              <div className="bg-amber-500 text-white px-4 py-2.5 rounded-xl border border-amber-600 shadow-sm flex items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Pause className="w-4 h-4 fill-white shrink-0" />
                  <span>
                    <strong>[AI 자율매매 일시정지 상태]</strong> 모든 AI 봇의 자동 주문 및 매매 파이프라인이 안전하게 동결(Freeze)되었습니다.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsAutoTradingActive(true);
                    alert("⚡ [AI 자율매매 가동] 12개 봇의 실시간 매매 알고리즘이 재개되었습니다.");
                  }}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-amber-900 rounded-lg text-xs font-black transition cursor-pointer shadow-2xs whitespace-nowrap"
                >
                  자율매매 재개하기
                </button>
              </div>
            )}

            <div className="grid grid-cols-12 gap-3 items-start">
              {/* ========================================================================= */}
              {/* COLUMN 1 (LEFT 3 COLS): AI Signal Summary, Market Status, Investor Flow */}
              {/* ========================================================================= */}
              <div className="col-span-12 lg:col-span-3 space-y-3 min-w-0">
                {/* 1. AI Signal Summary Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs transition-colors">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight">AI 매매 시그널 종합</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">12대 알고리즘 통합</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-2.5">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-semibold">적극 매수</div>
                      <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">5종목</div>
                      <div className="text-[9px] text-emerald-700 dark:text-emerald-300 font-sans font-bold">강력 매수 진입</div>
                    </div>

                    <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-2.5">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-semibold">관망 대기</div>
                      <div className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">12종목</div>
                      <div className="text-[9px] text-amber-700 dark:text-amber-300 font-sans font-bold">타점 대기 중</div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-semibold">진입 회피</div>
                      <div className="text-base font-black text-slate-600 dark:text-slate-300 mt-0.5">3종목</div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 font-sans font-bold">리스크 회피</div>
                    </div>

                    <div className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-2.5">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-semibold">위험 청산</div>
                      <div className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">2종목</div>
                      <div className="text-[9px] text-rose-700 dark:text-rose-300 font-sans font-bold">익절/손절 집행</div>
                    </div>
                  </div>
                </div>

                {/* 2. Market Status Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight">실시간 시장 현황</span>
                    <span className="text-[10px] px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold rounded-full">
                      상승 우세장 (BULL)
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-sans">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>상승 종목수</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">1,256개 (66%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: "66%" }}></div>
                    </div>

                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-1">
                      <span>하락 종목수</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">512개 (27%)</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>보합 종목수</span>
                      <span className="font-mono font-bold text-slate-400 dark:text-slate-500">132개 (7%)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Investor Flow Card */}
                <InvestorFlowChart />
              </div>

              {/* ========================================================================= */}
              {/* COLUMN 2 (CENTER 6 COLS): 10-Billion Scalper / AI Quant / Matrix / Logs */}
              {/* ========================================================================= */}
              <div className="col-span-12 lg:col-span-6 space-y-3 min-w-0">
                {/* PROMINENT QUICK LAUNCH BANNER FOR SCALPER COMMAND CENTER */}
                <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/50 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 border border-emerald-500/30">
                      <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-white block truncate flex items-center gap-1.5">
                        🔥 초단타 AI 스캘퍼 커맨드 센터 (Scalper V1)
                        <span className="text-[10px] text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">신규 탑재</span>
                      </span>
                      <span className="text-[11px] text-emerald-300/90 block truncate">
                        8대 GitHub 스캘퍼 + OBI 호가잔량 + 12대 Bot Farm + 12-Gate 검증
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCenterCategory("CHALLENGE");
                      setCenterTab("scalper_command_center");
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-md shrink-0 cursor-pointer transition transform active:scale-95 flex items-center gap-1 border border-emerald-300/40"
                  >
                    <span>1클릭 바로가기</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* UNIFIED 5-TRACK TRADING & QUANT CATEGORY SELECTOR */}
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                  {/* Track Level Segmented Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                    {/* Track 1: 증권 AI 30인 플로어 (V6.2) */}
                    <button
                      onClick={() => {
                        setActiveCenterCategory("AI_TRADING_FLOOR");
                        setCenterTab("stock_ai_trading_floor");
                      }}
                      className={`px-2.5 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                        activeCenterCategory === "AI_TRADING_FLOOR"
                          ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-md ring-1 ring-cyan-300 animate-pulse"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      <Brain className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">🏢 증권 AI 30인 플로어</span>
                    </button>

                    {/* Track 2: 초단타 10억 챌린지 */}
                    <button
                      onClick={() => {
                        setActiveCenterCategory("CHALLENGE");
                        setCenterTab("scalper_command_center");
                      }}
                      className={`px-2.5 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                        activeCenterCategory === "CHALLENGE"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md ring-1 ring-amber-300"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span className="truncate">⚡ 초단타 10억 챌린지</span>
                    </button>

                    {/* Track 3: 중장기·스윙 퀀트 포트폴리오 */}
                    <button
                      onClick={() => {
                        setActiveCenterCategory("AI_QUANT");
                        setCenterTab("ai_predictive_trend");
                      }}
                      className={`px-2.5 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                        activeCenterCategory === "AI_QUANT"
                          ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">📈 중장기·스윙 퀀트</span>
                    </button>

                    {/* Track 4: AI 봇 오케스트레이터 */}
                    <button
                      onClick={() => {
                        setActiveCenterCategory("BOT_SYSTEM");
                        setCenterTab("network");
                      }}
                      className={`px-2.5 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                        activeCenterCategory === "BOT_SYSTEM"
                          ? "bg-purple-600 text-white shadow-md ring-1 ring-purple-400"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">🤖 AI 봇 오케스트레이터</span>
                    </button>

                    {/* Track 5: 실거래 & 자산 포트폴리오 */}
                    <button
                      onClick={() => {
                        setActiveCenterCategory("PERFORMANCE");
                        setCenterTab("real_broker_holdings");
                      }}
                      className={`px-2.5 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                        activeCenterCategory === "PERFORMANCE"
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-1 ring-emerald-300"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">💰 실거래·자산 포트폴리오</span>
                    </button>
                  </div>

                  {/* Contextual Sub-Tabs based on Selected Track */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5 text-xs font-bold">
                    {activeCenterCategory === "AI_TRADING_FLOOR" && (
                      <button
                        onClick={() => setCenterTab("stock_ai_trading_floor")}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                          centerTab === "stock_ai_trading_floor"
                            ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black shadow-xs ring-1 ring-cyan-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-cyan-50 hover:text-cyan-900 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <Brain className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                        <span>🏢 30인 AI 증권사 실시간 트레이딩 플로어 (V6.2 마스터 스크린)</span>
                      </button>
                    )}

                    {activeCenterCategory === "CHALLENGE" && (
                      <>
                        <button
                          onClick={() => setCenterTab("scalper_command_center")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "scalper_command_center"
                              ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-black shadow-md ring-2 ring-emerald-400"
                              : "bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-500/40 font-bold"
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                          <span>🔥 SCALPER COMMAND CENTER V1 (초단타 AI 커맨드 센터)</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("road_to_billion")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "road_to_billion"
                              ? "bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-900 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Trophy className="w-3.5 h-3.5 text-amber-900 fill-amber-500" />
                          <span>⚡ 1000억 챌린지 로드맵 (Road to 100B)</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("trade_logs")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "trade_logs"
                              ? "bg-rose-600 text-white font-black shadow-xs ring-1 ring-rose-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-900 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Activity className="w-3.5 h-3.5 text-rose-500" />
                          <span>🔥 실시간 사고팔고 체결/탐지 로그</span>
                        </button>
                      </>
                    )}

                    {activeCenterCategory === "AI_QUANT" && (
                      <>
                        <button
                          onClick={() => setCenterTab("mirofish_quant")}
                          className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "mirofish_quant"
                              ? "bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white font-black shadow-md ring-2 ring-blue-400"
                              : "bg-gradient-to-r from-slate-900 to-blue-950 text-blue-300 hover:text-white border border-blue-500/40 font-bold"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                          <span>🐟 마이로피시 AI 퀀트 대시보드 (Mirofish Quant)</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("ai_long_short_scanner")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "ai_long_short_scanner"
                              ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-black shadow-xs ring-1 ring-emerald-400"
                              : "bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-500/40 font-bold"
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span>⚡ AI 롱(LONG) &amp; 숏(SHORT) 정밀 분석 관제탑</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("trade_execution_history")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "trade_execution_history"
                              ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black shadow-xs ring-1 ring-indigo-400"
                              : "bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50 border border-indigo-500/40 font-bold"
                          }`}
                        >
                          <History className="w-3.5 h-3.5 text-indigo-400" />
                          <span>📜 롱/숏 체결 이력 (Execution History)</span>
                        </button>
                        <button
                          onClick={handleOpenPredictionTrend}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "ai_predictive_trend"
                              ? "bg-cyan-600 text-white font-black shadow-xs ring-1 ring-cyan-400"
                              : "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 border border-cyan-300 dark:border-cyan-800 font-bold"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          <span>🔮 AI 30일 가격 예측 차트</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("trade_points")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "trade_points"
                              ? "bg-blue-600 text-white font-black shadow-xs ring-1 ring-blue-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                          <span>📊 퀀트 매매 지점 &amp; 수익률</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("asset_growth")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "asset_growth"
                              ? "bg-emerald-600 text-white font-black shadow-xs ring-1 ring-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span>📈 자산 성장곡선 &amp; 누적 ROI</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("news_sentiment")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "news_sentiment"
                              ? "bg-purple-600 text-white font-black shadow-xs ring-1 ring-purple-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          <span>📰 뉴스 Gemini 감성 분석</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("ai_solution")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "ai_solution"
                              ? "bg-emerald-600 text-white font-black shadow-xs ring-1 ring-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          <span>💡 AI 수익 개선 솔루션</span>
                        </button>
                      </>
                    )}

                    {activeCenterCategory === "BOT_SYSTEM" && (
                      <>
                        <button
                          onClick={() => setCenterTab("network")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "network"
                              ? "bg-purple-600 text-white font-black shadow-xs ring-1 ring-purple-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Cpu className="w-3.5 h-3.5" />
                          <span>🧠 AI CORE 12노드 네트워크</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("ai_problem_resolver")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "ai_problem_resolver"
                              ? "bg-rose-600 text-white font-black shadow-xs ring-1 ring-rose-400"
                              : "bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 border border-rose-500/30 font-bold"
                          }`}
                        >
                          <Bug className="w-3.5 h-3.5 text-rose-400" />
                          <span>🚨 AI Problem Resolver (오류 원인 &amp; 패치)</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("bot_status")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "bot_status"
                              ? "bg-indigo-600 text-white font-black shadow-xs ring-1 ring-indigo-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Bot className="w-3.5 h-3.5 text-indigo-400" />
                          <span>🤖 12개 봇 상태 관제</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("bullish_engine")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "bullish_engine"
                              ? "bg-emerald-600 text-white font-black shadow-xs ring-1 ring-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span>🟢 상승 봉 탐지 뇌엔진 V5</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("bearish_engine")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "bearish_engine"
                              ? "bg-red-600 text-white font-black shadow-xs ring-1 ring-red-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                          <span>🔴 하락 봉 탐지 뇌엔진 V5</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("github_pattern_hub")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "github_pattern_hub"
                              ? "bg-purple-600 text-white font-black shadow-xs ring-1 ring-purple-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Code2 className="w-3.5 h-3.5 text-purple-400" />
                          <span>⚡ GitHub 퀀트 패턴 허브</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("risk_governor")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "risk_governor"
                              ? "bg-emerald-600 text-white font-black shadow-xs ring-1 ring-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>🛡️ 1:2 R:R 리스크 가드</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("master_hub")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "master_hub"
                              ? "bg-indigo-600 text-white font-black shadow-xs ring-1 ring-indigo-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>🏛️ 12대 마스터 허브</span>
                        </button>
                      </>
                    )}

                    {activeCenterCategory === "PERFORMANCE" && (
                      <>
                        <button
                          onClick={() => setCenterTab("real_broker_holdings")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "real_broker_holdings"
                              ? "bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400"
                              : "bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 border border-amber-500/40 font-bold"
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>🏛️ 3사 잔고·보유종목·체결 리스트</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("portfolio_asset_classification")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "portfolio_asset_classification"
                              ? "bg-emerald-600 text-white font-black shadow-xs ring-1 ring-emerald-400"
                              : "bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-500/40 font-bold"
                          }`}
                        >
                          <PieChart className="w-3.5 h-3.5 text-emerald-400" />
                          <span>💰 실거래 vs 모의 자산 현황</span>
                        </button>
                        <button
                          onClick={() => setIsHoldingsModalOpen(true)}
                          className="px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-300 dark:border-blue-700 font-bold"
                        >
                          <Wallet className="w-3.5 h-3.5 text-blue-500" />
                          <span>💼 실시간 보유종목 팝업</span>
                        </button>
                        <button
                          onClick={() => setIsApiConnectModalOpen(true)}
                          className="px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-700 font-bold"
                        >
                          <Key className="w-3.5 h-3.5 text-indigo-500" />
                          <span>🔑 증권사·업비트 API 연동</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("performance_analysis")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "performance_analysis"
                              ? "bg-emerald-600 text-white font-black shadow-xs ring-1 ring-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Award className="w-3.5 h-3.5 text-emerald-400" />
                          <span>⚡ 성과 종합 분석</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("ai_daily_report")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "ai_daily_report"
                              ? "bg-emerald-600 text-white font-black shadow-xs ring-1 ring-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>📋 AI 데일리 트레이딩 리포트</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("mock_dashboard")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "mock_dashboard"
                              ? "bg-blue-600 text-white font-black shadow-xs ring-1 ring-blue-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                          <span>🟢 모의투자 전용 대시보드</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("d3_matrix")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "d3_matrix"
                              ? "bg-indigo-600 text-white font-black shadow-xs ring-1 ring-indigo-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>📊 D3.js 성과 매트릭스</span>
                        </button>
                        <button
                          onClick={() => setCenterTab("pnl_chart")}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            centerTab === "pnl_chart"
                              ? "bg-cyan-600 text-white font-black shadow-xs ring-1 ring-cyan-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>📈 AI 누적 수익률 추이</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Center Tab Specialized Views */}
                {centerTab === "mirofish_quant" && (
                  <MirofishQuantLightDashboard />
                )}
                {centerTab === "ai_long_short_scanner" && (
                  <AiLongShortAnalysisScannerSuite />
                )}
                {(centerTab === "trade_execution_history" || centerTab === "trade_history") && (
                  <TradeExecutionHistoryView />
                )}
                {centerTab === "day_night_24h_engine" && (
                  <DayNight24hTradingEngineSuite
                    addToast={(msg, type) =>
                      addToast({
                        type: type === "success" ? "SUCCESS" : type === "error" ? "ERROR" : "INFO",
                        title: "24H AI 자율엔진",
                        message: msg
                      })
                    }
                  />
                )}
                {centerTab === "stock_ai_trading_floor" && (
                  <div className="space-y-4">
                    <StockAiTradingFloorMasterScreen />
                    <AiBotHistoricalSuccessRateChart />
                    <AiBotThresholdActivityLogPanel />
                  </div>
                )}

                {centerTab === "performance_analysis" && (
                  <div className="space-y-4">
                    <AiPerformanceAnalysisDashboard />
                    <AiBotHistoricalSuccessRateChart />
                    <AiBotThresholdActivityLogPanel />
                  </div>
                )}
                {centerTab === "scalper_command_center" && (
                  <ScalperCommandCenterUi />
                )}
                {centerTab === "road_to_billion" && (
                  <div className="space-y-3">
                    <RoadTo100BTrackerOverlay
                      onOpenHoldingsModal={() => setIsHoldingsModalOpen(true)}
                      onOpenCompoundingCalc={() => {
                        setActiveMasterHubKey("multi_bot_securities");
                        setIsPipelineHubModalOpen(true);
                      }}
                      onOpenProblemResolver={() => {
                        setCenterTab("ai_problem_resolver");
                        setActiveCenterCategory("BOT_SYSTEM");
                      }}
                    />
                    <RoadToBillionChallengeDashboard />
                  </div>
                )}
                {centerTab === "ai_problem_resolver" && (
                  <AiProblemResolverPanel />
                )}
                {centerTab === "github_pattern_hub" && (
                  <GithubQuantPatternEngineHub />
                )}
                {centerTab === "ai_solution" && (
                  <AiProfitImprovementSolutionSection />
                )}
                {centerTab === "trade_points" && (
                  <StockTradePointsVisualizerDashboard />
                )}
                {centerTab === "asset_growth" && (
                  <HistoricalAssetGrowthChart onOpenReport={() => setCenterTab("ai_daily_report")} />
                )}
                {centerTab === "ai_daily_report" && (
                  <AiDailyTradingReportPanel onOpenMockDashboard={() => setCenterTab("mock_dashboard")} />
                )}
                {centerTab === "portfolio_asset_classification" && (
                  <PortfolioAssetStatusWidget
                    onOpenHoldingsModal={() => setIsHoldingsModalOpen(true)}
                    onOpenApiConnectModal={() => setIsApiConnectModalOpen(true)}
                    onOpenQuickOrder={(sym, name, side) => {
                      setSelectedStock({ symbol: sym, name: name, price: 0, change: 0, changePercent: 0, volume: "0", market: "KOREA" } as any);
                      setOrderType(side);
                      setIsOrderModalOpen(true);
                    }}
                  />
                )}
                {centerTab === "mock_dashboard" && (
                  <MockInvestmentDashboard />
                )}
                {centerTab === "real_broker_holdings" && (
                  <RealBrokerDetailedBalanceAndHoldings
                    onSelectAssetForChart={(symbol) => handleSelectStockBySymbol(symbol)}
                  />
                )}
                {centerTab === "pnl_chart" && (
                  <AiCumulativePnLPerformanceChart />
                )}
                {centerTab === "news_sentiment" && (
                  <MarketNewsSentiment
                    symbol={selectedStock.symbol}
                    onSelectStock={(sym) => handleSelectStockBySymbol(sym)}
                  />
                )}
                {centerTab === "bullish_engine" && (
                  <BullishPatternsLifecycleEngine />
                )}
                {centerTab === "bearish_engine" && (
                  <BearishPatternsLifecycleEngine />
                )}
                {centerTab === "network" && (
                  <AiCoreNeuralNetwork
                    onSelectBot={handleOpenBotConfig}
                    onOpenCreateBot={() => setIsBotCreatorOpen(true)}
                    activeCategory={botCategoryFilter}
                    onCategoryChange={setBotCategoryFilter}
                    isAutoTradingActive={isAutoTradingActive}
                  />
                )}

                {centerTab === "trade_logs" && (
                  <HomeLiveAutoTradeLogWidget />
                )}

                {centerTab === "master_hub" && (
                  <MasterHubIntegratedGrid
                    onLaunchFeature={(key) => setActiveMasterHubKey(key)}
                  />
                )}

                {centerTab === "d3_matrix" && (
                  <D3BotPerformanceMatrix />
                )}

                {centerTab === "decision_board" && (
                  <AiDecisionBoard onSelectStock={handleSelectStockBySymbol} />
                )}

                {centerTab === "bot_status" && (
                  <BotStatusDashboard />
                )}

                {centerTab === "risk_governor" && (
                  <RiskGovernorPanel
                    currentDailyPnlPct={1.65}
                    cryptoWeightPct={22.4}
                  />
                )}

                {centerTab === "ai_predictive_trend" && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <PredictionChart stock={selectedStock} daysForecast={30} />
                    <AiPricePredictionEngine />
                    <AiPredictiveTrendRechartsWidget
                      stock={selectedStock}
                      onSelectStock={handleSelectStock}
                      onOpenSearchModal={() => setIsSearchModalOpen(true)}
                      onTradeClick={(side) => {
                        setOrderType(side);
                        setIsOrderModalOpen(true);
                      }}
                    />
                  </div>
                )}

                {centerTab !== "road_to_billion" && centerTab !== "ai_predictive_trend" && (
                  <LightCandlestickChart
                    stock={selectedStock}
                    onTradeClick={(side) => {
                      setOrderType(side);
                      setIsOrderModalOpen(true);
                    }}
                  />
                )}
              </div>

              {/* ========================================================================= */}
              {/* COLUMN 3 (RIGHT 3 COLS): Live PnL Widget + AI TOP Stock List + Alerts */}
              {/* ========================================================================= */}
              <div className="col-span-12 lg:col-span-3 space-y-3 min-w-0">
                {/* 1. AI TOP Stock List Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-800 tracking-tight">AI TOP 종목 리스트</span>
                    <button
                      onClick={() => setIsSearchModalOpen(true)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>전체 검색</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Tabs: 실시간 | 관심 | 보유 | 위험 */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold mb-2.5">
                    <button
                      onClick={() => setRightListTab("realtime")}
                      className={`flex-1 py-1 rounded-md transition cursor-pointer ${
                        rightListTab === "realtime" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      실시간
                    </button>
                    <button
                      onClick={() => setRightListTab("watch")}
                      className={`flex-1 py-1 rounded-md transition cursor-pointer ${
                        rightListTab === "watch" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      관심
                    </button>
                    <button
                      onClick={() => setRightListTab("holdings")}
                      className={`flex-1 py-1 rounded-md transition cursor-pointer ${
                        rightListTab === "holdings" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      보유
                    </button>
                    <button
                      onClick={() => setRightListTab("risk")}
                      className={`flex-1 py-1 rounded-md transition cursor-pointer ${
                        rightListTab === "risk" ? "bg-white text-rose-600 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      위험
                    </button>
                  </div>

                  {/* Mobile Swipe Gesture Banner */}
                  <div className="mb-2 p-1.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-[10px] text-blue-700 dark:text-blue-300 font-bold flex items-center justify-between">
                    <span>👈 좌우 스와이프 제스처 폰 기능</span>
                    <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-mono">우:매수 | 좌:매도</span>
                  </div>

                  {/* Stock Items List with Swipe Gestures */}
                  <div className="space-y-1 max-h-[300px] overflow-y-auto pr-0.5">
                    {filteredRightList.slice(0, 8).map((stk, idx) => {
                      const isSelected = selectedStock.symbol === stk.symbol;
                      return (
                        <SwipeableStockListItem
                          key={stk.symbol}
                          stock={stk}
                          rankIndex={idx + 1}
                          isSelected={isSelected}
                          onSelect={handleSelectStock}
                          onSwipeBuy={(stk) => {
                            handleSelectStock(stk);
                            setOrderType("BUY");
                            setIsOrderModalOpen(true);
                          }}
                          onSwipeSell={(stk) => {
                            handleSelectStock(stk);
                            setOrderType("SELL");
                            setIsOrderModalOpen(true);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* 3. Real-time AI Alerts Stream */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-800 tracking-tight">실시간 AI 알림</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>

                  <div className="space-y-2 max-h-[170px] overflow-y-auto">
                    {liveAlerts.map((a, idx) => (
                      <div
                        key={`${a.id}_${idx}`}
                        onClick={() => handleSelectStockBySymbol(a.symbol)}
                        className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="font-black text-blue-600">{a.name}</span>
                          <span className="text-slate-400">{a.time}</span>
                        </div>
                        <div className="text-slate-700 font-medium text-[11px] leading-tight">{a.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 4 BENTO GRID BOTTOM CARDS */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
              {/* Card 1: 리스크 상태 점검 */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">리스크 상태 점검</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                    안전 (LOW)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 py-1 text-center font-mono text-xs border-b border-slate-100 dark:border-slate-800 mb-2">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg">
                    <div className="text-[9px] text-slate-400 font-sans">변동성(ATR)</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">2.15%</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg">
                    <div className="text-[9px] text-slate-400 font-sans">VWAP 괴리율</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">+1.2%</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg">
                    <div className="text-[9px] text-slate-400 font-sans">저항선 거리</div>
                    <div className="font-bold text-blue-600 dark:text-blue-400">+3.8%</div>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] font-sans">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>고점 추격 위험</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">낮음 (12%)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>유동성 부족 위험</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">낮음 (8%)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>상승 추세 소진율</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">보통 (35%)</span>
                  </div>
                </div>
              </div>

              {/* Card 2: 봇 컨센서스 */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">봇 컨센서스 (의견 합의)</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">총 12개 봇</span>
                </div>

                <div className="space-y-2 py-1 text-xs">
                  <div>
                    <div className="flex justify-between font-sans mb-1 text-[11px]">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">매수 지지 (BULLISH)</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">8개 (67%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: "67%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-sans mb-1 text-[11px]">
                      <span className="font-bold text-amber-700 dark:text-amber-300">중립 관망 (NEUTRAL)</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">3개 (25%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: "25%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-sans mb-1 text-[11px]">
                      <span className="font-bold text-rose-700 dark:text-rose-300">하락 경고 (BEARISH)</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">1개 (8%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: "8%" }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: 전략별 실전 성과 */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">전략별 실전 성과</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">실전 승률</span>
                </div>

                <div className="space-y-1.5 text-[11px] font-sans">
                  {[
                    { name: "돌파 및 지지 확인", win: "78.2%", pf: "2.15" },
                    { name: "불플래그(깃발형) 돌파", win: "74.5%", pf: "1.98" },
                    { name: "기관 VWAP 평단 회복", win: "71.0%", pf: "1.82" },
                    { name: "유동성 흡수 반등", win: "68.4%", pf: "1.76" }
                  ].map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between py-0.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{s.name}</span>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{s.win}</span>
                        <span className="text-slate-400 dark:text-slate-500 text-[10px]">PF {s.pf}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: AI 점수 분포도 */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">AI 점수 분포도</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">전체 24종목</span>
                </div>

                <div className="space-y-1.5 text-[11px] font-sans">
                  {[
                    { grade: "S급 (90-100점)", count: 7, pct: "29%", color: "bg-emerald-500" },
                    { grade: "A+급 (85-89점)", count: 9, pct: "37%", color: "bg-sky-500" },
                    { grade: "A급 (80-84점)", count: 5, pct: "21%", color: "bg-blue-500" },
                    { grade: "B급 (70-79점)", count: 2, pct: "9%", color: "bg-amber-500" },
                    { grade: "C급 (0-69점)", count: 1, pct: "4%", color: "bg-slate-400" }
                  ].map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-24 text-[10px] text-slate-600 dark:text-slate-400 font-medium">{g.grade}</span>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className={`${g.color} h-full rounded-full`} style={{ width: g.pct }}></div>
                      </div>
                      <span className="w-6 text-right font-mono font-bold text-slate-700 dark:text-slate-300 text-[10px]">{g.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* FLOATING RIGHT QUICK ACTION DOCK */}
      <div 
        id="floating-right-quick-dock"
        className="fixed right-3.5 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 transition-all hover:border-blue-400"
      >
        <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter px-1 py-0.5 border-b border-slate-100 dark:border-slate-800 mb-0.5">
          빠른실행
        </div>

        {/* 1. Quick Buy/Sell Order */}
        <button
          id="dock-quick-order-btn"
          onClick={() => {
            setOrderType("BUY");
            setIsOrderModalOpen(true);
          }}
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white flex flex-col items-center justify-center transition shadow-xs hover:scale-105 cursor-pointer group"
          title="⚡ 즉시 퀵 매수/매도 주문"
        >
          <Zap className="w-4 h-4 fill-white" />
          <span className="text-[8px] font-black leading-none mt-0.5">주문</span>
        </button>

        {/* 2. Broker API Connect */}
        <button
          id="dock-api-connect-btn"
          onClick={() => setIsApiConnectModalOpen(true)}
          className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 flex flex-col items-center justify-center transition hover:scale-105 cursor-pointer"
          title="🔑 실계좌 증권사/업비트 API 연동"
        >
          <Key className="w-4 h-4" />
          <span className="text-[8px] font-bold leading-none mt-0.5">API</span>
        </button>

        {/* 3. Real Live Mode Badge */}
        <button
          id="dock-live-mode-toggle"
          onClick={() => {
            alert("🔥 현재 100% 실계좌 LIVE TRADING 모드가 상시 가동 중입니다.");
          }}
          className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300 flex flex-col items-center justify-center transition hover:scale-105 cursor-pointer"
          title="🔥 100% 실계좌 LIVE TRADING 가동 중"
        >
          <ShieldAlert className="w-4 h-4" />
          <span className="text-[8px] font-black leading-none mt-0.5">실계좌</span>
        </button>

        {/* 4. 12 Master Consoles Hub */}
        <button
          id="dock-master-hub-btn"
          onClick={() => setActiveMasterHubKey("keyword_scanner")}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-900 text-white flex flex-col items-center justify-center transition hover:scale-105 cursor-pointer"
          title="🤖 12대 AI 마스터 콘솔"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-[8px] font-bold leading-none mt-0.5">12콘솔</span>
        </button>

        {/* 5. Multi-Model Consensus */}
        <button
          id="dock-consensus-btn"
          onClick={() => {
            if (onOpenConsensusModal) {
              onOpenConsensusModal(selectedStock.symbol);
            } else {
              setActiveMasterHubKey("securities_consensus");
            }
          }}
          className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center transition hover:scale-105 cursor-pointer"
          title="📊 8대 증권사 멀티모델 AI 합의"
        >
          <Brain className="w-4 h-4" />
          <span className="text-[8px] font-bold leading-none mt-0.5">합의</span>
        </button>

        {/* 6. Holdings Modal */}
        <button
          id="dock-holdings-btn"
          onClick={() => setIsHoldingsModalOpen(true)}
          className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex flex-col items-center justify-center transition hover:scale-105 cursor-pointer"
          title="💼 실시간 보유종목 & 손익"
        >
          <PieChart className="w-4 h-4" />
          <span className="text-[8px] font-bold leading-none mt-0.5">보유</span>
        </button>

        {/* 7. Threshold Alert */}
        <button
          id="dock-threshold-alert-btn"
          onClick={() => setIsThresholdModalOpen(true)}
          className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex flex-col items-center justify-center transition hover:scale-105 cursor-pointer"
          title="🔔 임계값 알림 설정"
        >
          <Bell className="w-4 h-4" />
          <span className="text-[8px] font-bold leading-none mt-0.5">알림</span>
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center font-mono">
              {alertCount}
            </span>
          )}
        </button>
      </div>

      {/* MODALS */}
      {/* 1. Stock Search & Custom Stock Register Modal */}
      <StockSearchAndAddModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectStock={(stock) => {
          setSelectedStock(stock);
          setStocksList(getAllStocks());
        }}
        onAddToWatchlist={handleAddToWatchlist}
      />

      {/* 2. Bot Creator Modal */}
      <BotCreatorModal
        isOpen={isBotCreatorOpen}
        onClose={() => setIsBotCreatorOpen(false)}
        onBotCreated={(newBot) => {
          alert(`[${newBot.name}] 봇이 생성되었습니다.`);
        }}
      />

      {/* 3. Bot Config Modal (Edit parameters, state Active/Paused/Buying/Selling, Risk Tolerance) */}
      <BotConfigModal
        isOpen={isBotConfigModalOpen}
        onClose={() => setIsBotConfigModalOpen(false)}
        bot={selectedConfigBot}
        onUpdateBot={(updated) => {
          setSelectedConfigBot(updated);
        }}
      />

      {/* 4. Portfolio & Holdings Profit Dashboard Modal */}
      <PortfolioHoldingsModal
        isOpen={isHoldingsModalOpen}
        onClose={() => setIsHoldingsModalOpen(false)}
        onSelectStock={handleSelectStockBySymbol}
        isRealTradingMode={isRealTradingMode}
        onOpenApiConnectModal={() => setIsApiConnectModalOpen(true)}
      />

      {/* 5. Quick Order Modal */}
      <QuickOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        stockCode={selectedStock.symbol}
        stockName={selectedStock.name}
        currentPrice={selectedStock.price}
        orderType={orderType}
        isRealTradingMode={isRealTradingMode}
      />

      {/* 6. Master Feature Hub Modal for all 12 user modules */}
      <MasterFeatureModalHub
        activeKey={activeMasterHubKey}
        onClose={() => setActiveMasterHubKey(null)}
      />

      {/* 7. User-Defined Threshold Notification System Modal */}
      <ThresholdSettingsModal
        isOpen={isThresholdModalOpen}
        onClose={() => {
          setIsThresholdModalOpen(false);
          setAlertCount(thresholdAlertEngine.getHistory().length);
        }}
      />

      {/* 8. Broker & Exchange API Connection Modal (한국투자증권 KIS Open API) */}
      <BrokerApiConnectModal
        isOpen={isApiConnectModalOpen}
        onClose={() => setIsApiConnectModalOpen(false)}
      />

      {/* 9. Master System & 13 Sub-Engines Pipeline Controller Hub Modal */}
      <MasterSystemPipelineHubModal
        isOpen={isPipelineHubModalOpen}
        onClose={() => setIsPipelineHubModalOpen(false)}
        onOpenMasterFeature={(key) => setActiveMasterHubKey(key as any)}
        onOpenApiConnectModal={() => setIsApiConnectModalOpen(true)}
      />

      {/* 10. PWA App Download & Install Modal */}
      <PwaInstallModal
        isOpen={isPwaInstallModalOpen}
        onClose={() => setIsPwaInstallModalOpen(false)}
      />

      {/* 11. AI Prediction Chart & Deep Learning Simulator Modal */}
      {isPredictionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col text-slate-100">
            {/* Modal Header */}
            <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-cyan-500/30 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-xs sm:text-base font-black text-cyan-300 tracking-tight truncate">
                      🔮 AI 30일 미래 가격 예측
                    </h2>
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-mono font-bold shrink-0">
                      LIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs mt-0.5 flex-wrap">
                    <span className="text-slate-400 font-bold hidden sm:inline">선택:</span>
                    <span className="font-extrabold text-amber-300 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/30 font-mono text-[11px]">
                      {selectedStock.name} ({selectedStock.symbol})
                    </span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {selectedStock.price ? selectedStock.price.toLocaleString() + "원" : ""}
                    </span>
                    {selectedStock.changeRate !== undefined && (
                      <span className={`text-[10px] sm:text-[11px] font-bold ${selectedStock.changeRate >= 0 ? "text-rose-400" : "text-blue-400"}`}>
                        {selectedStock.changeRate >= 0 ? "+" : ""}{selectedStock.changeRate}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="px-2.5 sm:px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm border border-cyan-300/40 whitespace-nowrap min-h-[36px]"
                >
                  <Search className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">🔍 전체 종목 검색</span>
                  <span className="sm:hidden">검색</span>
                </button>
                <button
                  onClick={() => setIsPredictionModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Stock Selector & Inline Search Bar */}
            <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              {/* Popular Stock Quick Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                  <span>⚡ 인기 종목:</span>
                </span>
                {[
                  { symbol: "005930", name: "삼성전자" },
                  { symbol: "000660", name: "SK하이닉스" },
                  { symbol: "035420", name: "NAVER" },
                  { symbol: "035720", name: "카카오" },
                  { symbol: "005380", name: "현대차" },
                  { symbol: "BTC", name: "비트코인" },
                  { symbol: "NVDA", name: "엔비디아" },
                  { symbol: "TSLA", name: "테슬라" },
                  { symbol: "AAPL", name: "Apple" }
                ].map((item) => {
                  const isSelected = selectedStock.symbol === item.symbol;
                  return (
                    <button
                      key={item.symbol}
                      onClick={() => {
                        const target = stocksList.find(s => s.symbol === item.symbol) || {
                          symbol: item.symbol,
                          name: item.name,
                          market: item.symbol === "BTC" ? "UPBIT" : item.symbol.length === 6 ? "KOSPI" : "US",
                          category: "LARGE",
                          categoryLabel: "대형주",
                          price: item.symbol === "005930" ? 78500 : item.symbol === "000660" ? 186000 : 100000,
                          changeRate: 1.5,
                          changeAmount: 1000,
                          tradeValue: "1,000억",
                          volume: "100만",
                          rvol: 1.2,
                          score: 85,
                          grade: "A+",
                          theme: "인기 종목",
                          signal: "LONG",
                          strategy: "AI Forecast",
                          marketCap: "100조"
                        };
                        setSelectedStock(target as StockItem);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 border ${
                        isSelected
                          ? "bg-cyan-500 text-slate-950 border-cyan-300 font-extrabold shadow-sm"
                          : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60"
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>

              {/* Inline Search Bar */}
              <div className="relative min-w-[220px] flex-1 max-w-xs">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={predictionSearchQuery}
                    onChange={(e) => setPredictionSearchQuery(e.target.value)}
                    placeholder="종목명/티커 바로 검색..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-7 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                  />
                  {predictionSearchQuery && (
                    <button
                      onClick={() => setPredictionSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {filteredModalStocks.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-cyan-500/50 rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                    {filteredModalStocks.map((st) => (
                      <button
                        key={st.symbol}
                        onClick={() => {
                          setSelectedStock(st);
                          setPredictionSearchQuery("");
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-800 transition border-b border-slate-800/60 last:border-0 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{st.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{st.symbol}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700">
                            {st.market}
                          </span>
                        </div>
                        <span className="text-amber-300 font-mono font-bold">
                          {st.price ? st.price.toLocaleString() + "원" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              <PredictionChart stock={selectedStock} daysForecast={30} />
              <AiPricePredictionEngine />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-400">
                💡 AI 시뮬레이션 결과는 딥러닝 모멘텀 및 수급 데이터를 기반으로 작성되었습니다.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsPredictionModalOpen(false);
                    setIsOrderModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>⚡ {selectedStock.name} 빠른 주문</span>
                </button>
                <button
                  onClick={() => setIsPredictionModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12. Price Target Alert Settings Modal */}
      <PriceTargetAlertModal
        isOpen={isPriceTargetModalOpen}
        onClose={() => setIsPriceTargetModalOpen(false)}
        defaultSymbol={selectedStock.symbol}
        defaultStockName={selectedStock.name}
        defaultPrice={selectedStock.price}
      />

      {/* 13. AI Decision Logs Sidebar */}
      <AiDecisionLogsSidebar />

      {/* 14. Yield Improvement Guide Modal */}
      <YieldImprovementGuideModal
        isOpen={isYieldGuideOpen}
        onClose={() => setIsYieldGuideOpen(false)}
      />

      {/* 15. Bot Auto-Tuning Panel Modal */}
      <BotAutoTuningPanel
        isOpen={isBotAutoTuningOpen}
        onClose={() => setIsBotAutoTuningOpen(false)}
      />

      {/* 16. Profitability Health Check Modal */}
      <ProfitabilityHealthCheckModal
        isOpen={isHealthCheckOpen}
        onClose={() => setIsHealthCheckOpen(false)}
      />

      {/* 17. AI Smart Safety & Risk Governance Modal */}
      <SmartSafetyGovernanceModal
        isOpen={isGovernanceModalOpen}
        onClose={() => setIsGovernanceModalOpen(false)}
      />

      {/* 18. Realtime Trading Issue Logger & AI Diagnostic Solution Modal */}
      <RealtimeTradingIssueLoggerModal
        isOpen={isIssueLoggerModalOpen}
        onClose={() => setIsIssueLoggerModalOpen(false)}
      />

      {/* 19. AI Realtime High-Confidence Long/Short Signal Push Notification Overlay */}
      <AiSignalPushNotificationOverlay />
    </div>
  );
};
