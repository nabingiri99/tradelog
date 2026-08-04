import { useMemo } from "react";
import {
  Trophy,
  Skull,
  Gauge,
  Target,
  PieChart,
  Tag,
} from "lucide-react";
import StatCard from "../components/StatCard";
import { useTrades } from "../lib/TradeContext";
import {
  getSessionAnalytics,
  getTagAnalytics,
  getStreaks,
  getRrComparison,
  type AnalyticsSession,
} from "../lib/analytics";

const SESSION_LABELS: Record<AnalyticsSession, string> = {
  Asian: "Asian",
  London: "London",
  Overlap: "Overlap",
  NewYork: "New York",
  Other: "Other",
};

const headerClass =
  "whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400";
const cellClass = "whitespace-nowrap px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300";

function WinRateBar({ winRate }: { winRate: number }) {
  const clamped = Math.max(0, Math.min(100, winRate));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full"
          style={{
            width: `${clamped}%`,
            backgroundColor: winRate >= 50 ? "#10b981" : "#f43f5e",
          }}
        />
      </div>
      <span className="text-sm tabular-nums text-slate-700 dark:text-slate-300">
        {winRate.toFixed(0)}%
      </span>
    </div>
  );
}

export default function AnalyticsPage() {
  const { trades } = useTrades();

  const sessions = useMemo(() => getSessionAnalytics(trades), [trades]);
  const tags = useMemo(() => getTagAnalytics(trades), [trades]);
  const streaks = useMemo(() => getStreaks(trades), [trades]);
  const rr = useMemo(() => getRrComparison(trades), [trades]);

  const hasClosed = trades.some((t) => t.result !== "Open");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Win rates, streaks and risk-reward execution quality
        </p>
      </div>

      {!hasClosed ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 py-20">
          <PieChart className="mb-4 h-14 w-14 text-slate-400 dark:text-slate-600" />
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">
            No closed trades yet
          </h2>
          <p className="mt-2 max-w-md text-center text-sm text-slate-500">
            Close some trades to see session win rates, setup breakdowns,
            streaks and R:R execution analysis.
          </p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Longest Win Streak"
              value={`${streaks.longestWinStreak}W`}
              icon={<Trophy className="h-4 w-4" />}
              subtext={
                streaks.currentWinStreak > 0
                  ? `Currently ${streaks.currentWinStreak}W in a row`
                  : "No active win streak"
              }
              trend={streaks.currentWinStreak > 0 ? "up" : null}
            />
            <StatCard
              title="Longest Loss Streak"
              value={`${streaks.longestLossStreak}L`}
              icon={<Skull className="h-4 w-4" />}
              subtext={
                streaks.currentLossStreak > 0
                  ? `Currently ${streaks.currentLossStreak}L in a row`
                  : "No active loss streak"
              }
              trend={streaks.currentLossStreak > 0 ? "down" : null}
            />
            <StatCard
              title="Avg R:R Achieved"
              value={`${rr.avgAchieved.toFixed(2)}R`}
              icon={<Gauge className="h-4 w-4" />}
              subtext="Actual per closed trade"
              trend={rr.avgAchieved > 0 ? "up" : rr.avgAchieved < 0 ? "down" : null}
            />
            <StatCard
              title="Avg R:R Planned"
              value={`${rr.avgPlanned.toFixed(2)}R`}
              icon={<Target className="h-4 w-4" />}
              subtext={`${rr.difference >= 0 ? "+" : ""}${rr.difference.toFixed(2)}R vs planned`}
              trend={rr.difference > 0 ? "up" : rr.difference < 0 ? "down" : null}
            />
          </div>

          {/* R:R comparison */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-4">
            <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
              R:R Execution Quality
            </h3>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Planned average</span>
                  <span className="tabular-nums text-slate-800 dark:text-slate-200">
                    {rr.avgPlanned.toFixed(2)}R
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (rr.avgPlanned / Math.max(rr.avgPlanned, rr.avgAchieved, 1)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Achieved average</span>
                  <span className="tabular-nums text-slate-800 dark:text-slate-200">
                    {rr.avgAchieved.toFixed(2)}R
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (rr.avgAchieved / Math.max(rr.avgPlanned, rr.avgAchieved, 1)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {rr.difference >= 0
                  ? `You are capturing ${rr.difference.toFixed(2)}R more than your setup targets.`
                  : `You are leaving ${Math.abs(rr.difference).toFixed(2)}R on the table versus your setup targets.`}
              </p>
            </div>
          </div>

          {/* Session Win Rate */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-4">
            <h3 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Win Rate by Session
            </h3>
            <p className="mb-4 text-xs text-slate-500">
              Sessions inferred from entry time; trades without a time fall back
              to their logged session.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead>
                  <tr>
                    <th className={headerClass}>Session</th>
                    <th className={headerClass}>Trades</th>
                    <th className={headerClass}>W / L</th>
                    <th className={headerClass}>Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
                  {sessions.map((s) => (
                    <tr key={s.session}>
                      <td className={`${cellClass} font-medium text-slate-900 dark:text-slate-100`}>
                        {SESSION_LABELS[s.session]}
                      </td>
                      <td className={cellClass}>{s.trades}</td>
                      <td className={cellClass}>
                        <span className="text-emerald-600 dark:text-emerald-400">{s.wins}</span>
                        {" / "}
                        <span className="text-rose-600 dark:text-rose-400">{s.losses}</span>
                      </td>
                      <td className={cellClass}>
                        {s.wins + s.losses > 0 ? (
                          <WinRateBar winRate={s.winRate} />
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tag / Setup Win Rate */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-4">
            <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Win Rate by Setup / Tag
            </h3>
            {tags.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Tag className="h-4 w-4" />
                No tagged trades yet. Add tags like news, scalp or your setup
                names to see breakdowns.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead>
                    <tr>
                      <th className={headerClass}>Tag</th>
                      <th className={headerClass}>Trades</th>
                      <th className={headerClass}>W / L</th>
                      <th className={headerClass}>Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
                    {tags.map((t) => (
                      <tr key={t.tag}>
                        <td className={`${cellClass} font-medium text-slate-900 dark:text-slate-100`}>
                          {t.tag}
                        </td>
                        <td className={cellClass}>{t.trades}</td>
                        <td className={cellClass}>
                          <span className="text-emerald-600 dark:text-emerald-400">{t.wins}</span>
                          {" / "}
                          <span className="text-rose-600 dark:text-rose-400">{t.losses}</span>
                        </td>
                        <td className={cellClass}>
                          {t.wins + t.losses > 0 ? (
                            <WinRateBar winRate={t.winRate} />
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
