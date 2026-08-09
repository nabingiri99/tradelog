import { useEffect, useMemo, useState, Fragment } from "react";
import { Newspaper, Loader2, CalendarDays, RefreshCw, AlertTriangle } from "lucide-react";
import { api, type NewsEvent } from "../lib/api";

const IMPACT_STYLES: Record<NewsEvent["impact"], string> = {
  High: "bg-rose-500/15 text-rose-600 ring-rose-500/30 dark:text-rose-400",
  Medium: "bg-amber-500/15 text-amber-600 ring-amber-500/30 dark:text-amber-400",
  Low: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400",
  Holiday: "bg-slate-500/15 text-slate-600 ring-slate-500/30 dark:text-slate-400",
};

const IMPACT_DOT: Record<NewsEvent["impact"], string> = {
  High: "bg-rose-500",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
  Holiday: "bg-slate-400",
};

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "AUD",
  "CAD",
  "NZD",
  "CNY",
];

const IMPACT_TABS: Array<"All" | NewsEvent["impact"]> = [
  "All",
  "High",
  "Medium",
  "Low",
];

const headerClass =
  "whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400";
const cellClass = "whitespace-nowrap px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300";

function ImpactBadge({ impact }: { impact: NewsEvent["impact"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${IMPACT_STYLES[impact]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${IMPACT_DOT[impact]}`} />
      {impact}
    </span>
  );
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function News() {
  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [hasUpcoming, setHasUpcoming] = useState(false);
  const [impact, setImpact] = useState<"All" | NewsEvent["impact"]>("High");
  const [currency, setCurrency] = useState<string>("All");
  const [days, setDays] = useState(7);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const params: { impact?: string; currency?: string; days?: number } = { days };
    if (impact !== "All") params.impact = impact;
    if (currency !== "All") params.currency = currency;
    api.news
      .calendar(params)
      .then((res) => {
        if (cancelled) return;
        setEvents(res.data);
        const now = Date.now();
        setHasUpcoming(res.data.some((e) => e.date && new Date(e.date).getTime() >= now));
        setLastUpdated(new Date().toLocaleTimeString());
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load the news calendar.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [impact, currency, days, refreshKey]);

  function handleRefresh() {
    setLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, NewsEvent[]>();
    for (const event of events) {
      const key = event.date ?? "unknown";
      const bucket = map.get(key) ?? [];
      bucket.push(event);
      map.set(key, bucket);
    }
    return Array.from(map.entries()).sort((a, b) =>
      (a[0] || "").localeCompare(b[0] || ""),
    );
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            <Newspaper className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Forex News Calendar
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Economic events from the{" "}
            <span className="font-medium">ForexFactory</span> calendar. Filter by
            impact to focus on market-moving news.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:border-rose-800/50 dark:text-rose-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/50">
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500">Impact</p>
          <div className="flex gap-1.5">
            {IMPACT_TABS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setImpact(level)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  impact === level
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500">Currency</p>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="All">All currencies</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500">Horizon</p>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value={1}>Next 24 hours</option>
            <option value={3}>Next 3 days</option>
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
          </select>
        </div>

        {lastUpdated && (
          <p className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            Updated {lastUpdated}
          </p>
        )}
      </div>

      {/* Events */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Loading economic calendar…</p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No events match the current filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className={headerClass}>Date</th>
                    <th className={headerClass}>Time (ET)</th>
                    <th className={headerClass}>Currency</th>
                    <th className={headerClass}>Impact</th>
                    <th className={headerClass}>Event</th>
                    <th className={`${headerClass} text-right`}>Actual</th>
                    <th className={`${headerClass} text-right`}>Forecast</th>
                    <th className={`${headerClass} text-right`}>Previous</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(([date, bucket]) => (
                    <Fragment key={date}>
                      <tr
                        className="bg-slate-50/80 dark:bg-slate-800/40"
                      >
                        <td
                          colSpan={8}
                          className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                          {date === "unknown" ? "Date unknown" : formatDate(date)}
                        </td>
                      </tr>
                      {bucket.map((event, i) => (
                        <tr
                          key={`${date}-${i}-${event.event}`}
                          className="border-b border-slate-100 last:border-b-0 dark:border-slate-800/60"
                        >                          <td className={cellClass} />
                          <td className={`${cellClass} tabular-nums`}>
                            {event.time ?? "—"}
                          </td>
                          <td className={cellClass}>
                            <span className="font-medium">{event.currency ?? "—"}</span>
                          </td>
                          <td className={cellClass}>
                            <ImpactBadge impact={event.impact} />
                          </td>
                          <td className={`${cellClass} text-slate-900 dark:text-slate-100`}>
                            {event.event ?? "—"}
                          </td>
                          <td className={`${cellClass} text-right tabular-nums`}>
                            {event.actual ?? "—"}
                          </td>
                          <td className={`${cellClass} text-right tabular-nums`}>
                            {event.forecast ?? "—"}
                          </td>
                          <td className={`${cellClass} text-right tabular-nums`}>
                            {event.previous ?? "—"}
                          </td>
                        </tr>
                    ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800">
              <span>{events.length} event{events.length === 1 ? "" : "s"}</span>
              {hasUpcoming && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Includes upcoming events
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
