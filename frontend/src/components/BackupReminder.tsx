import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useTrades } from "../lib/TradeContext";
import { useAuth } from "../lib/authStore";
import { tradesToCsv } from "../lib/csv";

const DEFAULT_KEY = "tradelog.backupReminder";
const THRESHOLD = 10;

interface ReminderState {
  newTrades: number;
  lastSeenTotal: number;
}

function loadState(key: string): ReminderState {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { newTrades: 0, lastSeenTotal: 0 };
    const parsed = JSON.parse(raw) as Partial<ReminderState>;
    return {
      newTrades: typeof parsed.newTrades === "number" ? parsed.newTrades : 0,
      lastSeenTotal:
        typeof parsed.lastSeenTotal === "number" ? parsed.lastSeenTotal : 0,
    };
  } catch {
    return { newTrades: 0, lastSeenTotal: 0 };
  }
}

export default function BackupReminder() {
  const { user } = useAuth();
  const storageKey = user
    ? `tradelog.backupReminder.${user.email}`
    : DEFAULT_KEY;
  return <KeyedReminder key={storageKey} storageKey={storageKey} />;
}

function KeyedReminder({ storageKey }: { storageKey: string }) {
  const { trades } = useTrades();
  const [state, setState] = useState<ReminderState>(() => loadState(storageKey));

  if (trades.length > state.lastSeenTotal) {
    setState({
      newTrades: state.newTrades + (trades.length - state.lastSeenTotal),
      lastSeenTotal: trades.length,
    });
  }

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  if (state.newTrades < THRESHOLD) return null;

  function handleExport() {
    const csv = tradesToCsv(trades);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tradelog-backup-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setState({ newTrades: 0, lastSeenTotal: state.lastSeenTotal });
  }

  function handleDismiss() {
    setState({ newTrades: 0, lastSeenTotal: state.lastSeenTotal });
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pt-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-800/50 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-nowrap">
        <Download className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            Export a copy of your journal
          </p>
          <p className="mt-0.5 text-xs opacity-70">
            You&apos;ve logged {state.newTrades} trades since your last export.
            Download a CSV copy as an offline backup.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-400"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss backup reminder"
            className="rounded-lg p-1.5 opacity-70 transition-colors hover:bg-amber-500/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
