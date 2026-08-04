import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  Target,
  DollarSign,
  PlusCircle,
  LineChart,
  Trophy,
  AlertOctagon,
  Percent,
  Gauge,
  TrendingDown,
  Flame,
  Crown,
  Skull,
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
import { cssVar } from "../lib/themeColors";
import { useTrades } from "../lib/TradeContext";
import type { SessionType } from "../types/Trade";

const SESSION_LABELS: Record<SessionType, string> = {
  London: "London",
  NewYork: "New York",
  Overlap: "Overlap",
  Other: "Other",
};

const pairHeaderClass =
  "whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400";
const pairCellClass = "whitespace-nowrap px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300";

export default function Dashboard() {
  const navigate = useNavigate();
  const { trades } = useTrades();

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

  const advanced = useMemo(() => {
    const closed = trades
      .filter((t) => t.result !== "Open")
      .map((t) => ({
        ...t,
        contribution:
          t.result === "Win" ? t.rr : t.result === "Loss" ? -1 : 0,
      }));

    const grossProfit = closed
      .filter((t) => t.result === "Win")
      .reduce((s, t) => s + t.rr, 0);
    const grossLoss = closed.filter((t) => t.result === "Loss").length;
    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : null;

    const expectancy = closed.length > 0 ? stats.totalR / closed.length : 0;

    let running = 0;
    let peak = 0;
    let maxDrawdown = 0;
    for (const t of closed) {
      running += t.contribution;
      peak = Math.max(peak, running);
      maxDrawdown = Math.max(maxDrawdown, peak - running);
    }

    let bestWinStreak = 0;
    let bestLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let curWin = 0;
    let curLoss = 0;
    for (const t of closed) {
      if (t.result === "Win") {
        curWin += 1;
        curLoss = 0;
        bestWinStreak = Math.max(bestWinStreak, curWin);
      } else if (t.result === "Loss") {
        curLoss += 1;
        curWin = 0;
        bestLossStreak = Math.max(bestLossStreak, curLoss);
      } else {
        curWin = 0;
        curLoss = 0;
      }
    }
    const lastResult = closed[closed.length - 1]?.result;
    if (lastResult === "Win") currentWinStreak = curWin;
    if (lastResult === "Loss") currentLossStreak = curLoss;

    const bestTrade = closed
      .filter((t) => t.result === "Win")
      .sort((a, b) => b.rr - a.rr)[0];
    const worstTrade = closed
      .filter((t) => t.result === "Loss")
      .sort((a, b) => a.contribution - b.contribution)[0];

    return {
      profitFactor,
      expectancy,
      maxDrawdown,
      bestWinStreak,
      bestLossStreak,
      currentWinStreak,
      currentLossStreak,
      bestTrade,
      worstTrade,
    };
  }, [trades, stats.totalR]);

  const monthlyData = useMemo(() => {
    const map = new Map<
      string,
      { trades: number; wins: number; losses: number; netR: number }
    >();
    for (const t of trades) {
      if (t.result === "Open") continue;
      const key = t.date.slice(0, 7);
      const entry = map.get(key) ?? { trades: 0, wins: 0, losses: 0, netR: 0 };
      entry.trades += 1;
      if (t.result === "Win") {
        entry.wins += 1;
        entry.netR += t.rr;
      } else if (t.result === "Loss") {
        entry.losses += 1;
        entry.netR -= 1;
      }
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .map(([month, s]) => ({
        month,
        ...s,
        winRate:
          s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
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

  const pairData = useMemo(() => {
    const byPair = new Map<string, { wins: number; losses: number; netR: number; total: number }>();
    for (const t of trades) {
      const entry = byPair.get(t.pair) ?? { wins: 0, losses: 0, netR: 0, total: 0 };
      entry.total += 1;
      if (t.result === "Win") {
        entry.wins += 1;
        entry.netR += t.rr;
      } else if (t.result === "Loss") {
        entry.losses += 1;
        entry.netR -= 1;
      }
      byPair.set(t.pair, entry);
    }
    return Array.from(byPair.entries())
      .map(([pair, s]) => {
        const closed = s.wins + s.losses;
        return {
          pair,
          ...s,
          winRate: closed > 0 ? Math.round((s.wins / closed) * 100) : 0,
        };
      })
      .sort((a, b) => b.netR - a.netR);
  }, [trades]);

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 py-20">
        <LineChart className="mb-4 h-14 w-14 text-slate-400 dark:text-slate-600" />
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">
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

  const gridColor = cssVar("--tlog-chart-grid", "#cbd5e1");
  const axisColor = cssVar("--tlog-chart-axis", "#94a3b8");
  const tickColor = cssVar("--tlog-chart-tick", "#64748b");
  const tooltipBg = cssVar("--tlog-chart-tooltip-bg", "#ffffff");
  const tooltipBorder = cssVar("--tlog-chart-tooltip-border", "#e2e8f0");
  const tooltipText = cssVar("--tlog-chart-tooltip-text", "#0f172a");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
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

      {/* Advanced Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Profit Factor"
          value={
            advanced.profitFactor !== null
              ? advanced.profitFactor.toFixed(2)
              : "—"
          }
          icon={<Percent className="h-4 w-4" />}
          subtext="Gross profit / gross loss"
          trend={
            advanced.profitFactor !== null && advanced.profitFactor >= 1
              ? "up"
              : advanced.profitFactor !== null && advanced.profitFactor > 0
                ? "down"
                : null
          }
        />
        <StatCard
          title="Expectancy"
          value={
            stats.closed > 0 ? `${advanced.expectancy.toFixed(2)}R` : "—"
          }
          icon={<Gauge className="h-4 w-4" />}
          subtext="Avg R per closed trade"
          trend={
            advanced.expectancy > 0 ? "up" : advanced.expectancy < 0 ? "down" : null
          }
        />
        <StatCard
          title="Max Drawdown"
          value={stats.closed > 0 ? `-${advanced.maxDrawdown.toFixed(2)}R` : "—"}
          icon={<TrendingDown className="h-4 w-4" />}
          subtext="Worst peak-to-trough"
          trend={null}
        />
        <StatCard
          title="Best / Worst Streak"
          value={`${advanced.bestWinStreak}W / ${advanced.bestLossStreak}L`}
          icon={<Flame className="h-4 w-4" />}
          subtext={
            advanced.currentWinStreak > 0
              ? `Currently ${advanced.currentWinStreak}W in a row`
              : advanced.currentLossStreak > 0
                ? `Currently ${advanced.currentLossStreak}L in a row`
                : "No active streak"
          }
          trend={
            advanced.currentWinStreak > 0 ? "up" : advanced.currentLossStreak > 0 ? "down" : null
          }
        />
      </div>

      {/* Charts */}
      <div className="space-y-6">
        <EquityCurveChart trades={trades} />

        {/* Session Breakdown Bar Chart */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Win / Loss by Session
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={sessionData}
              margin={{ top: 5, right: 12, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="session"
                tick={{ fill: tickColor, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: axisColor }}
              />
              <YAxis
                tick={{ fill: tickColor, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: axisColor }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: tooltipText,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", color: tickColor }}
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

        {/* Best / Worst Trades */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-500/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <Crown className="h-4 w-4" />
              Best Trade
            </div>
            {advanced.bestTrade ? (
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {advanced.bestTrade.pair}
                </p>
                <p className="text-xs text-slate-500">{advanced.bestTrade.date}</p>
                <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  +{advanced.bestTrade.rr.toFixed(2)}R
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No winning trades yet.</p>
            )}
          </div>
          <div className="rounded-lg border border-rose-300 bg-rose-50 dark:border-rose-800/40 dark:bg-rose-500/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
              <Skull className="h-4 w-4" />
              Worst Trade
            </div>
            {advanced.worstTrade ? (
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {advanced.worstTrade.pair}
                </p>
                <p className="text-xs text-slate-500">{advanced.worstTrade.date}</p>
                <p className="mt-1 text-lg font-semibold text-rose-600 dark:text-rose-400">
                  -{Math.abs(advanced.worstTrade.contribution).toFixed(2)}R
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No losing trades yet.</p>
            )}
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Monthly Breakdown
          </h3>
          {monthlyData.length === 0 ? (
            <p className="text-sm text-slate-500">No closed trades yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead>
                  <tr>
                    <th className={pairHeaderClass}>Month</th>
                    <th className={pairHeaderClass}>Trades</th>
                    <th className={pairHeaderClass}>W / L</th>
                    <th className={pairHeaderClass}>Win Rate</th>
                    <th className={pairHeaderClass}>Net R</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
                  {monthlyData.map((m) => (
                    <tr key={m.month}>
                      <td className={`${pairCellClass} font-medium text-slate-900 dark:text-slate-100`}>
                        {m.month}
                      </td>
                      <td className={pairCellClass}>{m.trades}</td>
                      <td className={pairCellClass}>
                        <span className="text-emerald-600 dark:text-emerald-400">{m.wins}</span>
                        {" / "}
                        <span className="text-rose-600 dark:text-rose-400">{m.losses}</span>
                      </td>
                      <td className={pairCellClass}>
                        {m.winRate > 0 || m.losses > 0 ? `${m.winRate}%` : "—"}
                      </td>
                      <td className={pairCellClass}>
                        <span
                          className={`font-medium ${
                            m.netR > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : m.netR < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {m.netR > 0 ? "+" : ""}
                          {m.netR.toFixed(2)}R
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pair Breakdown */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Pair Breakdown (by Net R)
          </h3>
          {pairData.length === 0 ? (
            <p className="text-sm text-slate-500">No trades yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead>
                  <tr>
                    <th className={pairHeaderClass}>Pair</th>
                    <th className={pairHeaderClass}>Trades</th>
                    <th className={pairHeaderClass}>W / L</th>
                    <th className={pairHeaderClass}>Win Rate</th>
                    <th className={pairHeaderClass}>Net R</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
                  {pairData.map((p) => (
                    <tr key={p.pair}>
                      <td className={pairCellClass}>
                        <span className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                          {p === pairData[0] && p.netR > 0 && (
                            <Trophy className="h-3.5 w-3.5 text-amber-400" />
                          )}
                          {p === pairData[pairData.length - 1] && p.netR < 0 && (
                            <AlertOctagon className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                          )}
                          {p.pair}
                        </span>
                      </td>
                      <td className={pairCellClass}>{p.total}</td>
                      <td className={pairCellClass}>
                        <span className="text-emerald-600 dark:text-emerald-400">{p.wins}</span>
                        {" / "}
                        <span className="text-rose-600 dark:text-rose-400">{p.losses}</span>
                      </td>
                      <td className={pairCellClass}>
                        {p.winRate > 0 || p.losses > 0 ? `${p.winRate}%` : "—"}
                      </td>
                      <td className={pairCellClass}>
                        <span
                          className={`font-medium ${
                            p.netR > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : p.netR < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {p.netR > 0 ? "+" : ""}
                          {p.netR.toFixed(2)}R
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
