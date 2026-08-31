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

/**
 * Executes full End-to-End J.A.R.V.I.S. V4.0 Stage 1 + Stage 2 Data & Prediction Pipeline
 */
export function runJarvisV4Pipeline(
  symbol: string,
  market: "KOREA" | "US" | "CRYPTO" = "KOREA",
  sectorName: string = "IT / 반도체",
  currentSectorExposurePct: number = 35.0
): PipelineExecutionResult {
  // 1. Stage 1 Data Collector & Transformer
  const candles = MarketDataCollector.fetchOHLCV(symbol, market, "15m", 60);
  const indicators = TechnicalIndicatorCalculator.calculateAll(candles);
  const patterns = PatternDetector.detect(candles);
  const tripleBarrier = TripleBarrierLabeler.generateLabel(candles);

  // 2. Stage 2 Directional Prediction
  const rawModel = LightGBMPredictionEngine.predict(candles, indicators, patterns);

  // 3. Stage 2 Probability Calibration
  const calibrated = ProbabilityCalibrator.calibrate(rawModel.rawProbability, "LIGHTGBM");

  // 4. Stage 2 Meta Labeling & NO_TRADE Filtering
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
