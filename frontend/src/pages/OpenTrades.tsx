import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Pencil, TrendingUp, TrendingDown } from "lucide-react";
import { useTrades } from "../lib/TradeContext";
import type { ResultType, Trade } from "../types/Trade";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800";

const headerClass =
  "whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400";
const cellClass = "whitespace-nowrap px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300";

interface CloseState {
  id: string;
  result: ResultType;
  pnl: string;
}

export default function OpenTrades() {
  const navigate = useNavigate();
  const { trades, updateTrade } = useTrades();

  const [closing, setClosing] = useState<CloseState | null>(null);
  const [confirmClose, setConfirmClose] = useState<Trade | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useMemo(
    () =>
      trades
        .filter((t) => t.result === "Open")
        .sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return (a.entryTime ?? "").localeCompare(b.entryTime ?? "");
        }),
    [trades],
  );

  const totalOpenRisk = useMemo(
    () =>
      open.reduce((sum, t) => sum + (t.riskAmount ?? 0), 0),
    [open],
  );

  function openClosePanel(trade: Trade) {
    setClosing({
      id: trade.id,
      result: trade.pnlAmount != null && trade.pnlAmount > 0 ? "Win" : "Loss",
      pnl: trade.pnlAmount != null ? String(trade.pnlAmount) : "",
    });
    setConfirmClose(trade);
    setError(null);
  }

  function confirmCloseTrade() {
    if (!confirmClose || !closing) return;
    const pnl = Number(closing.pnl);
    if (closing.pnl.trim() !== "" && !Number.isFinite(pnl)) {
      setError("P&L must be a valid number.");
      return;
    }
    updateTrade({
      ...confirmClose,
      result: closing.result,
      pnlAmount: closing.pnl.trim() === "" ? undefined : Math.round(pnl * 100) / 100,
    });
    setConfirmClose(null);
    setClosing(null);
    setError(null);
  }

  if (open.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-20 dark:border-slate-700">
        <Activity className="mb-4 h-14 w-14 text-slate-400 dark:text-slate-600" />
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">
          No open trades
        </h2>
        <p className="mt-2 max-w-md text-center text-sm text-slate-500">
          Trades logged with result "Open" appear here so you can track live
          positions and close them out with a final P&amp;L.
        </p>
        <button
          type="button"
          onClick={() => navigate("/add")}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Log a Trade
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Open Trades</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {open.length} open position{open.length === 1 ? "" : "s"}
            {totalOpenRisk > 0
              ? ` · $${totalOpenRisk.toLocaleString(undefined, { maximumFractionDigits: 2 })} total risked`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/add")}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Add Trade
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className={headerClass}>Date</th>
              <th className={headerClass}>Pair</th>
              <th className={headerClass}>Direction</th>
              <th className={headerClass}>Entry</th>
              <th className={headerClass}>Stop Loss</th>
              <th className={headerClass}>Target</th>
              <th className={headerClass}>R:R</th>
              <th className={headerClass}>Size</th>
              <th className={headerClass}>Risk ($)</th>
              <th className={headerClass}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-800/50">
            {open.map((t) => {
              const directionIcon =
                t.direction === "Buy" ? (
                  <TrendingUp className="inline h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="inline h-4 w-4 text-rose-600 dark:text-rose-400" />
                );
              return (
                <tr key={t.id}>
                  <td className={`${cellClass} font-medium text-slate-900 dark:text-slate-100`}>
                    {t.date}
                    {t.entryTime ? <span className="ml-1 text-xs text-slate-500">@ {t.entryTime}</span> : null}
                  </td>
                  <td className={`${cellClass} font-medium text-slate-900 dark:text-slate-100`}>
                    {t.pair}
                  </td>
                  <td className={cellClass}>
                    <span className="inline-flex items-center gap-1">
                      {directionIcon}
                      {t.direction}
                    </span>
                  </td>
                  <td className={`${cellClass} tabular-nums`}>{t.entry.toFixed(t.entry >= 100 ? 2 : 4)}</td>
                  <td className={`${cellClass} tabular-nums`}>{t.stopLoss.toFixed(t.stopLoss >= 100 ? 2 : 4)}</td>
                  <td className={`${cellClass} tabular-nums`}>{t.target.toFixed(t.target >= 100 ? 2 : 4)}</td>
                  <td className={`${cellClass} tabular-nums font-medium`}>{t.rr.toFixed(2)}R</td>
                  <td className={`${cellClass} tabular-nums`}>
                    {t.positionSize != null ? t.positionSize : "—"}
                  </td>
                  <td className={`${cellClass} tabular-nums`}>
                    {t.riskAmount != null ? `$${t.riskAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className={cellClass}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openClosePanel(t)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        title="Edit trade"
                        onClick={() => navigate(`/edit/${t.id}`)}
                        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {confirmClose && closing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-sm rounded-lg border border-slate-300 bg-slate-50 p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Close {confirmClose.pair}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setConfirmClose(null);
                  setClosing(null);
                }}
                className="rounded p-1 text-slate-500 hover:text-slate-300"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {confirmClose.date} · {confirmClose.direction} · R:R{" "}
              {confirmClose.rr.toFixed(2)}R
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Result
              </label>
              <select
                className={inputClass}
                value={closing.result}
                onChange={(e) =>
                  setClosing({ ...closing, result: e.target.value as ResultType })
                }
              >
                <option value="Win">Win</option>
                <option value="Loss">Loss</option>
                <option value="BreakEven">Break Even</option>
              </select>
            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Realized P&amp;L ($)
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. +120 or -50"
                className={inputClass}
                value={closing.pnl}
                onChange={(e) => setClosing({ ...closing, pnl: e.target.value })}
              />
            </div>

            {error && (
              <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmClose(null);
                  setClosing(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCloseTrade}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
