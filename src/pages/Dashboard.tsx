import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  Target,
  DollarSign,
  PlusCircle,
  LineChart,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import StatCard from "../components/StatCard";
import EquityCurveChart from "../components/EquityCurveChart";
import { getTrades } from "../lib/storage";
import type { SessionType } from "../types/Trade";

const SESSION_LABELS: Record<SessionType, string> = {
  London: "London",
  NewYork: "New York",
  Overlap: "Overlap",
  Other: "Other",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [trades] = useState(() => getTrades());

  const stats = useMemo(() => {
    const total = trades.length;
    const closed = trades.filter((t) => t.result !== "Open");
    const wins = closed.filter((t) => t.result === "Win");
    const losses = closed.filter((t) => t.result === "Loss");
    const breaks = closed.filter((t) => t.result === "BreakEven");

    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;

    const totalR = closed.reduce((sum, t) => {
      if (t.result === "Win") return sum + t.rr;
      if (t.result === "Loss") return sum - 1;
      return sum;
    }, 0);

    const avgR =
      wins.length + losses.length > 0
        ? totalR / (wins.length + losses.length)
        : 0;

    return { total, closed: closed.length, wins: wins.length, losses: losses.length, breaks: breaks.length, winRate, totalR, avgR };
  }, [trades]);

  const sessionData = useMemo(() => {
    const sessions: SessionType[] = ["London", "NewYork", "Overlap", "Other"];
    return sessions.map((s) => {
      const sessionTrades = trades.filter((t) => t.session === s);
      const wins = sessionTrades.filter((t) => t.result === "Win").length;
      const losses = sessionTrades.filter((t) => t.result === "Loss").length;
      return {
        session: SESSION_LABELS[s],
        Wins: wins,
        Losses: losses,
      };
    });
  }, [trades]);

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-20">
        <LineChart className="mb-4 h-14 w-14 text-slate-600" />
        <h2 className="text-xl font-semibold text-slate-300">
          Welcome to TradeLog
        </h2>
        <p className="mt-2 max-w-md text-center text-sm text-slate-500">
          Your analytics dashboard will populate as you log trades. Start by
          recording your first trade to see win rates, equity curves, and
          session breakdowns.
        </p>
        <button
          type="button"
          onClick={() => navigate("/add")}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <PlusCircle className="h-4 w-4" />
          Log Your First Trade
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Overview of your trading performance
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Win Rate"
          value={
            stats.closed > 0 ? `${stats.winRate.toFixed(1)}%` : "—"
          }
          icon={<BarChart3 className="h-4 w-4" />}
          subtext={`${stats.wins}W / ${stats.losses}L / ${stats.breaks}BE`}
          trend={
            stats.winRate >= 50 ? "up" : stats.winRate > 0 ? "down" : null
          }
        />
        <StatCard
          title="Average R:R"
          value={stats.closed > 0 ? `${stats.avgR.toFixed(2)}R` : "—"}
          icon={<TrendingUp className="h-4 w-4" />}
          subtext="Per closed trade"
          trend={
            stats.avgR > 0 ? "up" : stats.avgR < 0 ? "down" : null
          }
        />
        <StatCard
          title="Total Trades Logged"
          value={String(stats.total)}
          icon={<Target className="h-4 w-4" />}
          subtext={`${stats.closed} closed, ${stats.total - stats.closed} open`}
        />
        <StatCard
          title="Net Cumulative Profit"
          value={
            stats.totalR >= 0
              ? `+${stats.totalR.toFixed(2)}R`
              : `${stats.totalR.toFixed(2)}R`
          }
          icon={<DollarSign className="h-4 w-4" />}
          subtext="Total R multiple accumulated"
          trend={
            stats.totalR > 0 ? "up" : stats.totalR < 0 ? "down" : null
          }
        />
      </div>

      {/* Charts */}
      <div className="space-y-6">
        <EquityCurveChart trades={trades} />

        {/* Session Breakdown Bar Chart */}
        <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-300">
            Win / Loss by Session
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={sessionData}
              margin={{ top: 5, right: 12, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="session"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#e2e8f0",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
              />
              <Bar
                dataKey="Wins"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="Losses"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
