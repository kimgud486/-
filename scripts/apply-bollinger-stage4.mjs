import { readFile, writeFile } from "node:fs/promises";

const file = "src/components/trading/RealTimeTradingViewChart.tsx";
let source = await readFile(file, "utf8");

function replaceOnce(label, pattern, replacement) {
  const before = source;
  source = source.replace(pattern, replacement);
  if (source === before) {
    throw new Error(`PATCH_POINT_NOT_FOUND: ${label}`);
  }
}

replaceOnce(
  "bollinger import",
  'import { IndicatorEngine } from "../../realtime/IndicatorEngine";',
  'import { IndicatorEngine } from "../../realtime/IndicatorEngine";\nimport { BollingerSqueezeEngine } from "../../realtime/BollingerSqueezeEngine";'
);

replaceOnce(
  "bollinger refs",
  '  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);\n',
  '  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);\n  const bollingerUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);\n  const bollingerMiddleSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);\n  const bollingerLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);\n'
);

replaceOnce(
  "bollinger state",
  '  const [indicatorSnapshot, setIndicatorSnapshot] = useState<IndicatorSnapshot | null>(null);\n',
  '  const [indicatorSnapshot, setIndicatorSnapshot] = useState<IndicatorSnapshot | null>(null);\n  const [bollingerSnapshot, setBollingerSnapshot] = useState<ReturnType<typeof BollingerSqueezeEngine.analyze> | null>(null);\n'
);

replaceOnce(
  "bollinger toggle state",
  '    vwap: true,\n    forecast: true,',
  '    vwap: true,\n    bollinger: true,\n    forecast: true,'
);

replaceOnce(
  "closed candle bollinger analyze",
  '    const indicators: IndicatorSnapshot = IndicatorEngine.calculate(candles);\n    setIndicatorSnapshot(indicators);\n    const structure = MarketStructureEngine.analyze(candles, indicators.vwap);',
  '    const indicators: IndicatorSnapshot = IndicatorEngine.calculate(candles);\n    setIndicatorSnapshot(indicators);\n    const bollinger = BollingerSqueezeEngine.analyze(candles);\n    setBollingerSnapshot(bollinger);\n    const structure = MarketStructureEngine.analyze(candles, indicators.vwap);'
);

replaceOnce(
  "closed candle band updates",
  '    if (rsiSeriesRef.current && Number.isFinite(indicators.rsi14)) {',
  '    if (bollingerUpperSeriesRef.current && Number.isFinite(bollinger.upper)) {\n      bollingerUpperSeriesRef.current.update({ time, value: bollinger.upper });\n    }\n    if (bollingerMiddleSeriesRef.current && Number.isFinite(bollinger.middle)) {\n      bollingerMiddleSeriesRef.current.update({ time, value: bollinger.middle });\n    }\n    if (bollingerLowerSeriesRef.current && Number.isFinite(bollinger.lower)) {\n      bollingerLowerSeriesRef.current.update({ time, value: bollinger.lower });\n    }\n    if (rsiSeriesRef.current && Number.isFinite(indicators.rsi14)) {'
);

replaceOnce(
  "create bollinger chart series",
  '    vwapSeriesRef.current = vwapSeries;\n\n    const initialIndicators = IndicatorEngine.calculate(historyRef.current);',
  '    vwapSeriesRef.current = vwapSeries;\n\n    const bollingerUpperSeries = chart.addSeries(LineSeries, {\n      color: "#60a5fa",\n      lineWidth: 1,\n      lineStyle: LineStyle.Dashed,\n      title: "BB Upper"\n    });\n    bollingerUpperSeriesRef.current = bollingerUpperSeries;\n\n    const bollingerMiddleSeries = chart.addSeries(LineSeries, {\n      color: "#818cf8",\n      lineWidth: 1,\n      lineStyle: LineStyle.Dotted,\n      title: "BB 20"\n    });\n    bollingerMiddleSeriesRef.current = bollingerMiddleSeries;\n\n    const bollingerLowerSeries = chart.addSeries(LineSeries, {\n      color: "#60a5fa",\n      lineWidth: 1,\n      lineStyle: LineStyle.Dashed,\n      title: "BB Lower"\n    });\n    bollingerLowerSeriesRef.current = bollingerLowerSeries;\n\n    const initialIndicators = IndicatorEngine.calculate(historyRef.current);'
);

replaceOnce(
  "initial bollinger snapshot",
  '    const initialIndicators = IndicatorEngine.calculate(historyRef.current);\n    setIndicatorSnapshot(initialIndicators);',
  '    const initialIndicators = IndicatorEngine.calculate(historyRef.current);\n    setIndicatorSnapshot(initialIndicators);\n    const initialBollinger = BollingerSqueezeEngine.analyze(historyRef.current);\n    setBollingerSnapshot(initialBollinger);'
);

replaceOnce(
  "initial bollinger values",
  '    const vwapValues = IndicatorEngine.calculateSessionVWAPSeries(historyRef.current);',
  '    const vwapValues = IndicatorEngine.calculateSessionVWAPSeries(historyRef.current);\n    const bollingerValues = BollingerSqueezeEngine.calculateSeries(initialCloses);'
);

replaceOnce(
  "initial bollinger data",
  '    const forecastSeries = chart.addSeries(LineSeries, {',
  '    bollingerUpperSeries.setData(\n      historyRef.current\n        .map((c, idx) => ({ time: c.time as Time, value: bollingerValues[idx]?.upper }))\n        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)\n    );\n    bollingerMiddleSeries.setData(\n      historyRef.current\n        .map((c, idx) => ({ time: c.time as Time, value: bollingerValues[idx]?.middle }))\n        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)\n    );\n    bollingerLowerSeries.setData(\n      historyRef.current\n        .map((c, idx) => ({ time: c.time as Time, value: bollingerValues[idx]?.lower }))\n        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)\n    );\n\n    const forecastSeries = chart.addSeries(LineSeries, {'
);

replaceOnce(
  "preview bollinger analyze",
  '        const preview = IndicatorEngine.calculate(previewCandles);\n        setIndicatorSnapshot(preview);',
  '        const preview = IndicatorEngine.calculate(previewCandles);\n        setIndicatorSnapshot(preview);\n        const previewBollinger = BollingerSqueezeEngine.analyze(previewCandles);\n        setBollingerSnapshot(previewBollinger);'
);

replaceOnce(
  "preview bollinger updates",
  '        if (Number.isFinite(preview.rsi14)) rsiSeriesRef.current?.update({ time, value: preview.rsi14 });',
  '        if (Number.isFinite(previewBollinger.upper)) bollingerUpperSeriesRef.current?.update({ time, value: previewBollinger.upper });\n        if (Number.isFinite(previewBollinger.middle)) bollingerMiddleSeriesRef.current?.update({ time, value: previewBollinger.middle });\n        if (Number.isFinite(previewBollinger.lower)) bollingerLowerSeriesRef.current?.update({ time, value: previewBollinger.lower });\n        if (Number.isFinite(preview.rsi14)) rsiSeriesRef.current?.update({ time, value: preview.rsi14 });'
);

replaceOnce(
  "bollinger cleanup",
  '      vwapSeriesRef.current = null;\n',
  '      vwapSeriesRef.current = null;\n      bollingerUpperSeriesRef.current = null;\n      bollingerMiddleSeriesRef.current = null;\n      bollingerLowerSeriesRef.current = null;\n'
);

replaceOnce(
  "bollinger visibility",
  '    vwapSeriesRef.current?.applyOptions({ visible: activeIndicators.vwap });\n',
  '    vwapSeriesRef.current?.applyOptions({ visible: activeIndicators.vwap });\n    bollingerUpperSeriesRef.current?.applyOptions({ visible: activeIndicators.bollinger });\n    bollingerMiddleSeriesRef.current?.applyOptions({ visible: activeIndicators.bollinger });\n    bollingerLowerSeriesRef.current?.applyOptions({ visible: activeIndicators.bollinger });\n'
);

replaceOnce(
  "bollinger derived status",
  '  const lowerPaneCount = [activeIndicators.rsi, activeIndicators.macd, activeIndicators.atr].filter(Boolean).length;',
  '  const bollingerStatus = !bollingerSnapshot || !Number.isFinite(bollingerSnapshot.bandwidthPct)\n    ? "계산 대기"\n    : bollingerSnapshot.squeezeRelease\n      ? bollingerSnapshot.direction === "UP"\n        ? "스퀴즈 해제 + 위 돌파 🚀"\n        : "스퀴즈 해제 + 아래 이탈 ⚠️"\n      : bollingerSnapshot.squeeze\n        ? "밴드 압축 · 큰 움직임 준비"\n        : bollingerSnapshot.direction === "UP"\n          ? bollingerSnapshot.breakoutConfirmed ? "상단 돌파 확인" : "상단 돌파 진행 중"\n          : bollingerSnapshot.direction === "DOWN"\n            ? bollingerSnapshot.breakoutConfirmed ? "하단 이탈 확인" : "하단 이탈 진행 중"\n            : "밴드 안에서 움직이는 중";\n  const lowerPaneCount = [activeIndicators.rsi, activeIndicators.macd, activeIndicators.atr].filter(Boolean).length;'
);

replaceOnce(
  "hud grid columns",
  '        <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-7 gap-1.5 text-[10px] font-mono">',
  '        <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-1.5 text-[10px] font-mono">'
);

replaceOnce(
  "bollinger hud card",
  '          <div className={`rounded-lg border px-2 py-1.5 ${currentRvol !== null && currentRvol >= 2 ? "border-orange-500/70 bg-orange-950/40" : "border-slate-700 bg-slate-900/60"}`}>',
  '          <div className={`rounded-lg border px-2 py-1.5 ${bollingerSnapshot?.squeezeRelease ? "border-fuchsia-500/70 bg-fuchsia-950/40" : bollingerSnapshot?.squeeze ? "border-indigo-500/70 bg-indigo-950/40" : "border-blue-800/60 bg-blue-950/20"}`}>\n            <div className="text-slate-400">Bollinger · 폭/돌파</div>\n            <div className="font-black text-blue-300">{bollingerSnapshot && Number.isFinite(bollingerSnapshot.bandwidthPct) ? `${bollingerSnapshot.bandwidthPct.toFixed(2)}%` : "계산 중"}</div>\n            <div className="text-[9px] text-slate-400">{bollingerStatus}</div>\n          </div>\n          <div className={`rounded-lg border px-2 py-1.5 ${currentRvol !== null && currentRvol >= 2 ? "border-orange-500/70 bg-orange-950/40" : "border-slate-700 bg-slate-900/60"}`}>'
);

replaceOnce(
  "bollinger toolbar button",
  '          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, vwap: !prev.vwap }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.vwap ? "bg-purple-950/70 border-purple-600 text-purple-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>VWAP</button>\n',
  '          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, vwap: !prev.vwap }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.vwap ? "bg-purple-950/70 border-purple-600 text-purple-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>VWAP</button>\n          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, bollinger: !prev.bollinger }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.bollinger ? "bg-blue-950/70 border-blue-600 text-blue-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>Bollinger</button>\n'
);

replaceOnce(
  "bollinger legend",
  '        {activeIndicators.rsi && <span>RSI <strong className="text-sky-300">70 과열 · 50 중립 · 30 과매도</strong></span>}',
  '        {activeIndicators.bollinger && <span>BB <strong className="text-blue-300">위/가운데/아래 밴드 · 좁아지면 스퀴즈</strong></span>}\n        {activeIndicators.rsi && <span>RSI <strong className="text-sky-300">70 과열 · 50 중립 · 30 과매도</strong></span>}'
);

replaceOnce(
  "chart bollinger badge",
  '        {isTimeframeLoading && (',
  '        {activeIndicators.bollinger && bollingerSnapshot && Number.isFinite(bollingerSnapshot.bandwidthPct) && (\n          <div className={`absolute top-2 left-2 z-20 rounded-md border px-2 py-1 text-[10px] font-mono font-bold ${bollingerSnapshot.squeezeRelease ? "border-fuchsia-500/70 bg-fuchsia-950/90 text-fuchsia-200" : bollingerSnapshot.squeeze ? "border-indigo-500/70 bg-indigo-950/90 text-indigo-200" : bollingerSnapshot.direction === "UP" ? "border-emerald-500/70 bg-emerald-950/90 text-emerald-200" : bollingerSnapshot.direction === "DOWN" ? "border-rose-500/70 bg-rose-950/90 text-rose-200" : "border-blue-700/60 bg-slate-950/90 text-blue-200"}`}>\n            BB {bollingerSnapshot.bandwidthPct.toFixed(2)}% · {bollingerStatus}\n          </div>\n        )}\n        {isTimeframeLoading && ('
);

await writeFile(file, source, "utf8");
console.log("Stage 4 Bollinger chart patch applied successfully.");
