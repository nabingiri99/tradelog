import { useEffect, useMemo, useState } from "react";
import { BookOpen, Save, Trash2, Sparkles } from "lucide-react";
import { api, type JournalEntry } from "../lib/api";
import { getNetPnl } from "../lib/analytics";
import { useTrades } from "../lib/TradeContext";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

const MOODS = [
  "Calm",
  "Confident",
  "Neutral",
  "Anxious",
  "Fearful",
  "Greedy",
  "Frustrated",
  "Hopeful",
  "Tired",
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyEntry: Omit<JournalEntry, "id"> = {
  date: "",
  mood: "",
  performanceScore: null,
  whatWentWell: "",
  whatToImprove: "",
  lessonsLearned: "",
  nextDayPlan: "",
  gratitude: "",
};

export default function Journal() {
  const { trades } = useTrades();
  const [date, setDate] = useState(today());
  const [form, setForm] = useState<Omit<JournalEntry, "id">>({ ...emptyEntry });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.journal
      .list({ limit: 60 })
      .then((res) => {
        if (!cancelled) setEntries(res.data);
      })
      .catch(() => {
        /* non-fatal */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.journal
      .get(date)
      .then((res) => {
        if (cancelled) return;
        setForm({
          date: res.data.date,
          mood: res.data.mood ?? "",
          performanceScore: res.data.performanceScore,
          whatWentWell: res.data.whatWentWell ?? "",
          whatToImprove: res.data.whatToImprove ?? "",
          lessonsLearned: res.data.lessonsLearned ?? "",
          nextDayPlan: res.data.nextDayPlan ?? "",
          gratitude: res.data.gratitude ?? "",
        });
      })
      .catch(() => {
        if (!cancelled) setForm({ ...emptyEntry, date });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const dayStats = useMemo(() => {
    const dayTrades = trades.filter((t) => t.date === date);
    const closed = dayTrades.filter((t) => t.result !== "Open");
    const wins = closed.filter((t) => t.result === "Win");
    const losses = closed.filter((t) => t.result === "Loss");
    const pnl = getNetPnl(closed);
    return {
      count: dayTrades.length,
      winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
      wl: `${wins.length}W / ${losses.length}L`,
      pnl,
    };
  }, [trades, date]);

  function setField<K extends keyof Omit<JournalEntry, "id">>(
    key: K,
    value: Omit<JournalEntry, "id">[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.journal.upsert(date, {
        mood: form.mood,
        performanceScore: form.performanceScore,
        whatWentWell: form.whatWentWell,
        whatToImprove: form.whatToImprove,
        lessonsLearned: form.lessonsLearned,
        nextDayPlan: form.nextDayPlan,
        gratitude: form.gratitude,
      });
      setEntries((prev) => {
        const next = prev.filter((e) => e.date !== date);
        return [res.data, ...next].sort((a, b) => b.date.localeCompare(a.date));
      });
      setMessage(`Journal saved for ${date}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the journal entry.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete the journal entry for ${date}?`)) return;
    setError(null);
    setMessage(null);
    try {
      await api.journal.remove(date);
      setEntries((prev) => prev.filter((e) => e.date !== date));
      setForm({ ...emptyEntry, date });
      setMessage(`Journal entry for ${date} deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the journal entry.");
    }
  }

  const hasExisting = entries.some((e) => e.date === date);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Journal</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Daily reflection — review your day and plan the next one.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-4">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="w-44">
                <label className={labelClass} htmlFor="journalDate">
                  Journal Date
                </label>
                <input
                  id="journalDate"
                  type="date"
                  className={inputClass}
                  value={date}
                  onChange={(e) => setDate(e.target.value || today())}
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                  {dayStats.count} trade{dayStats.count === 1 ? "" : "s"}
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                  {dayStats.wl}
                </span>
                {dayStats.winRate > 0 || dayStats.wl !== "0W / 0L" ? (
                  <span className="rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                    {dayStats.winRate.toFixed(0)}% win rate
                  </span>
                ) : null}
                <span
                  className={`rounded-md px-2.5 py-1.5 ${
                    dayStats.pnl > 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : dayStats.pnl < 0
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400"
                  }`}
                >
                  {dayStats.pnl > 0 ? "+" : ""}
                  {dayStats.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })} P&amp;L
                </span>
              </div>
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="mood">
                      Mood
                    </label>
                    <select
                      id="mood"
                      className={inputClass}
                      value={form.mood}
                      onChange={(e) => setField("mood", e.target.value)}
                    >
                      <option value="">Select mood</option>
                      {MOODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="performanceScore">
                      Performance Score (0–10)
                    </label>
                    <input
                      id="performanceScore"
                      type="number"
                      min={0}
                      max={10}
                      step="any"
                      className={inputClass}
                      value={form.performanceScore ?? ""}
                      onChange={(e) =>
                        setField(
                          "performanceScore",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="whatWentWell">
                    What went well
                  </label>
                  <textarea
                    id="whatWentWell"
                    rows={2}
                    className={inputClass}
                    placeholder="Discipline, following the plan, good entries…"
                    value={form.whatWentWell}
                    onChange={(e) => setField("whatWentWell", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="whatToImprove">
                    What to improve
                  </label>
                  <textarea
                    id="whatToImprove"
                    rows={2}
                    className={inputClass}
                    placeholder="Cutting losses early, not overtrading…"
                    value={form.whatToImprove}
                    onChange={(e) => setField("whatToImprove", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="lessonsLearned">
                    Lessons learned
                  </label>
                  <textarea
                    id="lessonsLearned"
                    rows={2}
                    className={inputClass}
                    placeholder="What will you remember from today?"
                    value={form.lessonsLearned}
                    onChange={(e) => setField("lessonsLearned", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="nextDayPlan">
                    Next day plan
                  </label>
                  <textarea
                    id="nextDayPlan"
                    rows={2}
                    className={inputClass}
                    placeholder="Setups, pairs, risk limits, goals…"
                    value={form.nextDayPlan}
                    onChange={(e) => setField("nextDayPlan", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="gratitude">
                    Gratitude
                  </label>
                  <textarea
                    id="gratitude"
                    rows={2}
                    className={inputClass}
                    placeholder="One thing you are grateful for…"
                    value={form.gratitude}
                    onChange={(e) => setField("gratitude", e.target.value)}
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving…" : "Save Journal"}
                  </button>
                  {hasExisting && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-800 px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:border-rose-600 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Entry
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-800/50 dark:bg-indigo-500/5 dark:text-indigo-200">
            <Sparkles className="h-4 w-4 shrink-0" />
            <p>
              Journaling is a habit, not a chore. Two minutes of reflection per
              day compounds into a much sharper edge over time.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-4">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Past Entries
            </h2>
            {entries.length === 0 ? (
              <p className="text-sm text-slate-500">No journal entries yet.</p>
            ) : (
              <ul className="space-y-2">
                {entries.map((e) => (
                  <li key={e.date}>
                    <button
                      type="button"
                      onClick={() => setDate(e.date)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        e.date === date
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-200 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {e.date}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-slate-500">
                          {e.mood && <span className="font-medium text-slate-600 dark:text-slate-400">{e.mood}</span>}
                          {e.performanceScore != null && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-900">
                              {e.performanceScore}/10
                            </span>
                          )}
                        </span>
                      </div>
                      {(e.lessonsLearned || e.whatWentWell) && (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                          {e.lessonsLearned || e.whatWentWell}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
