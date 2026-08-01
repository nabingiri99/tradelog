import { useNavigate } from "react-router-dom";
import { Target, BarChart3, TrendingUp, Trophy, Flag } from "lucide-react";
import { useTrades } from "../lib/TradeContext";

const TARGET = 50;

const MILESTONES = [
  { count: 10, label: "Starter", icon: Flag },
  { count: 25, label: "Halfway", icon: BarChart3 },
  { count: 50, label: "System Validated!", icon: Trophy },
] as const;

export default function BacktestProgress() {
  const navigate = useNavigate();
  const { trades } = useTrades();

  const total = trades.length;
  const pct = Math.min(Math.round((total / TARGET) * 100), 100);
  const remaining = Math.max(TARGET - total, 0);

  const closedTrades = trades.filter((t) => t.result !== "Open");
  const wins = closedTrades.filter((t) => t.result === "Win").length;
  const winRate =
    closedTrades.length > 0
      ? Math.round((wins / closedTrades.length) * 100)
      : 0;

  const netR = trades.reduce((sum, t) => {
    if (t.result === "Win") return sum + t.rr;
    if (t.result === "Loss") return sum - 1;
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            Backtest Progress
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Target: {TARGET} backtested trades
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">
            {total} / {TARGET} Trades
          </span>
          <span className="text-slate-400">{pct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Target className="h-4 w-4" />
            Trades Remaining
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {remaining}
          </p>
          <p className="text-xs text-slate-500">
            {remaining === 0
              ? "Target reached!"
              : `${remaining} more to hit ${TARGET}`}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <BarChart3 className="h-4 w-4" />
            Win Rate
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {closedTrades.length > 0 ? `${winRate}%` : "—"}
          </p>
          <p className="text-xs text-slate-500">
            {wins} wins / {closedTrades.length} closed
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <TrendingUp className="h-4 w-4" />
            Net R
          </div>
          <p
            className={`mt-2 text-2xl font-semibold ${
              netR > 0
                ? "text-emerald-400"
                : netR < 0
                  ? "text-rose-400"
                  : "text-slate-100"
            }`}
          >
            {netR > 0 ? "+" : ""}
            {netR.toFixed(2)}R
          </p>
          <p className="text-xs text-slate-500">Accumulated R multiple</p>
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Milestones
        </h2>
        <div className="space-y-2">
          {MILESTONES.map((ms) => {
            const reached = total >= ms.count;
            const Icon = ms.icon;
            return (
              <div
                key={ms.count}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                  reached
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-slate-800 bg-slate-800/30"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    reached ? "text-emerald-400" : "text-slate-600"
                  }`}
                />
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      reached ? "text-emerald-300" : "text-slate-400"
                    }`}
                  >
                    {ms.count} Trades — {ms.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {reached
                      ? "Completed"
                      : `${ms.count - total} trades remaining`}
                  </p>
                </div>
                {reached && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    Done
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA when no trades yet */}
      {total === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-12">
          <Target className="mb-4 h-10 w-10 text-slate-600" />
          <h3 className="text-base font-medium text-slate-300">
            No backtested trades yet
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Start logging trades to track your backtest progress.
          </p>
          <button
            type="button"
            onClick={() => navigate("/add")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Log First Trade
          </button>
        </div>
      )}
    </div>
  );
}
