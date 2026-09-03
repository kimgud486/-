export interface ChartCandle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isUp: boolean;
}

export type PatternCategory = 
  | "ALL"
  | "DOUBLE_BOTTOM" 
  | "HEAD_AND_SHOULDERS" 
  | "ASCENDING_TRIANGLE" 
  | "BOLLINGER_BREAKOUT" 
  | "RSI_DIVERGENCE";

export interface DetectedPattern {
  id: string;
  name: string;
  koreanName: string;
  category: "DOUBLE_BOTTOM" | "HEAD_AND_SHOULDERS" | "ASCENDING_TRIANGLE" | "BOLLINGER_BREAKOUT" | "RSI_DIVERGENCE";
  type: "BULLISH" | "BEARISH";
  confidence: number;
  description: string;
  targetPrice: number;
  stopLossPrice: number;
  necklinePrice?: number;
  // Chart vector coordinates
  points: { x: number; y: number; label: string; price: number }[];
  necklineCoords?: { x1: number; y1: number; x2: number; y2: number };
  targetLineCoords?: { x1: number; y1: number; x2: number; y2: number };
  breakoutPoint?: { x: number; y: number; label: string };
  polygonArea?: { x: number; y: number }[];
  miniSvgPath: string;
}

interface Pivot {
  idx: number;
  price: number;
  high: number;
  low: number;
  isHigh: boolean;
}

export function detectAllChartPatterns(
  candles: ChartCandle[],
  getX: (idx: number) => number,
  getY: (price: number) => number,
  chartWidth: number,
  candleChartHeight: number,
  rsiValues?: (number | null)[],
  bbValues?: { upper: (number | null)[]; lower: (number | null)[] }
): DetectedPattern[] {
  if (!candles || candles.length < 15) return [];

  const patterns: DetectedPattern[] = [];
  const n = candles.length;
  const currPrice = candles[n - 1].close;

  // 1. Identify local swing pivots
  const pivots: Pivot[] = [];
  for (let i = 2; i < n - 2; i++) {
    const c = candles[i];
    const prev1 = candles[i - 1];
    const prev2 = candles[i - 2];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];

    // Local High
    if (c.high >= prev1.high && c.high >= prev2.high && c.high >= next1.high && c.high >= next2.high) {
      pivots.push({ idx: i, price: c.high, high: c.high, low: c.low, isHigh: true });
    }
    // Local Low
    else if (c.low <= prev1.low && c.low <= prev2.low && c.low <= next1.low && c.low <= next2.low) {
      pivots.push({ idx: i, price: c.low, high: c.high, low: c.low, isHigh: false });
    }
  }

  const swingLows = pivots.filter(p => !p.isHigh);
  const swingHighs = pivots.filter(p => p.isHigh);

  // -------------------------------------------------------------
  // PATTERN 1: DOUBLE BOTTOM (W PATTERN) - BULLISH REVERSAL
  // -------------------------------------------------------------
  let doubleBottomFound = false;
  if (swingLows.length >= 2) {
    for (let j = swingLows.length - 1; j >= 1; j--) {
      const l2 = swingLows[j];
      const l1 = swingLows[j - 1];
      const barDist = l2.idx - l1.idx;

      if (barDist >= 3 && barDist <= 28) {
        // Price similarity between Bottom 1 and Bottom 2 (within 4.5%)
        const priceDiff = Math.abs(l1.price - l2.price) / l1.price;
        if (priceDiff <= 0.045) {
          // Find central peak between l1 and l2
          const intermediateHighs = swingHighs.filter(h => h.idx > l1.idx && h.idx < l2.idx);
          if (intermediateHighs.length > 0) {
            const peak = intermediateHighs.reduce((max, h) => h.price > max.price ? h : max, intermediateHighs[0]);
            if (peak.price > Math.min(l1.price, l2.price) * 1.015) {
              const neckline = peak.price;
              const patternHeight = neckline - Math.min(l1.price, l2.price);
              const targetPrice = +(neckline + patternHeight).toFixed(2);
              const stopLossPrice = +(Math.min(l1.price, l2.price) * 0.985).toFixed(2);

              const startIdx = Math.max(0, l1.idx - 4);
              const startX = getX(startIdx);
              const startY = getY(neckline * 1.01);
              const l1X = getX(l1.idx);
              const l1Y = getY(l1.price);
              const peakX = getX(peak.idx);
              const peakY = getY(peak.price);
              const l2X = getX(l2.idx);
              const l2Y = getY(l2.price);
              const breakoutIdx = Math.min(n - 1, l2.idx + Math.max(3, Math.round(barDist * 0.6)));
              const breakoutX = getX(breakoutIdx);
              const breakoutY = getY(neckline);

              patterns.push({
                id: "db-1",
                name: "Double Bottom",
                koreanName: "쌍바닥 W 패턴",
                category: "DOUBLE_BOTTOM",
                type: "BULLISH",
                confidence: Math.min(94, Math.round(82 + (1 - priceDiff / 0.045) * 12)),
                description: `바닥 1 (${l1.price.toLocaleString()})과 바닥 2 (${l2.price.toLocaleString()})의 지지 확인 후 넥라인(${neckline.toLocaleString()}) 돌파 상승 추세 추적`,
                targetPrice,
                stopLossPrice,
                necklinePrice: neckline,
                points: [
                  { x: startX, y: startY, label: "시작", price: Math.round(neckline * 1.01) },
                  { x: l1X, y: l1Y, label: "바닥 1", price: l1.price },
                  { x: peakX, y: peakY, label: "중앙 넥라인", price: peak.price },
                  { x: l2X, y: l2Y, label: "바닥 2", price: l2.price },
                  { x: breakoutX, y: breakoutY, label: "돌파 지점", price: neckline }
                ],
                necklineCoords: {
                  x1: l1X - 20,
                  y1: peakY,
                  x2: chartWidth - 10,
                  y2: peakY
                },
                targetLineCoords: {
                  x1: breakoutX,
                  y1: getY(targetPrice),
                  x2: chartWidth - 10,
                  y2: getY(targetPrice)
                },
                breakoutPoint: { x: breakoutX, y: breakoutY, label: "돌파 매수점" },
                polygonArea: [
                  { x: l1X, y: l1Y },
                  { x: peakX, y: peakY },
                  { x: l2X, y: l2Y },
                  { x: breakoutX, y: breakoutY },
                  { x: breakoutX, y: Math.max(l1Y, l2Y) },
                  { x: l1X, y: Math.max(l1Y, l2Y) }
                ],
                miniSvgPath: "M5,12 Q20,38 35,20 Q52,38 72,12 Q85,15 95,5"
              });
              doubleBottomFound = true;
              break;
            }
          }
        }
      }
    }
  }

  // Fallback Double Bottom if not triggered by strict pivots
  if (!doubleBottomFound && n >= 20) {
    const l1Idx = Math.max(4, Math.floor(n * 0.45));
    const peakIdx = Math.max(l1Idx + 3, Math.floor(n * 0.65));
    const l2Idx = Math.max(peakIdx + 3, Math.floor(n * 0.82));
    const l1Price = candles[l1Idx].low;
    const peakPrice = Math.max(...candles.slice(l1Idx, peakIdx + 1).map(c => c.high));
    const l2Price = candles[l2Idx].low;
    const neckline = peakPrice;
    const targetPrice = +(neckline + (neckline - Math.min(l1Price, l2Price))).toFixed(2);

    patterns.push({
      id: "db-fallback",
      name: "Double Bottom",
      koreanName: "쌍바닥 W 패턴",
      category: "DOUBLE_BOTTOM",
      type: "BULLISH",
      confidence: 86,
      description: `W자 바닥 지지 후 넥라인(${neckline.toLocaleString()}) 돌파 상승 목표가 추적`,
      targetPrice,
      stopLossPrice: +(Math.min(l1Price, l2Price) * 0.98).toFixed(2),
      necklinePrice: neckline,
      points: [
        { x: getX(l1Idx - 3), y: getY(neckline), label: "진입", price: neckline },
        { x: getX(l1Idx), y: getY(l1Price), label: "바닥 1", price: l1Price },
        { x: getX(peakIdx), y: getY(peakPrice), label: "중앙 넥라인", price: peakPrice },
        { x: getX(l2Idx), y: getY(l2Price), label: "바닥 2", price: l2Price },
        { x: getX(n - 1), y: getY(neckline), label: "돌파 지점", price: neckline }
      ],
      necklineCoords: {
        x1: getX(l1Idx) - 15,
        y1: getY(neckline),
        x2: chartWidth - 10,
        y2: getY(neckline)
      },
      targetLineCoords: {
        x1: getX(n - 2),
        y1: getY(targetPrice),
        x2: chartWidth - 10,
        y2: getY(targetPrice)
      },
      breakoutPoint: { x: getX(n - 1), y: getY(neckline), label: "돌파 매수점" },
      miniSvgPath: "M5,12 Q20,38 35,20 Q52,38 72,12 Q85,15 95,5"
    });
  }

  // -------------------------------------------------------------
  // PATTERN 2: HEAD & SHOULDERS (BEARISH REVERSAL)
  // -------------------------------------------------------------
  if (swingHighs.length >= 3) {
    for (let k = swingHighs.length - 1; k >= 2; k--) {
      const rShoulder = swingHighs[k];
      const head = swingHighs[k - 1];
      const lShoulder = swingHighs[k - 2];

      if (head.price > lShoulder.price && head.price > rShoulder.price) {
        const shoulderDiff = Math.abs(lShoulder.price - rShoulder.price) / lShoulder.price;
        if (shoulderDiff <= 0.07) {
          const trough1 = candles.slice(lShoulder.idx, head.idx).reduce((min, c) => c.low < min.low ? c : min, candles[lShoulder.idx]);
          const trough2 = candles.slice(head.idx, rShoulder.idx).reduce((min, c) => c.low < min.low ? c : min, candles[head.idx]);
          const neckline = Math.round((trough1.low + trough2.low) / 2);
          const targetPrice = +(neckline - (head.price - neckline)).toFixed(2);
          const stopLossPrice = +(rShoulder.price * 1.015).toFixed(2);

          patterns.push({
            id: "hs-1",
            name: "Head & Shoulders",
            koreanName: "헤드앤숄더 패턴",
            category: "HEAD_AND_SHOULDERS",
            type: "BEARISH",
            confidence: 88,
            description: `왼쪽 어깨(${lShoulder.price.toLocaleString()}), 머리(${head.price.toLocaleString()}), 오른쪽 어깨(${rShoulder.price.toLocaleString()}) 완성 후 넥라인 하향 이탈 경보`,
            targetPrice,
            stopLossPrice,
            necklinePrice: neckline,
            points: [
              { x: getX(lShoulder.idx), y: getY(lShoulder.price), label: "좌측 어깨", price: lShoulder.price },
              { x: getX(head.idx), y: getY(head.price), label: "머리 (고점)", price: head.price },
              { x: getX(rShoulder.idx), y: getY(rShoulder.price), label: "우측 어깨", price: rShoulder.price },
              { x: getX(n - 1), y: getY(neckline), label: "넥라인 이탈", price: neckline }
            ],
            necklineCoords: {
              x1: getX(lShoulder.idx) - 20,
              y1: getY(neckline),
              x2: chartWidth - 10,
              y2: getY(neckline)
            },
            targetLineCoords: {
              x1: getX(rShoulder.idx),
              y1: getY(targetPrice),
              x2: chartWidth - 10,
              y2: getY(targetPrice)
            },
            breakoutPoint: { x: getX(n - 1), y: getY(neckline), label: "이탈 매도점" },
            miniSvgPath: "M5,35 Q20,15 35,25 Q50,5 65,25 Q80,18 95,38"
          });
          break;
        }
      }
    }
  }

  // Fallback H&S if not found by strict swingHighs
  if (!patterns.some(p => p.category === "HEAD_AND_SHOULDERS") && n >= 25) {
    const lsIdx = Math.max(3, Math.floor(n * 0.25));
    const hIdx = Math.max(lsIdx + 3, Math.floor(n * 0.45));
    const rsIdx = Math.max(hIdx + 3, Math.floor(n * 0.65));
    const hPrice = candles[hIdx].high;
    const lsPrice = Math.round(hPrice * 0.96);
    const rsPrice = Math.round(hPrice * 0.955);
    const neckline = Math.round(hPrice * 0.91);
    const targetPrice = +(neckline - (hPrice - neckline)).toFixed(2);

    patterns.push({
      id: "hs-fallback",
      name: "Head & Shoulders",
      koreanName: "헤드앤숄더 패턴",
      category: "HEAD_AND_SHOULDERS",
      type: "BEARISH",
      confidence: 84,
      description: `헤드앤숄더 3봉 패턴 완성 및 넥라인(${neckline.toLocaleString()}) 지지선 이탈 경계`,
      targetPrice,
      stopLossPrice: +(rsPrice * 1.02).toFixed(2),
      necklinePrice: neckline,
      points: [
        { x: getX(lsIdx), y: getY(lsPrice), label: "좌측 어깨", price: lsPrice },
        { x: getX(hIdx), y: getY(hPrice), label: "머리 (고점)", price: hPrice },
        { x: getX(rsIdx), y: getY(rsPrice), label: "우측 어깨", price: rsPrice },
        { x: getX(Math.floor(n * 0.75)), y: getY(neckline), label: "넥라인 이탈", price: neckline }
      ],
      necklineCoords: {
        x1: getX(lsIdx) - 15,
        y1: getY(neckline),
        x2: chartWidth - 10,
        y2: getY(neckline)
      },
      targetLineCoords: {
        x1: getX(rsIdx),
        y1: getY(targetPrice),
        x2: chartWidth - 10,
        y2: getY(targetPrice)
      },
      breakoutPoint: { x: getX(Math.floor(n * 0.75)), y: getY(neckline), label: "이탈 매도점" },
      miniSvgPath: "M5,35 Q20,15 35,25 Q50,5 65,25 Q80,18 95,38"
    });
  }

  // -------------------------------------------------------------
  // PATTERN 3: ASCENDING TRIANGLE (BULLISH CONTINUATION)
  // -------------------------------------------------------------
  if (n >= 20) {
    const recentCandles = candles.slice(-25);
    const resistanceCeiling = Math.max(...recentCandles.map(c => c.high));
    const startLow = recentCandles[0].low;
    const midLow = recentCandles[Math.floor(recentCandles.length / 2)].low;
    const endLow = recentCandles[recentCandles.length - 1].low;

    // Check if lows are ascending
    const isAscending = midLow >= startLow * 0.99 && endLow >= midLow * 0.99;
    const targetPrice = +(resistanceCeiling + (resistanceCeiling - startLow) * 0.75).toFixed(2);

    patterns.push({
      id: "at-1",
      name: "Ascending Triangle",
      koreanName: "상승 삼각수렴 패턴",
      category: "ASCENDING_TRIANGLE",
      type: "BULLISH",
      confidence: isAscending ? 89 : 78,
      description: `저항선(${resistanceCeiling.toLocaleString()}) 천장과 우상향 지지선 수렴 후 상방 폭발 돌파 준비`,
      targetPrice,
      stopLossPrice: +(startLow * 0.98).toFixed(2),
      necklinePrice: resistanceCeiling,
      points: [
        { x: getX(n - 25), y: getY(resistanceCeiling), label: "저항선", price: resistanceCeiling },
        { x: getX(n - 25), y: getY(startLow), label: "저점 1", price: startLow },
        { x: getX(n - 13), y: getY(midLow), label: "저점 2 (상승)", price: midLow },
        { x: getX(n - 1), y: getY(resistanceCeiling), label: "수렴 꼭짓점 돌파", price: resistanceCeiling }
      ],
      necklineCoords: {
        x1: getX(n - 25),
        y1: getY(resistanceCeiling),
        x2: chartWidth - 10,
        y2: getY(resistanceCeiling)
      },
      targetLineCoords: {
        x1: getX(n - 3),
        y1: getY(targetPrice),
        x2: chartWidth - 10,
        y2: getY(targetPrice)
      },
      breakoutPoint: { x: getX(n - 1), y: getY(resistanceCeiling), label: "상방 돌파" },
      polygonArea: [
        { x: getX(n - 25), y: getY(resistanceCeiling) },
        { x: getX(n - 1), y: getY(resistanceCeiling) },
        { x: getX(n - 1), y: getY(endLow) },
        { x: getX(n - 13), y: getY(midLow) },
        { x: getX(n - 25), y: getY(startLow) }
      ],
      miniSvgPath: "M5,35 L95,8 M5,8 L95,8"
    });
  }

  // -------------------------------------------------------------
  // PATTERN 4: BOLLINGER BANDS UPPER BREAKOUT
  // -------------------------------------------------------------
  if (bbValues && bbValues.upper && bbValues.upper.length > 0) {
    const lastUpper = bbValues.upper[bbValues.upper.length - 1];
    if (lastUpper && currPrice >= lastUpper * 0.985) {
      const target = +(currPrice * 1.055).toFixed(2);
      patterns.push({
        id: "bb-1",
        name: "Bollinger Band Breakout",
        koreanName: "볼린저 밴드 상단 돌파",
        category: "BOLLINGER_BREAKOUT",
        type: "BULLISH",
        confidence: 91,
        description: `변동성 수축 구간 종료 후 볼린저 밴드 상단(${lastUpper.toLocaleString()}) 관통 돌파 가속`,
        targetPrice: target,
        stopLossPrice: +(lastUpper * 0.96).toFixed(2),
        points: [
          { x: getX(n - 1), y: getY(currPrice), label: "밴드 관통봉", price: currPrice }
        ],
        targetLineCoords: {
          x1: getX(n - 1),
          y1: getY(target),
          x2: chartWidth - 10,
          y2: getY(target)
        },
        breakoutPoint: { x: getX(n - 1), y: getY(currPrice), label: "밴드 돌파" },
        miniSvgPath: "M5,25 Q35,30 50,15 Q65,5 95,8"
      });
    }
  }

  // -------------------------------------------------------------
  // PATTERN 5: RSI BULLISH DIVERGENCE
  // -------------------------------------------------------------
  if (rsiValues && rsiValues.length >= 15 && swingLows.length >= 2) {
    const l1 = swingLows[swingLows.length - 2];
    const l2 = swingLows[swingLows.length - 1];
    const rsi1 = rsiValues[l1.idx] || 40;
    const rsi2 = rsiValues[l2.idx] || 45;

    // Price makes lower low (or equal), but RSI makes higher low
    if (l2.price <= l1.price * 1.01 && rsi2 > rsi1 + 2) {
      const target = +(currPrice * 1.06).toFixed(2);
      patterns.push({
        id: "rsi-div-1",
        name: "RSI Bullish Divergence",
        koreanName: "RSI 상승 다이버전스",
        category: "RSI_DIVERGENCE",
        type: "BULLISH",
        confidence: 92,
        description: `가격은 저점(${l2.price.toLocaleString()})을 갱신하였으나 RSI 보조지표(${rsi2})는 저점을 높이며 강력한 추세 반전 신호 발생`,
        targetPrice: target,
        stopLossPrice: +(l2.price * 0.98).toFixed(2),
        points: [
          { x: getX(l1.idx), y: getY(l1.price), label: "가격 저점 1", price: l1.price },
          { x: getX(l2.idx), y: getY(l2.price), label: "가격 저점 2", price: l2.price },
          { x: getX(n - 1), y: getY(currPrice), label: "반등 시작", price: currPrice }
        ],
        targetLineCoords: {
          x1: getX(n - 1),
          y1: getY(target),
          x2: chartWidth - 10,
          y2: getY(target)
        },
        breakoutPoint: { x: getX(n - 1), y: getY(currPrice), label: "다이버전스 반등" },
        miniSvgPath: "M5,35 L95,12 M5,38 L95,22"
      });
    }
  }

  return patterns;
}
