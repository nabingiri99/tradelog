import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircle,
  ClipboardList,
  Download,
  Trash2,
  X,
  Upload,
  FileSpreadsheet,
  Tag,
  Undo2,
} from "lucide-react";
import TradeTable, { type SortKey, type SortDir } from "../components/TradeTable";
import { useTrades } from "../lib/TradeContext";
import { tradesToCsv, parseImportFile } from "../lib/csv";
import type { ResultType, SessionType } from "../types/Trade";

const PAGE_SIZE = 10;

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800";

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

const SORTABLE: Array<{ value: SortKey; label: string }> = [
  { value: "date", label: "Date" },
  { value: "pair", label: "Pair" },
  { value: "session", label: "Session" },
  { value: "direction", label: "Direction" },
  { value: "result", label: "Result" },
  { value: "rr", label: "R:R" },
];

export default function TradeLog() {
  const navigate = useNavigate();
  const {
    trades,
    deleteTrade,
    deleteTrades,
    updateTrade,
    clearAllTrades,
    importTrades,
    canUndo,
    undoDelete,
  } = useTrades();

  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => t.tags?.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [trades]);

  const filtered = useMemo(() => {
    const result = trades.filter((trade) => {
      if (search.trim() && !trade.pair.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (resultFilter && trade.result !== (resultFilter as ResultType)) {
        return false;
      }
      if (sessionFilter && trade.session !== (sessionFilter as SessionType)) {
        return false;
      }
      if (tagFilter && !trade.tags?.includes(tagFilter)) {
        return false;
      }
      if (fromDate && trade.date < fromDate) {
        return false;
      }
      if (toDate && trade.date > toDate) {
        return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * dir;
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * dir;
      }
      return 0;
    });
    return result;
  }, [trades, search, resultFilter, sessionFilter, tagFilter, fromDate, toDate, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  function handleSortChange(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function resetPage() {
    setPage(1);
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleToggleSelectAll(checked: boolean) {
    setSelectedIds(new Set(checked ? paged.map((t) => t.id) : []));
  }

  function handleBulkTag() {
    if (selectedIds.size === 0) return;
    const tag = window.prompt("Tag to apply to selected trades (e.g. revenge, news):");
    if (!tag) return;
    const clean = tag.trim();
    if (!clean) return;
    trades.forEach((t) => {
      if (selectedIds.has(t.id)) {
        const tags = [...(t.tags ?? []), clean];
        updateTrade({ ...t, tags });
      }
    });
    setSelectedIds(new Set());
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (
      window.confirm(
        `Delete ${selectedIds.size} selected trade${selectedIds.size === 1 ? "" : "s"}?`,
      )
    ) {
      deleteTrades(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }

  function handleDelete(id: string) {
    deleteTrade(id);
  }

  function handleUndo() {
    undoDelete();
    setPage(1);
  }

  function download(content: string, mime: string, filename: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExportJson() {
    download(
      JSON.stringify(trades, null, 2),
      "application/json",
      `tradelog-export-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }

  function handleExportCsv() {
    download(
      tradesToCsv(trades),
      "text/csv",
      `tradelog-export-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseImportFile(String(reader.result), file.name);
        if (parsed.length === 0) {
          setImportError("No trades found in the selected file.");
          setImportMessage(null);
          return;
        }
        const added = importTrades(parsed);
        setImportMessage(
          added > 0
            ? `Imported ${added} trade${added === 1 ? "" : "s"}.`
            : "All trades in the file already exist.",
        );
        setImportError(null);
      } catch (err) {
        setImportError(
          err instanceof Error
            ? err.message
            : "Could not read the file. Use a TradeLog JSON/CSV export or a broker CSV.",
        );
        setImportMessage(null);
      }
    };
    reader.readAsText(file);
  }

  function handleClearAll() {
    clearAllTrades();
    setShowClearModal(false);
    setSelectedIds(new Set());
    setPage(1);
  }

  const [showClearModal, setShowClearModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Trade Log</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
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
          onChange={(e) => {
            setSearch(e.target.value);
            resetPage();
          }}
          className={`${inputClass} w-full sm:w-48`}
        />
        <input
          type="date"
          aria-label="From date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            resetPage();
          }}
          className={`${inputClass} w-full sm:w-40`}
        />
        <input
          type="date"
          aria-label="To date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            resetPage();
          }}
          className={`${inputClass} w-full sm:w-40`}
        />
        <select
          value={resultFilter}
          onChange={(e) => {
            setResultFilter(e.target.value);
            resetPage();
          }}
          className={`${inputClass} w-full sm:w-36`}
        >
          {RESULTS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={sessionFilter}
          onChange={(e) => {
            setSessionFilter(e.target.value);
            resetPage();
          }}
          className={`${inputClass} w-full sm:w-36`}
        >
          {SESSIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={(e) => {
            setTagFilter(e.target.value);
            resetPage();
          }}
          className={`${inputClass} w-full sm:w-36`}
        >
          <option value="">All Tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => {
            handleSortChange(e.target.value as SortKey);
            resetPage();
          }}
          className={`${inputClass} w-full sm:w-32`}
        >
          {SORTABLE.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-700/50 bg-indigo-500/10 px-4 py-2.5">
          <span className="text-sm font-medium text-indigo-200">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleBulkTag}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <Tag className="h-3.5 w-3.5" />
              Add Tag
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:border-rose-600 hover:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {filtered.length > 0 ? (
        <TradeTable
          trades={paged}
          onDelete={handleDelete}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-16 dark:border-slate-700">
          <ClipboardList className="mb-4 h-12 w-12 text-slate-400 dark:text-slate-600" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No trades found</h3>
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

      {pageCount > 1 && filtered.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            Page {safePage} of {pageCount}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-400 hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-400 hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {canUndo && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-700/50 bg-emerald-500/10 px-4 py-2.5">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Trades deleted. Restore them?</p>
          <button
            type="button"
            onClick={handleUndo}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
        </div>
      )}

      {importMessage && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{importMessage}</p>
      )}
      {importError && <p className="text-sm text-rose-600 dark:text-rose-400">{importError}</p>}

      {trades.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-400 hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-400 hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-400 hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:border-rose-600 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All Data
          </button>
        </div>
      )}

      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-sm rounded-lg border border-slate-300 bg-slate-50 p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
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
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This will permanently delete all {trades.length} trade
              {trades.length === 1 ? "" : "s"}. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
