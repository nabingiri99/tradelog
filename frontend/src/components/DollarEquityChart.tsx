import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { Trade } from "../types/Trade";
import { cssVar } from "../lib/themeColors";

export interface DollarEquityChartProps {
  trades: Trade[];
}

interface CurvePoint {
  tradeNumber: number;
  cumulativePnl: number;
  date: string;
  pair: string;
  result: Trade["result"];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CurvePoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:shadow-xl">
      <p className="text-slate-500 dark:text-slate-400">
        #{p.tradeNumber} — {p.date}
      </p>
      <p className="mt-0.5 font-medium text-slate-900 dark:text-slate-200">
        {p.pair}
      </p>
      <p className="text-slate-500 dark:text-slate-400">
        Result: <span className="text-slate-900 dark:text-slate-100">{p.result}</span>
      </p>
      <p className="text-emerald-600 dark:text-emerald-400">
        Cumulative P&L: ${p.cumulativePnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export default function DollarEquityChart({ trades }: DollarEquityChartProps) {
  const data = useMemo(() => {
    const points: CurvePoint[] = [{ tradeNumber: 0, cumulativePnl: 0, date: "", pair: "Start", result: "Open" }];
    let running = 0;
    trades.forEach((trade, i) => {
      if (trade.pnlAmount != null) running += trade.pnlAmount;
      points.push({
        tradeNumber: i + 1,
        cumulativePnl: Math.round(running * 100) / 100,
        date: trade.date,
        pair: trade.pair,
        result: trade.result,
      });
    });
    return points;
  }, [trades]);

  const gridColor = cssVar("--tlog-chart-grid", "#cbd5e1");
  const axisColor = cssVar("--tlog-chart-axis", "#94a3b8");
  const tickColor = cssVar("--tlog-chart-tick", "#64748b");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/50">
      <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-300">
        Equity Curve ($ Cumulative P&L)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="tradeNumber"
            tick={{ fill: tickColor, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: axisColor }}
            label={{
              value: "Trade #",
              position: "insideBottomRight",
              offset: -5,
              style: { fill: tickColor, fontSize: 11 },
            }}
          />
          <YAxis
            tick={{ fill: tickColor, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: axisColor }}
            label={{
              value: "Cumulative $",
              angle: -90,
              position: "insideLeft",
              style: { fill: tickColor, fontSize: 11 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="cumulativePnl"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3, fill: "#10b981", stroke: "#059669", strokeWidth: 1 }}
            activeDot={{ r: 5, fill: "#10b981", stroke: "#059669", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
