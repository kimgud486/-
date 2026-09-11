import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  LineStyle,
  createSeriesMarkers,
  IChartApi,
  ISeriesApi,
  Time
} from "lightweight-charts";
import {
  Sparkles,
  Activity,
  ShieldCheck,
  Maximize2
} from "lucide-react";
import { runPredictionPipeline } from "../../prediction";
import { globalOnlineEnsembleWeightEngine } from "../../prediction/OnlineEnsembleWeightEngine";
import type { LiveTick, LiveCandle, IndicatorSnapshot, TradingState, ForecastPoint } from "../../realtime/types";
import { CandleAggregator } from "../../realtime/CandleAggregator";
import { IndicatorEngine } from "../../realtime/IndicatorEngine";
import { BollingerSqueezeEngine } from "../../realtime/BollingerSqueezeEngine";
import { LiveVolumeProfileAccumulator, VolumeProfileEngine, type VolumeProfileSnapshot } from "../../realtime/VolumeProfileEngine";
import { MarketStructureEngine } from "../../realtime/MarketStructureEngine";
import { decideTradingState } from "../../realtime/TradingStateMachine";
import { AdaptiveTrailingExitEngineV137 } from "../../services/v13_7/AdaptiveTrailingExitEngineV137";
import { ExitDecisionBridgeV138 } from "../../services/v13_8/ExitDecisionBridgeV138";
import { PositionTrailingStateStoreV138 } from "../../services/v13_8/PositionTrailingStateStoreV138";
import { generateForecastPath } from "../../realtime/ForecastPathEngine";
import { realTimeMarketFeedManager } from "../../realtime/RealTimeMarketFeedService";

type ChartTimeframe = "1m" | "3m" | "5m" | "15m" | "1D";

interface InitialCandle {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RealTimeTradingViewChartProps {
  symbol: string;
  name: string;
  market?: "KOREA" | "US" | "UPBIT" | "CRYPTO";
  initialPrice: number;
  initialCandles?: InitialCandle[];
  isWhiteTheme?: boolean;
  timeframe?: ChartTimeframe;
  onStateChange?: (state: TradingState, confidence: number) => void;
  className?: string;
}

const timeframeToMs = (tf: string) => {
  if (tf === "1m") return 60_000;
  if (tf === "3m") return 180_000;
  if (tf === "5m") return 300_000;
  if (tf === "15m") return 900_000;
  return 86_400_000;
};

const mergeFormingCandle = (history: LiveCandle[], candle: LiveCandle, maxBars = 600): LiveCandle[] => {
  const previous = history[history.length - 1];
  const next = previous && previous.time === candle.time
    ? [...history.slice(0, -1), candle]
    : [...history, candle];
  return next.slice(-maxBars);
};

export const RealTimeTradingViewChart: React.FC<RealTimeTradingViewChartProps> = ({
  symbol,
  name,
  market = "KOREA",
  initialPrice,
  initialCandles = [],
  isWhiteTheme = false,
  timeframe = "1m",
  onStateChange,
  className = ""
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bollingerUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bollingerMiddleSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bollingerLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeProfilePocSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeProfileVahSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeProfileValSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const forecastSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bullForecastSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bearForecastSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const trailingExitSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSignalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const atrSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const markersRef = useRef<any>(null);

  const [selectedTf, setSelectedTf] = useState<ChartTimeframe>(timeframe);
  const [tradingState, setTradingState] = useState<TradingState>("NO_TRADE");
  const [currentPrice, setCurrentPrice] = useState<number>(initialPrice);
  const [trailingExitPrice, setTrailingExitPrice] = useState<number>(0);
  const [aiConfidence, setAiConfidence] = useState<number>(0);
  const [lastForecast, setLastForecast] = useState<ForecastPoint[]>([]);
  const [indicatorSnapshot, setIndicatorSnapshot] = useState<IndicatorSnapshot | null>(null);
  const [bollingerSnapshot, setBollingerSnapshot] = useState<ReturnType<typeof BollingerSqueezeEngine.analyze> | null>(null);
  const [volumeProfileSnapshot, setVolumeProfileSnapshot] = useState<VolumeProfileSnapshot | null>(null);
  const [lastTickTimeStr, setLastTickTimeStr] = useState<string>("");
  const [localSeedCandles, setLocalSeedCandles] = useState<InitialCandle[] | null>(null);
  const [isTimeframeLoading, setIsTimeframeLoading] = useState<boolean>(false);
  const [hasRealChartData, setHasRealChartData] = useState<boolean>(initialCandles.length > 0);
  const [activeIndicators, setActiveIndicators] = useState({
    ema: true,
    vwap: true,
    bollinger: true,
    volumeProfile: true,
    forecast: true,
    trailing: true,
    volume: true,
    rsi: true,
    macd: true,
    atr: true
  });

  const historyRef = useRef<LiveCandle[]>([]);
  const aggregatorRef = useRef<CandleAggregator>(
    new CandleAggregator((timeframe as any) || "1m")
  );
  const entryPriceRef = useRef<number>(initialPrice);
  const highestPriceRef = useRef<number>(initialPrice);
  const previousTrailingFloorRef = useRef<number>(0);
  const trailingExitRef = useRef<number>(0);
  const tradingStateRef = useRef<TradingState>("NO_TRADE");
  const selectedTfRef = useRef<ChartTimeframe>(timeframe);
  const timeframeRequestRef = useRef<number>(0);
  const lastIndicatorPreviewAtRef = useRef<number>(0);
  const volumeProfileAccumulatorRef = useRef(new LiveVolumeProfileAccumulator());

  useEffect(() => {
    setSelectedTf(timeframe);
    selectedTfRef.current = timeframe;
    setLocalSeedCandles(null);
    setIsTimeframeLoading(false);
    setHasRealChartData(initialCandles.length > 0);
    historyRef.current = [];
    aggregatorRef.current.reset(timeframeToMs(timeframe));
  }, [timeframe, symbol]);

  useEffect(() => {
    volumeProfileAccumulatorRef.current.reset();
    setVolumeProfileSnapshot(null);
  }, [symbol]);

  useEffect(() => {
    let active = true;

    PositionTrailingStateStoreV138.getState(symbol).then((persisted) => {
      if (active && persisted && persisted.highestPriceSinceBuy > 0) {
        entryPriceRef.current = persisted.entryPrice;
        highestPriceRef.current = persisted.highestPriceSinceBuy;
        previousTrailingFloorRef.current = persisted.trailingFloor;
        trailingExitRef.current = persisted.trailingFloor;
        setTrailingExitPrice(persisted.trailingFloor);

        if (persisted.lastState && persisted.lastState !== "HOLD") {
          const mapped = persisted.lastState as TradingState;
          tradingStateRef.current = mapped;
          setTradingState(mapped);
        }
      }
    });

    return () => {
      active = false;
    };
  }, [symbol]);

  useEffect(() => {
    if (Number.isFinite(initialPrice) && initialPrice > 0) {
      setCurrentPrice(initialPrice);
    }
  }, [initialPrice, symbol]);

  const formatDisplayPrice = useCallback((p: number) => {
    if (market === "US") {
      return `$${(p ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }

    if (market === "UPBIT" || market === "CRYPTO") {
      if (Math.abs(p) < 1) return `₩${Number(p ?? 0).toFixed(6)}`;
      if (Math.abs(p) < 100) return `₩${Number(p ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }

    return `₩${Math.round(p ?? 0).toLocaleString()}`;
  }, [market]);

  const handleTimeframeChange = async (tf: ChartTimeframe) => {
    if (tf === selectedTfRef.current || isTimeframeLoading) return;

    const previousTf = selectedTfRef.current;
    const requestId = timeframeRequestRef.current + 1;
    timeframeRequestRef.current = requestId;

    setSelectedTf(tf);
    selectedTfRef.current = tf;
    setIsTimeframeLoading(true);
    aggregatorRef.current.reset(timeframeToMs(tf));

    try {
      const apiTf = tf === "1D" ? "D" : tf;
      const response = await fetch(
        `/api/market/realtime-candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(apiTf)}&count=240`
      );

      if (!response.ok) {
        throw new Error(`TIMEFRAME_FETCH_${response.status}`);
      }

      const payload = await response.json();
      if (requestId !== timeframeRequestRef.current) return;

      if (Array.isArray(payload?.candles) && payload.candles.length > 0) {
        setLocalSeedCandles(payload.candles);
        setHasRealChartData(true);

        if (Number.isFinite(payload.currentPrice) && payload.currentPrice > 0) {
          setCurrentPrice(payload.currentPrice);
        }
      } else {
        throw new Error("TIMEFRAME_FETCH_EMPTY");
      }
    } catch (error) {
      console.warn("Failed to switch chart timeframe:", error);
      selectedTfRef.current = previousTf;
      setSelectedTf(previousTf);
      aggregatorRef.current.reset(timeframeToMs(previousTf));
    } finally {
      if (requestId === timeframeRequestRef.current) {
        setIsTimeframeLoading(false);
      }
    }
  };

  const effectiveInitialCandles = localSeedCandles ?? initialCandles;
  const initialCandleSignature = effectiveInitialCandles.length > 0
    ? (() => {
        const first = effectiveInitialCandles[0];
        const last = effectiveInitialCandles[effectiveInitialCandles.length - 1];
        return [
          effectiveInitialCandles.length,
          first?.time,
          first?.open,
          last?.time,
          last?.close,
          last?.volume
        ].join(":");
      })()
    : "EMPTY";

  const normalizedInitialCandles: LiveCandle[] = useMemo(() => {
    if (!effectiveInitialCandles || effectiveInitialCandles.length === 0) return [];

    return effectiveInitialCandles
      .map(c => {
        let sec =
          typeof c.time === "number"
            ? c.time
            : Math.floor(new Date(c.time).getTime() / 1000);

        if (sec > 10_000_000_000) sec = Math.floor(sec / 1000);

        return {
          time: sec,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          isClosed: true
        } as LiveCandle;
      })
      .filter(c =>
        Number.isFinite(c.time) &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close) &&
        Number.isFinite(c.volume)
      )
      .sort((a, b) => a.time - b.time);
  }, [initialCandleSignature]);

  const onClosedCandle = useCallback((closedCandle: LiveCandle) => {
    const tf = selectedTfRef.current;
    const candles = mergeFormingCandle(
      historyRef.current,
      { ...closedCandle, isClosed: true },
      600
    );
    historyRef.current = candles;

    const indicators: IndicatorSnapshot = IndicatorEngine.calculate(candles);
    setIndicatorSnapshot(indicators);
    const bollinger = BollingerSqueezeEngine.analyze(candles);
    setBollingerSnapshot(bollinger);
    const structure = MarketStructureEngine.analyze(candles, indicators.vwap);

    let modelProb: number | undefined;
    let modelVerified = false;

    if (candles.length >= 30) {
      try {
        const verifiedCandles = candles.map(c => {
          const src = (c as any).source || "KIS_REALTIME_WS";
          const feedQual =
            (c as any).feedQuality ||
            (src === "KIS_REALTIME_WS" ? "BROKER_REALTIME" : "POLLING_DELAYED");
          const isVer =
            (c as any).verified ??
            (src === "KIS_REALTIME_WS" && feedQual === "BROKER_REALTIME");

          return {
            symbol,
            market:
              market === "US"
                ? "US"
                : market === "UPBIT" || market === "CRYPTO"
                  ? "CRYPTO"
                  : "KOREA",
            timeframe: tf === "1D" ? "60m" : tf,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
            startedAt:
              typeof c.time === "number"
                ? c.time * 1000
                : new Date(c.time).getTime(),
            endedAt:
              (typeof c.time === "number"
                ? c.time * 1000
                : new Date(c.time).getTime()) +
              timeframeToMs(tf),
            source: src,
            receivedAt: (c as any).receivedAt || Date.now(),
            verified: isVer,
            feedQuality: feedQual,
            integrityValid: isVer
          };
        });

        const mlResult = runPredictionPipeline({
          symbol,
          market:
            market === "US"
              ? "US"
              : market === "UPBIT" || market === "CRYPTO"
                ? "CRYPTO"
                : "KOREA",
          candles: verifiedCandles,
          requireRealData: true
        });

        const calibrated = mlResult.calibratedOutput;

        if (
          calibrated &&
          typeof calibrated.calibratedProbability === "number" &&
          mlResult.rawModelOutput?.probabilityVerified
        ) {
          const lgbProb = calibrated.calibratedProbability / 100;
          modelProb = globalOnlineEnsembleWeightEngine.score(
            {
              LIGHTGBM: lgbProb,
              TREND: indicators.trendStrength,
              MOMENTUM: Math.min(
                1,
                Math.max(0, 0.5 + indicators.macdHistogram / 100)
              ),
              STRUCTURE: structure.hhhlValid ? 0.8 : 0.4,
              VOLUME: structure.volumeExpansion ? 0.85 : 0.5
            },
            market,
            tf
          );
          modelVerified = true;
        }
      } catch {
      }
    }

    const confidenceScore = Math.round(
      (
        indicators.trendStrength * 0.4 +
        (indicators.macdHistogram > 0 ? 0.3 : 0.1) +
        (structure.hhhlValid ? 0.3 : 0)
      ) * 100
    );
    setAiConfidence(confidenceScore);

    const executionFeedValid =
      (closedCandle as any).source === "KIS_REALTIME_WS" &&
      (closedCandle as any).feedQuality === "BROKER_REALTIME";
    const feedQuality = executionFeedValid
      ? "BROKER_REALTIME"
      : "POLLING_DELAYED";

    const nextState = decideTradingState({
      price: closedCandle.close,
      ema9: indicators.ema9,
      ema20: indicators.ema20,
      vwap: indicators.vwap,
      rsi: indicators.rsi14,
      macdHistogram: indicators.macdHistogram,
      hhhlValid: structure.hhhlValid,
      breakoutValid: structure.breakoutValid,
      volumeExpansion: structure.volumeExpansion,
      modelProbability:
        modelVerified && modelProb !== undefined ? modelProb : 0,
      currentState: tradingStateRef.current,
      trailingExitPrice: trailingExitRef.current,
      indicatorsReady: indicators.indicatorsReady === true,
      feedQuality,
      isClosedBar: closedCandle.isClosed === true,
      netEdgePositive: true
    });

    if (nextState !== tradingStateRef.current) {
      if (nextState === "BUY") {
        entryPriceRef.current = closedCandle.close;
        highestPriceRef.current = closedCandle.close;
        previousTrailingFloorRef.current = Math.round(
          closedCandle.close - 1.5 * indicators.atr14
        );
        trailingExitRef.current = previousTrailingFloorRef.current;
      } else if (nextState === "NO_TRADE") {
        entryPriceRef.current = 0;
        highestPriceRef.current = 0;
        previousTrailingFloorRef.current = 0;
        trailingExitRef.current = 0;
      }

      tradingStateRef.current = nextState;
      setTradingState(nextState);
      onStateChange?.(nextState, confidenceScore);
    }

    if (
      ["BUY", "HOLD", "PROFIT_HOLD", "SELL_WATCH"].includes(
        tradingStateRef.current
      ) &&
      entryPriceRef.current > 0
    ) {
      highestPriceRef.current = Math.max(
        highestPriceRef.current,
        closedCandle.close
      );

      const res = AdaptiveTrailingExitEngineV137.evaluate({
        symbol,
        market: market === "US" ? "US" : "KOREA",
        entryPrice: entryPriceRef.current,
        currentPrice: closedCandle.close,
        highestPriceSinceBuy: highestPriceRef.current,
        previousTrailingFloor: previousTrailingFloorRef.current,
        atr14: indicators.atr14,
        sessionVwap: indicators.vwap,
        ema20: indicators.ema20,
        recentSwingLow: structure.lastConfirmedSwingLow,
        confirmedSupport: structure.confirmedSupport,
        structure: structure.structure,
        rsi14: indicators.rsi14,
        macdHist: indicators.macdHistogram
      });

      previousTrailingFloorRef.current = res.trailingFloor;
      trailingExitRef.current = res.trailingFloor;
      setTrailingExitPrice(res.trailingFloor);

      const activeQty = entryPriceRef.current > 0 ? 1 : 0;
      const bridge = ExitDecisionBridgeV138.resolve({
        adaptive: res,
        feedVerified: executionFeedValid,
        indicatorsReady: indicators.indicatorsReady === true,
        completedBar: closedCandle.isClosed === true,
        currentPositionQty: activeQty,
        brokerHealthy: executionFeedValid,
        heartbeatHealthy: true
      });

      if (bridge.action === "SELL" || bridge.action === "EMERGENCY_EXIT") {
        tradingStateRef.current = "SELL";
        setTradingState("SELL");
        onStateChange?.("SELL", confidenceScore);
      } else if (bridge.action === "SELL_WATCH") {
        tradingStateRef.current = "SELL_WATCH";
        setTradingState("SELL_WATCH");
        onStateChange?.("SELL_WATCH", confidenceScore);
      } else if (bridge.action === "PROFIT_HOLD") {
        tradingStateRef.current = "PROFIT_HOLD";
        setTradingState("PROFIT_HOLD");
        onStateChange?.("PROFIT_HOLD", confidenceScore);
      }

      PositionTrailingStateStoreV138.saveState({
        positionId: `${symbol}_active`,
        symbol,
        market: market === "US" ? "US" : "KOREA",
        entryPrice: entryPriceRef.current,
        qty: activeQty,
        highestPriceSinceBuy: highestPriceRef.current,
        trailingFloor: res.trailingFloor,
        lastState: bridge.action,
        updatedAt: Date.now()
      });

      if (trailingExitSeriesRef.current) {
        trailingExitSeriesRef.current.update({
          time: closedCandle.time as Time,
          value: res.trailingFloor
        });
      }
    }

    const forecast = generateForecastPath(
      candles,
      indicators,
      8,
      modelVerified ? modelProb : undefined
    );
    setLastForecast(forecast);

    if (
      forecastSeriesRef.current &&
      bullForecastSeriesRef.current &&
      bearForecastSeriesRef.current
    ) {
      forecastSeriesRef.current.setData(
        forecast
          .map(p => ({ time: p.time as Time, value: p.predicted }))
          .filter(
            (p): p is { time: Time; value: number } =>
              Number.isFinite(p.value) && p.value > 0
          )
      );
      bullForecastSeriesRef.current.setData(
        forecast
          .map(p => ({ time: p.time as Time, value: p.upper }))
          .filter(
            (p): p is { time: Time; value: number } =>
              Number.isFinite(p.value) && p.value > 0
          )
      );
      bearForecastSeriesRef.current.setData(
        forecast
          .map(p => ({ time: p.time as Time, value: p.lower }))
          .filter(
            (p): p is { time: Time; value: number } =>
              Number.isFinite(p.value) && p.value > 0
          )
      );
    }

    const time = closedCandle.time as Time;

    if (
      ema9SeriesRef.current &&
      Number.isFinite(indicators.ema9) &&
      indicators.ema9 > 0
    ) {
      ema9SeriesRef.current.update({ time, value: indicators.ema9 });
    }
    if (
      ema20SeriesRef.current &&
      Number.isFinite(indicators.ema20) &&
      indicators.ema20 > 0
    ) {
      ema20SeriesRef.current.update({ time, value: indicators.ema20 });
    }
    if (
      vwapSeriesRef.current &&
      Number.isFinite(indicators.vwap) &&
      indicators.vwap > 0
    ) {
      vwapSeriesRef.current.update({ time, value: indicators.vwap });
    }
    if (bollingerUpperSeriesRef.current && Number.isFinite(bollinger.upper)) {
      bollingerUpperSeriesRef.current.update({ time, value: bollinger.upper });
    }
    if (bollingerMiddleSeriesRef.current && Number.isFinite(bollinger.middle)) {
      bollingerMiddleSeriesRef.current.update({ time, value: bollinger.middle });
    }
    if (bollingerLowerSeriesRef.current && Number.isFinite(bollinger.lower)) {
      bollingerLowerSeriesRef.current.update({ time, value: bollinger.lower });
    }
    if (rsiSeriesRef.current && Number.isFinite(indicators.rsi14)) {
      rsiSeriesRef.current.update({ time, value: indicators.rsi14 });
    }
    if (macdSeriesRef.current && Number.isFinite(indicators.macd)) {
      macdSeriesRef.current.update({ time, value: indicators.macd });
    }
    if (
      macdSignalSeriesRef.current &&
      Number.isFinite(indicators.macdSignal)
    ) {
      macdSignalSeriesRef.current.update({
        time,
        value: indicators.macdSignal
      });
    }
    if (
      macdHistogramSeriesRef.current &&
      Number.isFinite(indicators.macdHistogram)
    ) {
      macdHistogramSeriesRef.current.update({
        time,
        value: indicators.macdHistogram,
        color:
          indicators.macdHistogram >= 0 ? "#10b981aa" : "#f43f5eaa"
      });
    }
    if (atrSeriesRef.current && Number.isFinite(indicators.atr14)) {
      atrSeriesRef.current.update({ time, value: indicators.atr14 });
    }

    if (
      markersRef.current &&
      ["BUY", "SELL", "SELL_WATCH", "PROFIT_HOLD"].includes(nextState)
    ) {
      const currentMarkers = markersRef.current.markers() || [];
      const newMarker = {
        time,
        position: nextState === "BUY" ? "belowBar" : "aboveBar",
        color:
          nextState === "BUY"
            ? "#10b981"
            : nextState === "PROFIT_HOLD"
              ? "#06b6d4"
              : nextState === "SELL_WATCH"
                ? "#f59e0b"
                : "#ef4444",
        shape:
          nextState === "BUY"
            ? "arrowUp"
            : nextState === "PROFIT_HOLD"
              ? "circle"
              : nextState === "SELL_WATCH"
                ? "square"
                : "arrowDown",
        text: `${nextState} (${confidenceScore}%)`
      };

      markersRef.current.setMarkers([
        ...currentMarkers.slice(-20),
        newMarker
      ]);
    }
  }, [symbol, market, onStateChange]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    historyRef.current = [...normalizedInitialCandles];
    setHasRealChartData(normalizedInitialCandles.length > 0);

    const bg = isWhiteTheme ? "#ffffff" : "#08101e";
    const text = isWhiteTheme ? "#334155" : "#94a3b8";
    const grid = isWhiteTheme ? "#f1f5f9" : "#0f1f38";
    const separator = isWhiteTheme ? "#cbd5e1" : "#1e293b";

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { color: bg },
        textColor: text,
        panes: {
          separatorColor: separator,
          separatorHoverColor: "#22d3ee55",
          enableResize: true
        }
      },
      grid: {
        vertLines: { color: grid },
        horzLines: { color: grid }
      },
      crosshair: {
        mode: 1
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: grid
      },
      rightPriceScale: {
        borderColor: grid,
        autoScale: true
      }
    });
    chartRef.current = chart;

    const isKrx = market === "KOREA";
    const upColor = isKrx ? "#ef4444" : "#10b981";
    const downColor = isKrx ? "#3b82f6" : "#f43f5e";

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
      borderVisible: false
    });
    candleSeriesRef.current = candleSeries;

    candleSeries.setData(
      historyRef.current.map(c => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }))
    );

    markersRef.current = createSeriesMarkers(candleSeries);

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#64748b",
      priceFormat: { type: "volume" },
      priceScaleId: ""
    });
    volumeSeriesRef.current = volumeSeries;
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0
      }
    });
    volumeSeries.setData(
      historyRef.current.map(c => ({
        time: c.time as Time,
        value: c.volume,
        color:
          c.close >= c.open
            ? isKrx
              ? "#ef444433"
              : "#10b98133"
            : isKrx
              ? "#3b82f633"
              : "#f43f5e33"
      }))
    );

    const ema9Series = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "EMA 9"
    });
    ema9SeriesRef.current = ema9Series;

    const ema20Series = chart.addSeries(LineSeries, {
      color: "#06b6d4",
      lineWidth: 2,
      title: "EMA 20"
    });
    ema20SeriesRef.current = ema20Series;

    const vwapSeries = chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
      title: "VWAP"
    });
    vwapSeriesRef.current = vwapSeries;

    const bollingerUpperSeries = chart.addSeries(LineSeries, {
      color: "#60a5fa",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: "BB Upper"
    });
    bollingerUpperSeriesRef.current = bollingerUpperSeries;

    const bollingerMiddleSeries = chart.addSeries(LineSeries, {
      color: "#818cf8",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: "BB 20"
    });
    bollingerMiddleSeriesRef.current = bollingerMiddleSeries;

    const bollingerLowerSeries = chart.addSeries(LineSeries, {
      color: "#60a5fa",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: "BB Lower"
    });
    bollingerLowerSeriesRef.current = bollingerLowerSeries;

    const volumeProfilePocSeries = chart.addSeries(LineSeries, {
      color: "#facc15",
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      title: "POC · 거래 최다 가격",
      priceLineVisible: false
    });
    volumeProfilePocSeriesRef.current = volumeProfilePocSeries;

    const volumeProfileVahSeries = chart.addSeries(LineSeries, {
      color: "#34d399",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: "VAH · 핵심구역 위",
      priceLineVisible: false
    });
    volumeProfileVahSeriesRef.current = volumeProfileVahSeries;

    const volumeProfileValSeries = chart.addSeries(LineSeries, {
      color: "#fb7185",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: "VAL · 핵심구역 아래",
      priceLineVisible: false
    });
    volumeProfileValSeriesRef.current = volumeProfileValSeries;

    const initialIndicators = IndicatorEngine.calculate(historyRef.current);
    setIndicatorSnapshot(initialIndicators);
    const initialBollinger = BollingerSqueezeEngine.analyze(historyRef.current);
    setBollingerSnapshot(initialBollinger);
    const initialVolumeProfile = VolumeProfileEngine.estimateFromCandles(historyRef.current, 48, 0.7);
    setVolumeProfileSnapshot(initialVolumeProfile);

    const initialCloses = historyRef.current.map(c => c.close);
    const ema9Values = IndicatorEngine.calcEMASeries(initialCloses, 9);
    const ema20Values = IndicatorEngine.calcEMASeries(initialCloses, 20);
    const vwapValues = IndicatorEngine.calculateSessionVWAPSeries(historyRef.current);
    const bollingerValues = BollingerSqueezeEngine.calculateSeries(initialCloses);

    ema9Series.setData(
      historyRef.current
        .map((c, idx) => ({ time: c.time as Time, value: ema9Values[idx] }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );
    ema20Series.setData(
      historyRef.current
        .map((c, idx) => ({ time: c.time as Time, value: ema20Values[idx] }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );
    vwapSeries.setData(
      historyRef.current
        .map((c, idx) => ({ time: c.time as Time, value: vwapValues[idx] }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );

    bollingerUpperSeries.setData(
      historyRef.current
        .map((c, idx) => ({ time: c.time as Time, value: bollingerValues[idx]?.upper }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );
    bollingerMiddleSeries.setData(
      historyRef.current
        .map((c, idx) => ({ time: c.time as Time, value: bollingerValues[idx]?.middle }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );
    bollingerLowerSeries.setData(
      historyRef.current
        .map((c, idx) => ({ time: c.time as Time, value: bollingerValues[idx]?.lower }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );

    const profileGuideData = (value: number, endTime?: Time) => {
      if (!Number.isFinite(value) || value <= 0) return [] as Array<{ time: Time; value: number }>;
      const first = historyRef.current[0]?.time as Time | undefined;
      const lastCandle = historyRef.current[historyRef.current.length - 1];
      const last = endTime ?? (lastCandle?.time as Time | undefined);
      if (first === undefined && last === undefined) return [] as Array<{ time: Time; value: number }>;
      if (first === undefined || last === undefined || first === last) {
        const onlyTime = (last ?? first) as Time;
        return [{ time: onlyTime, value }];
      }
      return [{ time: first, value }, { time: last, value }];
    };

    volumeProfilePocSeries.setData(profileGuideData(initialVolumeProfile.poc));
    volumeProfileVahSeries.setData(profileGuideData(initialVolumeProfile.vah));
    volumeProfileValSeries.setData(profileGuideData(initialVolumeProfile.val));

    const forecastSeries = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: "AI Forecast (Base)"
    });
    forecastSeriesRef.current = forecastSeries;

    const bullForecastSeries = chart.addSeries(LineSeries, {
      color: "#10b981",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: "Bull Scenario"
    });
    bullForecastSeriesRef.current = bullForecastSeries;

    const bearForecastSeries = chart.addSeries(LineSeries, {
      color: "#f43f5e",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: "Bear Scenario"
    });
    bearForecastSeriesRef.current = bearForecastSeries;

    const trailingExitSeries = chart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 2,
      lineStyle: LineStyle.LargeDashed,
      title: "Trailing Exit"
    });
    trailingExitSeriesRef.current = trailingExitSeries;

    const initForecast = generateForecastPath(historyRef.current, initialIndicators, 8);
    setLastForecast(initForecast);
    forecastSeries.setData(
      initForecast
        .map(p => ({ time: p.time as Time, value: p.predicted }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );
    bullForecastSeries.setData(
      initForecast
        .map(p => ({ time: p.time as Time, value: p.upper }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );
    bearForecastSeries.setData(
      initForecast
        .map(p => ({ time: p.time as Time, value: p.lower }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)
    );

    const rsiSeries = chart.addSeries(
      LineSeries,
      {
        color: "#38bdf8",
        lineWidth: 2,
        title: "RSI 14",
        priceLineVisible: false,
        lastValueVisible: true
      },
      1
    );
    rsiSeriesRef.current = rsiSeries;

    rsiSeries.createPriceLine({ price: 70, color: "#f59e0b", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "과열 70" });
    rsiSeries.createPriceLine({ price: 50, color: "#64748b", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: "중립 50" });
    rsiSeries.createPriceLine({ price: 30, color: "#22c55e", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "침체 30" });

    const rsiValues = IndicatorEngine.calcRSISeries(initialCloses, 14);
    rsiSeries.setData(
      historyRef.current
        .map((c, idx) => ({ time: c.time as Time, value: rsiValues[idx] }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value))
    );

    const macdHistogram = chart.addSeries(
      HistogramSeries,
      {
        title: "MACD Hist",
        priceLineVisible: false,
        lastValueVisible: false,
        base: 0
      },
      2
    );
    macdHistogramSeriesRef.current = macdHistogram;

    const macdSeries = chart.addSeries(
      LineSeries,
      { color: "#22d3ee", lineWidth: 2, title: "MACD", priceLineVisible: false },
      2
    );
    macdSeriesRef.current = macdSeries;

    const macdSignalSeries = chart.addSeries(
      LineSeries,
      { color: "#f59e0b", lineWidth: 2, title: "Signal", priceLineVisible: false },
      2
    );
    macdSignalSeriesRef.current = macdSignalSeries;
    macdSeries.createPriceLine({ price: 0, color: "#64748b", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "0" });

    const macdValues = IndicatorEngine.calcMACDSeries(initialCloses);
    macdSeries.setData(
      historyRef.current
        .map((c, idx) => ({ time: c.time as Time, value: macdValues.macd[idx] }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value))
    );
    macdSignalSeries.setData(
      historyRef.current
        .map((c, idx) => ({ time: c.time as Time, value: macdValues.signal[idx] }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value))
    );
    macdHistogram.setData(
      historyRef.current
        .map((c, idx) => ({
          time: c.time as Time,
          value: macdValues.hist[idx],
          color: macdValues.hist[idx] >= 0 ? "#10b981aa" : "#f43f5eaa"
        }))
        .filter((p): p is { time: Time; value: number; color: string } => Number.isFinite(p.value))
    );

    const atrSeries = chart.addSeries(
      LineSeries,
      { color: "#fb7185", lineWidth: 2, title: "ATR 14", priceLineVisible: false, lastValueVisible: true },
      3
    );
    atrSeriesRef.current = atrSeries;
    const atrValues = IndicatorEngine.calcATRSeries(historyRef.current, 14);
    atrSeries.setData(
      historyRef.current
        .map((c, idx) => ({ time: c.time as Time, value: atrValues[idx] }))
        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value >= 0)
    );

    const panes = chart.panes();
    panes[0]?.setHeight(420);
    panes[1]?.setHeight(105);
    panes[2]?.setHeight(115);
    panes[3]?.setHeight(95);
    chart.timeScale().fitContent();

    const unsubscribeFeed = realTimeMarketFeedManager.subscribe(symbol, (tick: LiveTick) => {
      setCurrentPrice(tick.price);
      setLastTickTimeStr(new Date(tick.timestamp).toLocaleTimeString());
      volumeProfileAccumulatorRef.current.addTick(tick);

      const normalizedMarket = market === "UPBIT" || market === "CRYPTO" ? "CRYPTO" : market;
      const res = aggregatorRef.current.update(tick, normalizedMarket);
      const time = res.candle.time as Time;

      candleSeriesRef.current?.update({
        time,
        open: res.candle.open,
        high: res.candle.high,
        low: res.candle.low,
        close: res.candle.close
      });
      volumeSeriesRef.current?.update({
        time,
        value: res.candle.volume,
        color:
          res.candle.close >= res.candle.open
            ? isKrx
              ? "#ef444433"
              : "#10b98133"
            : isKrx
              ? "#3b82f633"
              : "#f43f5e33"
      });

      setHasRealChartData(true);
      const now = Date.now();
      if (now - lastIndicatorPreviewAtRef.current >= 1_000) {
        lastIndicatorPreviewAtRef.current = now;
        const previewCandles = mergeFormingCandle(
          historyRef.current,
          { ...res.candle, isClosed: false },
          600
        );
        const preview = IndicatorEngine.calculate(previewCandles);
        setIndicatorSnapshot(preview);
        const previewBollinger = BollingerSqueezeEngine.analyze(previewCandles);
        setBollingerSnapshot(previewBollinger);
        const liveVolumeProfile = volumeProfileAccumulatorRef.current.snapshot(0.7);
        if (liveVolumeProfile.sampleCount > 0) {
          setVolumeProfileSnapshot(liveVolumeProfile);
          volumeProfilePocSeriesRef.current?.setData(profileGuideData(liveVolumeProfile.poc, time));
          volumeProfileVahSeriesRef.current?.setData(profileGuideData(liveVolumeProfile.vah, time));
          volumeProfileValSeriesRef.current?.setData(profileGuideData(liveVolumeProfile.val, time));
        }

        if (Number.isFinite(preview.ema9) && preview.ema9 > 0) ema9SeriesRef.current?.update({ time, value: preview.ema9 });
        if (Number.isFinite(preview.ema20) && preview.ema20 > 0) ema20SeriesRef.current?.update({ time, value: preview.ema20 });
        if (Number.isFinite(preview.vwap) && preview.vwap > 0) vwapSeriesRef.current?.update({ time, value: preview.vwap });
        if (Number.isFinite(previewBollinger.upper)) bollingerUpperSeriesRef.current?.update({ time, value: previewBollinger.upper });
        if (Number.isFinite(previewBollinger.middle)) bollingerMiddleSeriesRef.current?.update({ time, value: previewBollinger.middle });
        if (Number.isFinite(previewBollinger.lower)) bollingerLowerSeriesRef.current?.update({ time, value: previewBollinger.lower });
        if (Number.isFinite(preview.rsi14)) rsiSeriesRef.current?.update({ time, value: preview.rsi14 });
        if (Number.isFinite(preview.macd)) macdSeriesRef.current?.update({ time, value: preview.macd });
        if (Number.isFinite(preview.macdSignal)) macdSignalSeriesRef.current?.update({ time, value: preview.macdSignal });
        if (Number.isFinite(preview.macdHistogram)) {
          macdHistogramSeriesRef.current?.update({
            time,
            value: preview.macdHistogram,
            color: preview.macdHistogram >= 0 ? "#10b981aa" : "#f43f5eaa"
          });
        }
        if (Number.isFinite(preview.atr14)) atrSeriesRef.current?.update({ time, value: preview.atr14 });
      }

      if (res.closed) {
        onClosedCandle({ ...res.candle, isClosed: true });
      }
    });

    return () => {
      unsubscribeFeed();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ema9SeriesRef.current = null;
      ema20SeriesRef.current = null;
      vwapSeriesRef.current = null;
      bollingerUpperSeriesRef.current = null;
      bollingerMiddleSeriesRef.current = null;
      bollingerLowerSeriesRef.current = null;
      volumeProfilePocSeriesRef.current = null;
      volumeProfileVahSeriesRef.current = null;
      volumeProfileValSeriesRef.current = null;
      forecastSeriesRef.current = null;
      bullForecastSeriesRef.current = null;
      bearForecastSeriesRef.current = null;
      trailingExitSeriesRef.current = null;
      rsiSeriesRef.current = null;
      macdSeriesRef.current = null;
      macdSignalSeriesRef.current = null;
      macdHistogramSeriesRef.current = null;
      atrSeriesRef.current = null;
      markersRef.current = null;
    };
  }, [symbol, isWhiteTheme, normalizedInitialCandles, market, onClosedCandle]);

  useEffect(() => {
    ema9SeriesRef.current?.applyOptions({ visible: activeIndicators.ema });
    ema20SeriesRef.current?.applyOptions({ visible: activeIndicators.ema });
    vwapSeriesRef.current?.applyOptions({ visible: activeIndicators.vwap });
    bollingerUpperSeriesRef.current?.applyOptions({ visible: activeIndicators.bollinger });
    bollingerMiddleSeriesRef.current?.applyOptions({ visible: activeIndicators.bollinger });
    bollingerLowerSeriesRef.current?.applyOptions({ visible: activeIndicators.bollinger });
    volumeProfilePocSeriesRef.current?.applyOptions({ visible: activeIndicators.volumeProfile });
    volumeProfileVahSeriesRef.current?.applyOptions({ visible: activeIndicators.volumeProfile });
    volumeProfileValSeriesRef.current?.applyOptions({ visible: activeIndicators.volumeProfile });
    forecastSeriesRef.current?.applyOptions({ visible: activeIndicators.forecast });
    bullForecastSeriesRef.current?.applyOptions({ visible: activeIndicators.forecast });
    bearForecastSeriesRef.current?.applyOptions({ visible: activeIndicators.forecast });
    trailingExitSeriesRef.current?.applyOptions({ visible: activeIndicators.trailing });
    volumeSeriesRef.current?.applyOptions({ visible: activeIndicators.volume });
    rsiSeriesRef.current?.applyOptions({ visible: activeIndicators.rsi });
    macdSeriesRef.current?.applyOptions({ visible: activeIndicators.macd });
    macdSignalSeriesRef.current?.applyOptions({ visible: activeIndicators.macd });
    macdHistogramSeriesRef.current?.applyOptions({ visible: activeIndicators.macd });
    atrSeriesRef.current?.applyOptions({ visible: activeIndicators.atr });

    const panes = chartRef.current?.panes();
    if (panes) {
      panes[1]?.setHeight(activeIndicators.rsi ? 105 : 2);
      panes[2]?.setHeight(activeIndicators.macd ? 115 : 2);
      panes[3]?.setHeight(activeIndicators.atr ? 95 : 2);
    }
  }, [activeIndicators]);

  const stateColors: Record<TradingState, { bg: string; text: string; border: string }> = {
    NO_TRADE: { bg: "bg-slate-700/40", text: "text-slate-300", border: "border-slate-600" },
    BUY_WATCH: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/50" },
    BUY: { bg: "bg-emerald-500/25", text: "text-emerald-400", border: "border-emerald-500/60" },
    HOLD: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/50" },
    PROFIT_HOLD: { bg: "bg-cyan-500/25", text: "text-cyan-300", border: "border-cyan-400" },
    SELL_WATCH: { bg: "bg-orange-500/25", text: "text-orange-400", border: "border-orange-500/60" },
    SELL: { bg: "bg-rose-500/25", text: "text-rose-400", border: "border-rose-500/60" }
  };

  const currentRvol = indicatorSnapshot && Number.isFinite(indicatorSnapshot.rvol)
    ? indicatorSnapshot.rvol
    : null;
  const rvolStatus = currentRvol === null
    ? "계산 대기"
    : currentRvol >= 2
      ? "거래량 매우 많음 🔥"
      : currentRvol >= 1.5
        ? "거래량 많음"
        : currentRvol < 0.7
          ? "거래량 적음"
          : "거래량 보통";
  const rsiStatus = !indicatorSnapshot || !Number.isFinite(indicatorSnapshot.rsi14)
    ? "계산 대기"
    : indicatorSnapshot.rsi14 >= 70
      ? "과열 주의"
      : indicatorSnapshot.rsi14 <= 30
        ? "과매도 구간"
        : indicatorSnapshot.rsi14 >= 50
          ? "상승 힘 우세"
          : "하락 힘 우세";
  const macdStatus = !indicatorSnapshot || !Number.isFinite(indicatorSnapshot.macdHistogram)
    ? "계산 대기"
    : indicatorSnapshot.macdHistogram > 0
      ? "상승 모멘텀"
      : indicatorSnapshot.macdHistogram < 0
        ? "하락 모멘텀"
        : "중립";
  const atrPercent = indicatorSnapshot && Number.isFinite(indicatorSnapshot.atr14) && currentPrice > 0
    ? (indicatorSnapshot.atr14 / currentPrice) * 100
    : null;
  const bollingerStatus = !bollingerSnapshot || !Number.isFinite(bollingerSnapshot.bandwidthPct)
    ? "계산 대기"
    : bollingerSnapshot.squeezeRelease
      ? bollingerSnapshot.direction === "UP"
        ? "스퀴즈 해제 + 위 돌파 🚀"
        : "스퀴즈 해제 + 아래 이탈 ⚠️"
      : bollingerSnapshot.squeeze
        ? "밴드 압축 · 큰 움직임 준비"
        : bollingerSnapshot.direction === "UP"
          ? bollingerSnapshot.breakoutConfirmed ? "상단 돌파 확인" : "상단 돌파 진행 중"
          : bollingerSnapshot.direction === "DOWN"
            ? bollingerSnapshot.breakoutConfirmed ? "하단 이탈 확인" : "하단 이탈 진행 중"
            : "밴드 안에서 움직이는 중";
  const volumeProfileQualityText = !volumeProfileSnapshot
    ? "계산 대기"
    : volumeProfileSnapshot.quality === "LIVE_TICK_PARTIAL"
      ? `실시간 체결 · 연결 후 ${volumeProfileSnapshot.sampleCount}건`
      : volumeProfileSnapshot.quality === "OHLCV_ESTIMATED"
        ? "과거 봉으로 추정 · 정확한 가격별 체결 아님"
        : "계산 대기";
  const volumeProfilePosition = !volumeProfileSnapshot || !Number.isFinite(volumeProfileSnapshot.vah) || !Number.isFinite(volumeProfileSnapshot.val)
    ? "계산 대기"
    : currentPrice > volumeProfileSnapshot.vah
      ? "핵심 거래구역 위쪽"
      : currentPrice < volumeProfileSnapshot.val
        ? "핵심 거래구역 아래쪽"
        : "핵심 거래구역 안쪽";
  const maxProfileTopVolume = volumeProfileSnapshot?.topLevels[0]?.volume ?? 1;
  const lowerPaneCount = [activeIndicators.rsi, activeIndicators.macd, activeIndicators.atr].filter(Boolean).length;
  const chartHeight = 500 + lowerPaneCount * 105;

  return (
    <div className={`flex flex-col rounded-xl border ${isWhiteTheme ? "bg-white border-slate-200 text-slate-900" : "bg-[#08101e] border-[#13233c] text-slate-100"} p-3 gap-2 shadow-lg ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black">{name}</span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 font-bold">{symbol}</span>
          </div>
          <div className="text-base font-mono font-black text-cyan-400">{formatDisplayPrice(currentPrice)}</div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold">LIVE TICK</span>
            {lastTickTimeStr && <span className="text-slate-400 text-[10px]">({lastTickTimeStr})</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-black flex items-center gap-1.5 shadow-sm ${stateColors[tradingState].bg} ${stateColors[tradingState].text} ${stateColors[tradingState].border}`}>
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>상태: {tradingState}</span>
          </div>
          <div className="px-2 py-1 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-mono font-bold flex items-center gap-1" title="기술적 종합 점수 (확률값 아님)">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Technical Score {aiConfidence}/100</span>
          </div>
          <div className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>FEED: BROKER REALTIME</span>
          </div>
          {trailingExitPrice > 0 && (
            <div className="px-2 py-1 rounded-lg bg-orange-950/60 border border-orange-800/60 text-orange-300 text-xs font-mono font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-orange-400" />
              <span>Trailing Stop: {formatDisplayPrice(trailingExitPrice)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 bg-slate-900/90 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span>SOURCE: <strong className="text-cyan-400">KIS_REALTIME_WS</strong></span>
          <span>QUALITY: <strong className="text-emerald-400">BROKER_REALTIME</strong></span>
          <span>TIMEFRAME: <strong className="text-amber-400">{selectedTf}</strong></span>
          <span>MODEL: <strong className="text-purple-400">TECHNICAL PROJECTION</strong></span>
        </div>
        <div><span>BAR STATUS: <strong className="text-cyan-300">BUILDING · SIGNAL CONFIRM ON CLOSE</strong></span></div>
      </div>

      {indicatorSnapshot && hasRealChartData && (
        <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-9 gap-1.5 text-[10px] font-mono">
          <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-2 py-1.5">
            <div className="text-slate-400">EMA9 · 짧은 흐름</div>
            <div className="font-black text-amber-300">{Number.isFinite(indicatorSnapshot.ema9) ? formatDisplayPrice(indicatorSnapshot.ema9) : "계산 중"}</div>
          </div>
          <div className="rounded-lg border border-cyan-700/50 bg-cyan-950/30 px-2 py-1.5">
            <div className="text-slate-400">EMA20 · 기준 흐름</div>
            <div className="font-black text-cyan-300">{Number.isFinite(indicatorSnapshot.ema20) ? formatDisplayPrice(indicatorSnapshot.ema20) : "계산 중"}</div>
          </div>
          <div className="rounded-lg border border-purple-700/50 bg-purple-950/30 px-2 py-1.5">
            <div className="text-slate-400">VWAP · 오늘 평균</div>
            <div className="font-black text-purple-300">{Number.isFinite(indicatorSnapshot.vwap) ? formatDisplayPrice(indicatorSnapshot.vwap) : "계산 중"}</div>
          </div>
          <div className={`rounded-lg border px-2 py-1.5 ${bollingerSnapshot?.squeezeRelease ? "border-fuchsia-500/70 bg-fuchsia-950/40" : bollingerSnapshot?.squeeze ? "border-indigo-500/70 bg-indigo-950/40" : "border-blue-800/60 bg-blue-950/20"}`}>
            <div className="text-slate-400">Bollinger · 폭/돌파</div>
            <div className="font-black text-blue-300">{bollingerSnapshot && Number.isFinite(bollingerSnapshot.bandwidthPct) ? `${bollingerSnapshot.bandwidthPct.toFixed(2)}%` : "계산 중"}</div>
            <div className="text-[9px] text-slate-400">{bollingerStatus}</div>
          </div>
          <div className="rounded-lg border border-yellow-700/50 bg-yellow-950/20 px-2 py-1.5">
            <div className="text-slate-400">가격별 거래량 · POC</div>
            <div className="font-black text-yellow-300">{volumeProfileSnapshot && Number.isFinite(volumeProfileSnapshot.poc) ? formatDisplayPrice(volumeProfileSnapshot.poc) : "계산 중"}</div>
            <div className="text-[9px] text-slate-400">{volumeProfilePosition}</div>
          </div>
          <div className={`rounded-lg border px-2 py-1.5 ${currentRvol !== null && currentRvol >= 2 ? "border-orange-500/70 bg-orange-950/40" : "border-slate-700 bg-slate-900/60"}`}>
            <div className="text-slate-400">RVOL · 평소보다 거래량</div>
            <div className={`font-black ${currentRvol !== null && currentRvol >= 2 ? "text-orange-300" : "text-emerald-300"}`}>{currentRvol !== null ? `${currentRvol.toFixed(2)}x` : "계산 중"}</div>
            <div className="text-[9px] text-slate-400">{rvolStatus}</div>
          </div>
          <div className="rounded-lg border border-sky-700/50 bg-sky-950/30 px-2 py-1.5">
            <div className="text-slate-400">RSI14 · 매수/매도 힘</div>
            <div className="font-black text-sky-300">{Number.isFinite(indicatorSnapshot.rsi14) ? indicatorSnapshot.rsi14.toFixed(1) : "계산 중"}</div>
            <div className="text-[9px] text-slate-400">{rsiStatus}</div>
          </div>
          <div className="rounded-lg border border-teal-700/50 bg-teal-950/30 px-2 py-1.5">
            <div className="text-slate-400">MACD · 방향 힘</div>
            <div className={`font-black ${Number.isFinite(indicatorSnapshot.macdHistogram) && indicatorSnapshot.macdHistogram >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{Number.isFinite(indicatorSnapshot.macdHistogram) ? indicatorSnapshot.macdHistogram.toFixed(4) : "계산 중"}</div>
            <div className="text-[9px] text-slate-400">{macdStatus}</div>
          </div>
          <div className="rounded-lg border border-rose-700/50 bg-rose-950/30 px-2 py-1.5">
            <div className="text-slate-400">ATR14 · 가격 흔들림</div>
            <div className="font-black text-rose-300">{Number.isFinite(indicatorSnapshot.atr14) ? formatDisplayPrice(indicatorSnapshot.atr14) : "계산 중"}</div>
            <div className="text-[9px] text-slate-400">{atrPercent !== null ? `현재가의 ${atrPercent.toFixed(2)}%` : "계산 대기"}</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
          {(["1m", "3m", "5m", "15m", "1D"] as const).map(tf => (
            <button
              key={tf}
              type="button"
              onClick={() => handleTimeframeChange(tf)}
              disabled={isTimeframeLoading}
              className={`px-2 py-0.5 rounded transition font-bold cursor-pointer disabled:opacity-50 ${selectedTf === tf ? "bg-cyan-600 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
            >
              {selectedTf === tf && isTimeframeLoading ? `${tf}…` : tf}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, ema: !prev.ema }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.ema ? "bg-amber-950/70 border-amber-600 text-amber-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>EMA (9/20)</button>
          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, vwap: !prev.vwap }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.vwap ? "bg-purple-950/70 border-purple-600 text-purple-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>VWAP</button>
          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, bollinger: !prev.bollinger }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.bollinger ? "bg-blue-950/70 border-blue-600 text-blue-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>Bollinger</button>
          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, volumeProfile: !prev.volumeProfile }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.volumeProfile ? "bg-yellow-950/70 border-yellow-600 text-yellow-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>가격별거래량</button>
          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, volume: !prev.volume }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.volume ? "bg-emerald-950/70 border-emerald-600 text-emerald-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>거래량</button>
          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, rsi: !prev.rsi }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.rsi ? "bg-sky-950/70 border-sky-600 text-sky-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>RSI</button>
          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, macd: !prev.macd }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.macd ? "bg-teal-950/70 border-teal-600 text-teal-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>MACD</button>
          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, atr: !prev.atr }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.atr ? "bg-rose-950/70 border-rose-600 text-rose-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>ATR</button>
          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, forecast: !prev.forecast }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold flex items-center gap-1 ${activeIndicators.forecast ? "bg-cyan-950/70 border-cyan-500 text-cyan-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}><Sparkles className="w-3 h-3 text-cyan-400" /><span>AI 3-Path 예측선</span></button>
          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, trailing: !prev.trailing }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.trailing ? "bg-orange-950/70 border-orange-600 text-orange-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>Trailing Exit</button>
          <button type="button" onClick={() => chartRef.current?.timeScale().fitContent()} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer font-bold" title="차트 전체 보기 맞춤"><Maximize2 className="w-3 h-3" /></button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-2 text-[10px] font-mono text-slate-400">
        {activeIndicators.bollinger && <span>BB <strong className="text-blue-300">위/가운데/아래 밴드 · 좁아지면 스퀴즈</strong></span>}
        {activeIndicators.volumeProfile && <span>가격별거래량 <strong className="text-yellow-300">POC=제일 많이 거래 · VAH/VAL=핵심 구역 위/아래</strong></span>}
        {activeIndicators.rsi && <span>RSI <strong className="text-sky-300">70 과열 · 50 중립 · 30 과매도</strong></span>}
        {activeIndicators.macd && <span>MACD <strong className="text-teal-300">청록=MACD · 주황=Signal · 막대=차이</strong></span>}
        {activeIndicators.atr && <span>ATR <strong className="text-rose-300">선이 커질수록 변동성 확대</strong></span>}
      </div>

      <div
        ref={chartContainerRef}
        className="w-full rounded-lg overflow-hidden border border-slate-800/80 relative"
        style={{ height: chartHeight }}
      >
        {activeIndicators.bollinger && bollingerSnapshot && Number.isFinite(bollingerSnapshot.bandwidthPct) && (
          <div className={`absolute top-2 left-2 z-20 rounded-md border px-2 py-1 text-[10px] font-mono font-bold ${bollingerSnapshot.squeezeRelease ? "border-fuchsia-500/70 bg-fuchsia-950/90 text-fuchsia-200" : bollingerSnapshot.squeeze ? "border-indigo-500/70 bg-indigo-950/90 text-indigo-200" : bollingerSnapshot.direction === "UP" ? "border-emerald-500/70 bg-emerald-950/90 text-emerald-200" : bollingerSnapshot.direction === "DOWN" ? "border-rose-500/70 bg-rose-950/90 text-rose-200" : "border-blue-700/60 bg-slate-950/90 text-blue-200"}`}>
            BB {bollingerSnapshot.bandwidthPct.toFixed(2)}% · {bollingerStatus}
          </div>
        )}
        {activeIndicators.volumeProfile && volumeProfileSnapshot && Number.isFinite(volumeProfileSnapshot.poc) && (
          <div className="absolute top-10 right-2 z-20 w-48 rounded-lg border border-yellow-700/60 bg-slate-950/90 p-2 text-[9px] font-mono shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <strong className="text-yellow-300">가격별 거래량 지도</strong>
              <span className="text-slate-500">TOP 5</span>
            </div>
            <div className="mb-1 grid grid-cols-3 gap-1 text-center">
              <div><span className="text-slate-500">POC</span><div className="font-bold text-yellow-300">{formatDisplayPrice(volumeProfileSnapshot.poc)}</div></div>
              <div><span className="text-slate-500">VAH</span><div className="font-bold text-emerald-300">{formatDisplayPrice(volumeProfileSnapshot.vah)}</div></div>
              <div><span className="text-slate-500">VAL</span><div className="font-bold text-rose-300">{formatDisplayPrice(volumeProfileSnapshot.val)}</div></div>
            </div>
            <div className="space-y-1">
              {volumeProfileSnapshot.topLevels.slice(0, 5).map(level => (
                <div key={level.price} className="grid grid-cols-[62px_1fr_32px] items-center gap-1">
                  <span className="text-slate-300 text-right">{formatDisplayPrice(level.price)}</span>
                  <div className="h-1.5 overflow-hidden rounded bg-slate-800">
                    <div className="h-full rounded bg-yellow-400/70" style={{ width: `${Math.max(6, Math.min(100, (level.volume / maxProfileTopVolume) * 100))}%` }} />
                  </div>
                  <span className="text-slate-500 text-right">{level.volumePct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
            <div className="mt-1 border-t border-slate-800 pt-1 text-slate-500">{volumeProfileQualityText}</div>
          </div>
        )}
        {isTimeframeLoading && (
          <div className="absolute top-2 right-2 z-20 rounded-md border border-cyan-700/60 bg-slate-950/90 px-2 py-1 text-[10px] font-mono font-bold text-cyan-300">
            {selectedTf} 실제 봉 불러오는 중…
          </div>
        )}
        {!hasRealChartData && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10 p-6 text-center">
            <div className="max-w-md p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl flex flex-col items-center gap-2">
              <Activity className="w-8 h-8 text-cyan-400 animate-pulse" />
              <div className="text-sm font-bold text-slate-200">실시간 시장 데이터 대기 중 (WAITING_FOR_REAL_MARKET_DATA)</div>
              <div className="text-xs text-slate-400">가짜/합성 시세 생성이 금지된 LIVE-ONLY 상태입니다.<br />실제 WebSocket 체결 틱 또는 API 봉 수신 시 차트가 표시됩니다.</div>
            </div>
          </div>
        )}
      </div>

      {lastForecast.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 font-mono text-[11px] border-t border-slate-800/60">
          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-emerald-400 font-bold flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-400 inline-block" /><span>Bull Scenario (상방)</span></span>
            <span className="text-emerald-300 font-black">{formatDisplayPrice(lastForecast[lastForecast.length - 1].upper)} ({(lastForecast[0].probabilityUp * 100).toFixed(0)}%)</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-purple-400 font-bold flex items-center gap-1"><span className="w-2 h-0.5 bg-purple-400 inline-block" /><span>AI Base Path (기본)</span></span>
            <span className="text-purple-300 font-black">{formatDisplayPrice(lastForecast[lastForecast.length - 1].predicted)}</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-rose-400 font-bold flex items-center gap-1"><span className="w-2 h-0.5 bg-rose-400 inline-block" /><span>Bear Scenario (하방)</span></span>
            <span className="text-rose-300 font-black">{formatDisplayPrice(lastForecast[lastForecast.length - 1].lower)} ({(lastForecast[0].probabilityDown * 100).toFixed(0)}%)</span>
          </div>
        </div>
      )}
    </div>
  );
};
