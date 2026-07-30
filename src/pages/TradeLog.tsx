import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, ClipboardList, Download, Trash2, X } from "lucide-react";
import TradeTable from "../components/TradeTable";
import { getTrades, deleteTrade, clearAllTrades } from "../lib/storage";
import type { ResultType, SessionType } from "../types/Trade";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500";

const RESULTS: Array<{ value: string; label: string }> = [
  { value: "", label: "All Results" },
  { value: "Win", label: "Win" },
  { value: "Loss", label: "Loss" },
  { value: "BreakEven", label: "Break Even" },
  { value: "Open", label: "Open" },
];

const SESSIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All Sessions" },
  { value: "London", label: "London" },
  { value: "NewYork", label: "New York" },
  { value: "Overlap", label: "Overlap" },
  { value: "Other", label: "Other" },
];

export default function TradeLog() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [trades, setTrades] = useState(() => getTrades());

  const filtered = useMemo(() => {
    return trades.filter((trade) => {
      if (search.trim() && !trade.pair.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (resultFilter && trade.result !== (resultFilter as ResultType)) {
        return false;
      }
      if (sessionFilter && trade.session !== (sessionFilter as SessionType)) {
        return false;
      }
      return true;
    });
  }, [trades, search, resultFilter, sessionFilter]);

  function handleDelete(id: string) {
    deleteTrade(id);
    setTrades((prev) => prev.filter((t) => t.id !== id));
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(trades, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tradelog-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleClearAll() {
    clearAllTrades();
    setTrades([]);
    setShowClearModal(false);
  }

  const [showClearModal, setShowClearModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Trade Log</h1>
          <p className="mt-1 text-sm text-slate-400">
            {filtered.length} {filtered.length === 1 ? "trade" : "trades"} found
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/add")}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <PlusCircle className="h-4 w-4" />
          Add Trade
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by pair..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} w-full sm:w-56`}
        />
        <select
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
          className={`${inputClass} w-full sm:w-40`}
        >
          {RESULTS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          className={`${inputClass} w-full sm:w-40`}
        >
          {SESSIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length > 0 ? (
        <TradeTable trades={filtered} onDelete={handleDelete} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-16">
          <ClipboardList className="mb-4 h-12 w-12 text-slate-600" />
          <h3 className="text-lg font-medium text-slate-300">No trades found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {trades.length === 0
              ? "Start by logging your first trade."
              : "Try adjusting your search or filters."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/add")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <PlusCircle className="h-4 w-4" />
            Add Trade
          </button>
        </div>
      )}

      {/* Export & Clear — only show when there is data */}
      {trades.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-slate-600 hover:text-slate-200"
          >
            <Download className="h-3.5 w-3.5" />
            Export Trades JSON
          </button>
          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-medium text-rose-400 hover:border-rose-600 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All Data
          </button>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">
                Clear All Data?
              </h3>
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="rounded p-1 text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              This will permanently delete all {trades.length} trade
              {trades.length === 1 ? "" : "s"}. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
