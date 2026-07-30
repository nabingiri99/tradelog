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

export interface EquityCurveChartProps {
  trades: Trade[];
}

interface CurvePoint {
  tradeNumber: number;
  cumulativeR: number;
  date: string;
  pair: string;
  result: Trade["result"];
}

function rContribution(trade: Trade): number {
  if (trade.result === "Win") return trade.rr;
  if (trade.result === "Loss") return -1;
  return 0;
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
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400">
        #{p.tradeNumber} — {p.date}
      </p>
      <p className="mt-0.5 font-medium text-slate-200">{p.pair}</p>
      <p className="text-slate-400">
        Result: <span className="text-slate-100">{p.result}</span>
      </p>
      <p className="text-violet-400">
        Cumulative R: {p.cumulativeR.toFixed(2)}
      </p>
    </div>
  );
}

export default function EquityCurveChart({ trades }: EquityCurveChartProps) {
  const data = useMemo(() => {
    const points: CurvePoint[] = [{ tradeNumber: 0, cumulativeR: 0, date: "", pair: "Start", result: "Open" }];
    let runningR = 0;
    trades.forEach((trade, i) => {
      runningR += rContribution(trade);
      points.push({
        tradeNumber: i + 1,
        cumulativeR: Math.round(runningR * 100) / 100,
        date: trade.date,
        pair: trade.pair,
        result: trade.result,
      });
    });
    return points;
  }, [trades]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-300">
        Equity Curve (Cumulative R)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="tradeNumber"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#334155" }}
            label={{
              value: "Trade #",
              position: "insideBottomRight",
              offset: -5,
              style: { fill: "#64748b", fontSize: 11 },
            }}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#334155" }}
            label={{
              value: "Cumulative R",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#64748b", fontSize: 11 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="cumulativeR"
            stroke="#818cf8"
            strokeWidth={2}
            dot={{ r: 3, fill: "#818cf8", stroke: "#6366f1", strokeWidth: 1 }}
            activeDot={{ r: 5, fill: "#818cf8", stroke: "#6366f1", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
