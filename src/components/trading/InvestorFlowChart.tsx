import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from "recharts";

interface FlowPoint {
  time: string;
  foreign: number; // 외국인 (억원)
  institution: number; // 기관 (억원)
  retail: number; // 개인 (억원)
}

const SAMPLE_FLOW_DATA: FlowPoint[] = [
  { time: "09:00", foreign: 0, institution: 0, retail: 0 },
  { time: "09:30", foreign: 420, institution: 180, retail: -600 },
  { time: "10:00", foreign: 980, institution: 350, retail: -1330 },
  { time: "10:30", foreign: 1420, institution: 520, retail: -1940 },
  { time: "11:00", foreign: 1850, institution: 710, retail: -2560 },
  { time: "11:30", foreign: 2100, institution: 840, retail: -2940 },
  { time: "12:00", foreign: 2280, institution: 910, retail: -3190 },
  { time: "12:30", foreign: 2390, institution: 960, retail: -3350 },
  { time: "13:00", foreign: 2480, institution: 1040, retail: -3520 },
  { time: "13:30", foreign: 2610, institution: 1120, retail: -3730 },
  { time: "14:00", foreign: 2720, institution: 1190, retail: -3910 },
  { time: "14:30", foreign: 2810, institution: 1220, retail: -4030 },
  { time: "15:00", foreign: 2854, institution: 1247, retail: -4101 }
];

export const InvestorFlowChart: React.FC = () => {
  const [data] = useState<FlowPoint[]>(SAMPLE_FLOW_DATA);

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-slate-800 tracking-tight">INVESTOR FLOW</span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">(단위: 억원)</span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-1.5 pb-2 mb-2 border-b border-slate-100 font-mono text-xs">
        <div className="bg-emerald-50/60 rounded-lg p-1.5 border border-emerald-100">
          <div className="text-[10px] text-slate-500 font-sans font-medium">외국인</div>
          <div className="text-xs font-black text-emerald-600">+2,854억</div>
        </div>
        <div className="bg-sky-50/60 rounded-lg p-1.5 border border-sky-100">
          <div className="text-[10px] text-slate-500 font-sans font-medium">기관</div>
          <div className="text-xs font-black text-sky-600">+1,247억</div>
        </div>
        <div className="bg-rose-50/60 rounded-lg p-1.5 border border-rose-100">
          <div className="text-[10px] text-slate-500 font-sans font-medium">개인</div>
          <div className="text-xs font-black text-rose-600">-4,101억</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] font-sans font-semibold mb-1 text-slate-500">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-emerald-500 rounded-full inline-block"></span>
          <span>외국인</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-sky-500 rounded-full inline-block"></span>
          <span>기관</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-rose-400 rounded-full inline-block"></span>
          <span>개인</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: "#94A3B8", fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
            />
            <YAxis
              tick={{ fill: "#94A3B8", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
              domain={[-4500, 3500]}
            />
            <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} strokeDasharray="3 3" />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 text-white p-2 rounded-lg text-[10px] font-mono shadow-lg border border-slate-700">
                      <div className="text-slate-400 mb-1">{label} 기준 수급</div>
                      <div className="text-emerald-400">외국인: +{payload[0]?.value}억</div>
                      <div className="text-sky-400">기관: +{payload[1]?.value}억</div>
                      <div className="text-rose-400">개인: {payload[2]?.value}억</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="foreign"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="institution"
              stroke="#0EA5E9"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="retail"
              stroke="#FB7185"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
