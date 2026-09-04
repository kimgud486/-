// J.A.R.V.I.S. V4.0 Stage 2 Prediction Engine Index

import { MarketDataCollector, TechnicalIndicatorCalculator, PatternDetector, TripleBarrierLabeler } from "../data";
import { LightGBMPredictionEngine } from "./lightgbmEngine";
import { ProbabilityCalibrator } from "./calibration";
import { MetaLabelingFilter, MetaLabelingOutput } from "./metaLabeling";

export * from "./lightgbmEngine";
export * from "./calibration";
export * from "./metaLabeling";

export interface PipelineExecutionResult {
  symbol: string;
  market: "KOREA" | "US" | "CRYPTO";
  rawModelOutput: ReturnType<typeof LightGBMPredictionEngine.predict>;
  calibratedOutput: ReturnType<typeof ProbabilityCalibrator.calibrate>;
  tripleBarrierLabel: ReturnType<typeof TripleBarrierLabeler.generateLabel>;
  metaDecision: MetaLabelingOutput;
  executionTimestamp: string;
}

export interface PredictionPipelineInput {
  symbol: string;
  market?: "KOREA" | "US" | "CRYPTO";
  candles?: any[];
  indicators?: any;
  patterns?: any;
  sectorName?: string;
  currentSectorExposurePct?: number;
}

/**
 * Modern Prediction Pipeline accepting real market candles directly from external feeds/websockets.
 */
export function runPredictionPipeline(input: PredictionPipelineInput): PipelineExecutionResult {
  const symbol = input.symbol || "005930";
  const market = input.market || "KOREA";
  const sectorName = input.sectorName || "IT / 반도체";
  const currentSectorExposurePct = input.currentSectorExposurePct ?? 35.0;

  const candles = input.candles && input.candles.length > 0 
    ? input.candles 
    : MarketDataCollector.fetchOHLCV(symbol, market, "15m", 60);

  const indicators = input.indicators || TechnicalIndicatorCalculator.calculateAll(candles);
  const patterns = input.patterns || PatternDetector.detect(candles);
  const tripleBarrier = TripleBarrierLabeler.generateLabel(candles);

  const rawModel = LightGBMPredictionEngine.predict(candles, indicators, patterns);
  const calibrated = ProbabilityCalibrator.calibrate(rawModel.rawProbability, "LIGHTGBM");

  const metaDecision = MetaLabelingFilter.evaluate({
    symbol,
    market,
    calibratedResult: calibrated,
    riskRewardRatio: 2.35,
    sectorName,
    currentSectorExposurePct,
    volatilityAnomalous: false,
    modelAgreementPct: rawModel.treeModelAgreement
  });

  return {
    symbol,
    market,
    rawModelOutput: rawModel,
    calibratedOutput: calibrated,
    tripleBarrierLabel: tripleBarrier,
    metaDecision,
    executionTimestamp: new Date().toISOString()
  };
}

/**
 * Executes full End-to-End J.A.R.V.I.S. V4.0 Stage 1 + Stage 2 Data & Prediction Pipeline
 */
export function runJarvisV4Pipeline(
  symbol: string,
  market: "KOREA" | "US" | "CRYPTO" = "KOREA",
  sectorName: string = "IT / 반도체",
  currentSectorExposurePct: number = 35.0,
  providedCandles?: any[]
): PipelineExecutionResult {
  return runPredictionPipeline({
    symbol,
    market,
    sectorName,
    currentSectorExposurePct,
    candles: providedCandles
  });
}
