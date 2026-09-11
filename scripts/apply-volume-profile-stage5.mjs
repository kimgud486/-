import { readFile, writeFile } from "node:fs/promises";

const file = "src/components/trading/RealTimeTradingViewChart.tsx";
let source = await readFile(file, "utf8");

function replaceOnce(label, pattern, replacement) {
  const before = source;
  source = source.replace(pattern, replacement);
  if (source === before) throw new Error(`PATCH_POINT_NOT_FOUND: ${label}`);
}

replaceOnce(
  "volume profile import",
  'import { BollingerSqueezeEngine } from "../../realtime/BollingerSqueezeEngine";',
  'import { BollingerSqueezeEngine } from "../../realtime/BollingerSqueezeEngine";\nimport { LiveVolumeProfileAccumulator, VolumeProfileEngine, type VolumeProfileSnapshot } from "../../realtime/VolumeProfileEngine";'
);

replaceOnce(
  "volume profile series refs",
  '  const bollingerLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);\n  const forecastSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);',
  '  const bollingerLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);\n  const volumeProfilePocSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);\n  const volumeProfileVahSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);\n  const volumeProfileValSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);\n  const forecastSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);'
);

replaceOnce(
  "volume profile state",
  '  const [bollingerSnapshot, setBollingerSnapshot] = useState<ReturnType<typeof BollingerSqueezeEngine.analyze> | null>(null);\n  const [lastTickTimeStr, setLastTickTimeStr] = useState<string>("");',
  '  const [bollingerSnapshot, setBollingerSnapshot] = useState<ReturnType<typeof BollingerSqueezeEngine.analyze> | null>(null);\n  const [volumeProfileSnapshot, setVolumeProfileSnapshot] = useState<VolumeProfileSnapshot | null>(null);\n  const [lastTickTimeStr, setLastTickTimeStr] = useState<string>("");'
);

replaceOnce(
  "volume profile toggle state",
  '    vwap: true,\n    bollinger: true,\n    forecast: true,',
  '    vwap: true,\n    bollinger: true,\n    volumeProfile: true,\n    forecast: true,'
);

replaceOnce(
  "volume profile accumulator",
  '  const timeframeRequestRef = useRef<number>(0);\n  const lastIndicatorPreviewAtRef = useRef<number>(0);',
  '  const timeframeRequestRef = useRef<number>(0);\n  const lastIndicatorPreviewAtRef = useRef<number>(0);\n  const volumeProfileAccumulatorRef = useRef(new LiveVolumeProfileAccumulator());'
);

replaceOnce(
  "volume profile symbol reset",
  '  }, [timeframe, symbol]);\n\n  useEffect(() => {\n    let active = true;',
  '  }, [timeframe, symbol]);\n\n  useEffect(() => {\n    volumeProfileAccumulatorRef.current.reset();\n    setVolumeProfileSnapshot(null);\n  }, [symbol]);\n\n  useEffect(() => {\n    let active = true;'
);

replaceOnce(
  "volume profile line series",
  '    const bollingerLowerSeries = chart.addSeries(LineSeries, {\n      color: "#60a5fa",\n      lineWidth: 1,\n      lineStyle: LineStyle.Dashed,\n      title: "BB Lower"\n    });\n    bollingerLowerSeriesRef.current = bollingerLowerSeries;\n\n    const initialIndicators = IndicatorEngine.calculate(historyRef.current);',
  '    const bollingerLowerSeries = chart.addSeries(LineSeries, {\n      color: "#60a5fa",\n      lineWidth: 1,\n      lineStyle: LineStyle.Dashed,\n      title: "BB Lower"\n    });\n    bollingerLowerSeriesRef.current = bollingerLowerSeries;\n\n    const volumeProfilePocSeries = chart.addSeries(LineSeries, {\n      color: "#facc15",\n      lineWidth: 2,\n      lineStyle: LineStyle.Solid,\n      title: "POC · 거래 최다 가격",\n      priceLineVisible: false\n    });\n    volumeProfilePocSeriesRef.current = volumeProfilePocSeries;\n\n    const volumeProfileVahSeries = chart.addSeries(LineSeries, {\n      color: "#34d399",\n      lineWidth: 1,\n      lineStyle: LineStyle.Dashed,\n      title: "VAH · 핵심구역 위",\n      priceLineVisible: false\n    });\n    volumeProfileVahSeriesRef.current = volumeProfileVahSeries;\n\n    const volumeProfileValSeries = chart.addSeries(LineSeries, {\n      color: "#fb7185",\n      lineWidth: 1,\n      lineStyle: LineStyle.Dashed,\n      title: "VAL · 핵심구역 아래",\n      priceLineVisible: false\n    });\n    volumeProfileValSeriesRef.current = volumeProfileValSeries;\n\n    const initialIndicators = IndicatorEngine.calculate(historyRef.current);'
);

replaceOnce(
  "initial volume profile snapshot",
  '    const initialBollinger = BollingerSqueezeEngine.analyze(historyRef.current);\n    setBollingerSnapshot(initialBollinger);\n\n    const initialCloses = historyRef.current.map(c => c.close);',
  '    const initialBollinger = BollingerSqueezeEngine.analyze(historyRef.current);\n    setBollingerSnapshot(initialBollinger);\n    const initialVolumeProfile = VolumeProfileEngine.estimateFromCandles(historyRef.current, 48, 0.7);\n    setVolumeProfileSnapshot(initialVolumeProfile);\n\n    const initialCloses = historyRef.current.map(c => c.close);'
);

replaceOnce(
  "volume profile initial guide data",
  '    bollingerLowerSeries.setData(\n      historyRef.current\n        .map((c, idx) => ({ time: c.time as Time, value: bollingerValues[idx]?.lower }))\n        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)\n    );\n\n    const forecastSeries = chart.addSeries(LineSeries, {',
  '    bollingerLowerSeries.setData(\n      historyRef.current\n        .map((c, idx) => ({ time: c.time as Time, value: bollingerValues[idx]?.lower }))\n        .filter((p): p is { time: Time; value: number } => Number.isFinite(p.value) && p.value > 0)\n    );\n\n    const profileGuideData = (value: number, endTime?: Time) => {\n      if (!Number.isFinite(value) || value <= 0) return [] as Array<{ time: Time; value: number }>;\n      const first = historyRef.current[0]?.time as Time | undefined;\n      const lastCandle = historyRef.current[historyRef.current.length - 1];\n      const last = endTime ?? (lastCandle?.time as Time | undefined);\n      if (first === undefined && last === undefined) return [] as Array<{ time: Time; value: number }>;\n      if (first === undefined || last === undefined || first === last) {\n        const onlyTime = (last ?? first) as Time;\n        return [{ time: onlyTime, value }];\n      }\n      return [{ time: first, value }, { time: last, value }];\n    };\n\n    volumeProfilePocSeries.setData(profileGuideData(initialVolumeProfile.poc));\n    volumeProfileVahSeries.setData(profileGuideData(initialVolumeProfile.vah));\n    volumeProfileValSeries.setData(profileGuideData(initialVolumeProfile.val));\n\n    const forecastSeries = chart.addSeries(LineSeries, {'
);

replaceOnce(
  "accumulate live ticks",
  '      setCurrentPrice(tick.price);\n      setLastTickTimeStr(new Date(tick.timestamp).toLocaleTimeString());\n\n      const normalizedMarket = market === "UPBIT" || market === "CRYPTO" ? "CRYPTO" : market;',
  '      setCurrentPrice(tick.price);\n      setLastTickTimeStr(new Date(tick.timestamp).toLocaleTimeString());\n      volumeProfileAccumulatorRef.current.addTick(tick);\n\n      const normalizedMarket = market === "UPBIT" || market === "CRYPTO" ? "CRYPTO" : market;'
);

replaceOnce(
  "live volume profile update",
  '        const previewBollinger = BollingerSqueezeEngine.analyze(previewCandles);\n        setBollingerSnapshot(previewBollinger);\n\n        if (Number.isFinite(preview.ema9)',
  '        const previewBollinger = BollingerSqueezeEngine.analyze(previewCandles);\n        setBollingerSnapshot(previewBollinger);\n        const liveVolumeProfile = volumeProfileAccumulatorRef.current.snapshot(0.7);\n        if (liveVolumeProfile.sampleCount > 0) {\n          setVolumeProfileSnapshot(liveVolumeProfile);\n          volumeProfilePocSeriesRef.current?.setData(profileGuideData(liveVolumeProfile.poc, time));\n          volumeProfileVahSeriesRef.current?.setData(profileGuideData(liveVolumeProfile.vah, time));\n          volumeProfileValSeriesRef.current?.setData(profileGuideData(liveVolumeProfile.val, time));\n        }\n\n        if (Number.isFinite(preview.ema9)'
);

replaceOnce(
  "volume profile cleanup",
  '      bollingerUpperSeriesRef.current = null;\n      bollingerMiddleSeriesRef.current = null;\n      bollingerLowerSeriesRef.current = null;\n      forecastSeriesRef.current = null;',
  '      bollingerUpperSeriesRef.current = null;\n      bollingerMiddleSeriesRef.current = null;\n      bollingerLowerSeriesRef.current = null;\n      volumeProfilePocSeriesRef.current = null;\n      volumeProfileVahSeriesRef.current = null;\n      volumeProfileValSeriesRef.current = null;\n      forecastSeriesRef.current = null;'
);

replaceOnce(
  "volume profile visibility",
  '    bollingerUpperSeriesRef.current?.applyOptions({ visible: activeIndicators.bollinger });\n    bollingerMiddleSeriesRef.current?.applyOptions({ visible: activeIndicators.bollinger });\n    bollingerLowerSeriesRef.current?.applyOptions({ visible: activeIndicators.bollinger });\n    forecastSeriesRef.current?.applyOptions({ visible: activeIndicators.forecast });',
  '    bollingerUpperSeriesRef.current?.applyOptions({ visible: activeIndicators.bollinger });\n    bollingerMiddleSeriesRef.current?.applyOptions({ visible: activeIndicators.bollinger });\n    bollingerLowerSeriesRef.current?.applyOptions({ visible: activeIndicators.bollinger });\n    volumeProfilePocSeriesRef.current?.applyOptions({ visible: activeIndicators.volumeProfile });\n    volumeProfileVahSeriesRef.current?.applyOptions({ visible: activeIndicators.volumeProfile });\n    volumeProfileValSeriesRef.current?.applyOptions({ visible: activeIndicators.volumeProfile });\n    forecastSeriesRef.current?.applyOptions({ visible: activeIndicators.forecast });'
);

replaceOnce(
  "volume profile status helpers",
  '  const lowerPaneCount = [activeIndicators.rsi, activeIndicators.macd, activeIndicators.atr].filter(Boolean).length;\n  const chartHeight = 500 + lowerPaneCount * 105;',
  '  const volumeProfileQualityText = !volumeProfileSnapshot\n    ? "계산 대기"\n    : volumeProfileSnapshot.quality === "LIVE_TICK_PARTIAL"\n      ? `실시간 체결 · 연결 후 ${volumeProfileSnapshot.sampleCount}건`\n      : volumeProfileSnapshot.quality === "OHLCV_ESTIMATED"\n        ? "과거 봉으로 추정 · 정확한 가격별 체결 아님"\n        : "계산 대기";\n  const volumeProfilePosition = !volumeProfileSnapshot || !Number.isFinite(volumeProfileSnapshot.vah) || !Number.isFinite(volumeProfileSnapshot.val)\n    ? "계산 대기"\n    : currentPrice > volumeProfileSnapshot.vah\n      ? "핵심 거래구역 위쪽"\n      : currentPrice < volumeProfileSnapshot.val\n        ? "핵심 거래구역 아래쪽"\n        : "핵심 거래구역 안쪽";\n  const maxProfileTopVolume = volumeProfileSnapshot?.topLevels[0]?.volume ?? 1;\n  const lowerPaneCount = [activeIndicators.rsi, activeIndicators.macd, activeIndicators.atr].filter(Boolean).length;\n  const chartHeight = 500 + lowerPaneCount * 105;'
);

replaceOnce(
  "volume profile hud grid",
  '        <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-1.5 text-[10px] font-mono">',
  '        <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-9 gap-1.5 text-[10px] font-mono">'
);

replaceOnce(
  "volume profile hud card",
  '          <div className={`rounded-lg border px-2 py-1.5 ${currentRvol !== null && currentRvol >= 2 ? "border-orange-500/70 bg-orange-950/40" : "border-slate-700 bg-slate-900/60"}`}>\n            <div className="text-slate-400">RVOL · 평소보다 거래량</div>',
  '          <div className="rounded-lg border border-yellow-700/50 bg-yellow-950/20 px-2 py-1.5">\n            <div className="text-slate-400">가격별 거래량 · POC</div>\n            <div className="font-black text-yellow-300">{volumeProfileSnapshot && Number.isFinite(volumeProfileSnapshot.poc) ? formatDisplayPrice(volumeProfileSnapshot.poc) : "계산 중"}</div>\n            <div className="text-[9px] text-slate-400">{volumeProfilePosition}</div>\n          </div>\n          <div className={`rounded-lg border px-2 py-1.5 ${currentRvol !== null && currentRvol >= 2 ? "border-orange-500/70 bg-orange-950/40" : "border-slate-700 bg-slate-900/60"}`}>\n            <div className="text-slate-400">RVOL · 평소보다 거래량</div>'
);

replaceOnce(
  "volume profile toggle button",
  '          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, bollinger: !prev.bollinger }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.bollinger ? "bg-blue-950/70 border-blue-600 text-blue-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>Bollinger</button>\n          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, volume: !prev.volume }))}',
  '          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, bollinger: !prev.bollinger }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.bollinger ? "bg-blue-950/70 border-blue-600 text-blue-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>Bollinger</button>\n          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, volumeProfile: !prev.volumeProfile }))} className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${activeIndicators.volumeProfile ? "bg-yellow-950/70 border-yellow-600 text-yellow-300" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>가격별거래량</button>\n          <button type="button" onClick={() => setActiveIndicators(prev => ({ ...prev, volume: !prev.volume }))}'
);

replaceOnce(
  "volume profile legend",
  '        {activeIndicators.bollinger && <span>BB <strong className="text-blue-300">위/가운데/아래 밴드 · 좁아지면 스퀴즈</strong></span>}\n        {activeIndicators.rsi && <span>RSI',
  '        {activeIndicators.bollinger && <span>BB <strong className="text-blue-300">위/가운데/아래 밴드 · 좁아지면 스퀴즈</strong></span>}\n        {activeIndicators.volumeProfile && <span>가격별거래량 <strong className="text-yellow-300">POC=제일 많이 거래 · VAH/VAL=핵심 구역 위/아래</strong></span>}\n        {activeIndicators.rsi && <span>RSI'
);

replaceOnce(
  "volume profile overlay",
  '        {isTimeframeLoading && (\n          <div className="absolute top-2 right-2 z-20 rounded-md border border-cyan-700/60 bg-slate-950/90 px-2 py-1 text-[10px] font-mono font-bold text-cyan-300">',
  '        {activeIndicators.volumeProfile && volumeProfileSnapshot && Number.isFinite(volumeProfileSnapshot.poc) && (\n          <div className="absolute top-10 right-2 z-20 w-48 rounded-lg border border-yellow-700/60 bg-slate-950/90 p-2 text-[9px] font-mono shadow-xl">\n            <div className="mb-1 flex items-center justify-between">\n              <strong className="text-yellow-300">가격별 거래량 지도</strong>\n              <span className="text-slate-500">TOP 5</span>\n            </div>\n            <div className="mb-1 grid grid-cols-3 gap-1 text-center">\n              <div><span className="text-slate-500">POC</span><div className="font-bold text-yellow-300">{formatDisplayPrice(volumeProfileSnapshot.poc)}</div></div>\n              <div><span className="text-slate-500">VAH</span><div className="font-bold text-emerald-300">{formatDisplayPrice(volumeProfileSnapshot.vah)}</div></div>\n              <div><span className="text-slate-500">VAL</span><div className="font-bold text-rose-300">{formatDisplayPrice(volumeProfileSnapshot.val)}</div></div>\n            </div>\n            <div className="space-y-1">\n              {volumeProfileSnapshot.topLevels.slice(0, 5).map(level => (\n                <div key={level.price} className="grid grid-cols-[62px_1fr_32px] items-center gap-1">\n                  <span className="text-slate-300 text-right">{formatDisplayPrice(level.price)}</span>\n                  <div className="h-1.5 overflow-hidden rounded bg-slate-800">\n                    <div className="h-full rounded bg-yellow-400/70" style={{ width: `${Math.max(6, Math.min(100, (level.volume / maxProfileTopVolume) * 100))}%` }} />\n                  </div>\n                  <span className="text-slate-500 text-right">{level.volumePct.toFixed(0)}%</span>\n                </div>\n              ))}\n            </div>\n            <div className="mt-1 border-t border-slate-800 pt-1 text-slate-500">{volumeProfileQualityText}</div>\n          </div>\n        )}\n        {isTimeframeLoading && (\n          <div className="absolute top-2 right-2 z-20 rounded-md border border-cyan-700/60 bg-slate-950/90 px-2 py-1 text-[10px] font-mono font-bold text-cyan-300">'
);

await writeFile(file, source, "utf8");
console.log("Stage 5 volume profile patch applied safely.");
