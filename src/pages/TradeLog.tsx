import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, ClipboardList } from "lucide-react";
import TradeTable from "../components/TradeTable";
import { getTrades, deleteTrade } from "../lib/storage";
import type { ResultType, SessionType } from "../types/Trade";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500";

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
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
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
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            <PlusCircle className="h-4 w-4" />
            Add Trade
          </button>
        </div>
      )}
    </div>
  );
}
