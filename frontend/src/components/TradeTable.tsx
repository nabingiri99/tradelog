import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, CheckCircle2, AlertTriangle, Copy, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";
import type { Trade } from "../types/Trade";
import { useTrades } from "../lib/TradeContext";

export type SortKey = "date" | "pair" | "session" | "direction" | "entry" | "stopLoss" | "target" | "result" | "rr";
export type SortDir = "asc" | "desc";

export interface TradeTableProps {
  trades: Trade[];
  onDelete: (id: string) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSortChange: (key: SortKey) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
}

const headerClass =
  "whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400";
const cellClass = "whitespace-nowrap px-3 py-3 text-sm text-slate-800 dark:text-slate-200";

const SESSIONS: Record<string, string> = {
  London: "London",
  NewYork: "New York",
  Overlap: "Overlap",
  Other: "Other",
};

const RESULTS = ["Win", "Loss", "BreakEven", "Open"] as const;

function DirectionBadge({ direction }: { direction: Trade["direction"] }) {
  const isBuy = direction === "Buy";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isBuy
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
      }`}
    >
      {direction}
    </span>
  );
}

function RuleBadge({ valid }: { valid: boolean }) {
  if (valid) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Valid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
      <AlertTriangle className="h-3.5 w-3.5" />
      Invalid
    </span>
  );
}

function Tags({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return <span className="text-xs text-slate-400 dark:text-slate-600">—</span>;
  return (
    <div className="flex max-w-[200px] flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-slate-700/60 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function EmotionBadge({ emotion }: { emotion?: string }) {
  if (!emotion) return <span className="text-xs text-slate-400 dark:text-slate-600">—</span>;
  const tone =
    emotion === "Calm" || emotion === "Confident"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : emotion === "Neutral"
        ? "bg-slate-500/15 text-slate-600 dark:text-slate-400"
        : "bg-amber-500/15 text-amber-400";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {emotion}
    </span>
  );
}

function ReasonText({ reason }: { reason?: string }) {
  if (!reason) return <span className="text-xs text-slate-400 dark:text-slate-600">—</span>;
  return <span className="text-xs text-slate-600 dark:text-slate-400">{reason}</span>;
}

function ScreenshotLink({ src, pair }: { src?: string; pair: string }) {
  if (!src) return <span className="text-xs text-slate-400 dark:text-slate-600">—</span>;
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      title={`Open screenshot for ${pair}`}
      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
    >
      <ImageIcon className="h-3.5 w-3.5" />
      View
    </a>
  );
}

export default function TradeTable({
  trades,
  onDelete,
  sortKey,
  sortDir,
  onSortChange,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: TradeTableProps) {
  const navigate = useNavigate();
  const { updateTrade, duplicateTrade } = useTrades();

  const allVisibleSelected = trades.length > 0 && trades.every((t) => selectedIds.has(t.id));
  const someVisibleSelected = trades.some((t) => selectedIds.has(t.id));

  const columns: Array<{ key: SortKey; label: string; align?: "right" }> = [
    { key: "date", label: "Date" },
    { key: "pair", label: "Pair" },
    { key: "session", label: "Session" },
    { key: "direction", label: "Direction" },
    { key: "entry", label: "Entry" },
    { key: "stopLoss", label: "SL" },
    { key: "target", label: "TP" },
    { key: "result", label: "Result" },
    { key: "rr", label: "R:R" },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-white dark:bg-slate-800/50">
          <tr>
            <th className={`${headerClass} w-10`}>
              <input
                type="checkbox"
                aria-label="Select all visible trades"
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                }}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-white dark:bg-slate-800 accent-indigo-500"
              />
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${headerClass} ${col.align === "right" ? "text-right" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => onSortChange(col.key)}
                  className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-800 dark:hover:text-slate-200"
                >
                  {col.label}
                  {sortKey === col.key &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </button>
              </th>
            ))}
            <th className={`${headerClass} text-left`}>Rules</th>
            <th className={`${headerClass} text-left`}>Tags</th>
            <th className={`${headerClass} text-left`}>Emotion</th>
            <th className={`${headerClass} text-left`}>Reason</th>
            <th className={`${headerClass} text-left`}>Shot</th>
            <th className={`${headerClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {trades.map((trade) => (
            <tr
              key={trade.id}
              className={`transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/40 ${
                selectedIds.has(trade.id) ? "bg-indigo-500/5" : ""
              }`}
            >
              <td className={cellClass}>
                <input
                  type="checkbox"
                  aria-label={`Select ${trade.pair} ${trade.date}`}
                  checked={selectedIds.has(trade.id)}
                  onChange={() => onToggleSelect(trade.id)}
                  className="h-4 w-4 rounded border-slate-600 bg-white dark:bg-slate-800 accent-indigo-500"
                />
              </td>
              <td className={cellClass}>{trade.date}</td>
              <td className={`${cellClass} font-medium text-slate-900 dark:text-slate-100`}>
                {trade.pair}
              </td>
              <td className={cellClass}>{SESSIONS[trade.session] ?? trade.session}</td>
              <td className={cellClass}>
                <DirectionBadge direction={trade.direction} />
              </td>
              <td className={cellClass}>{trade.entry}</td>
              <td className={cellClass}>{trade.stopLoss}</td>
              <td className={cellClass}>{trade.target}</td>
              <td className={cellClass}>
                <select
                  title="Update result"
                  aria-label="Update result"
                  value={trade.result}
                  onChange={(e) =>
                    updateTrade({
                      ...trade,
                      result: e.target.value as Trade["result"],
                    })
                  }
                  className="cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-800"
                >
                  {RESULTS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td className={cellClass}>
                <span className="font-medium text-violet-400">
                  {trade.rr.toFixed(2)}R
                </span>
              </td>
              <td className={cellClass}>
                <RuleBadge valid={trade.isValidRuleTrade} />
              </td>
              <td className={cellClass}>
                <Tags tags={trade.tags} />
              </td>
              <td className={cellClass}>
                <EmotionBadge emotion={trade.emotion} />
              </td>
              <td className={cellClass}>
                <ReasonText reason={trade.reason} />
              </td>
              <td className={cellClass}>
                <ScreenshotLink src={trade.screenshot} pair={trade.pair} />
              </td>
              <td className={`${cellClass} text-right`}>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    title="Duplicate trade"
                    onClick={() => duplicateTrade(trade.id)}
                    className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-violet-400"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Edit trade"
                    onClick={() => navigate(`/edit/${trade.id}`)}
                    className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-400"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Delete trade"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete trade for ${trade.pair} on ${trade.date}?`,
                        )
                      ) {
                        onDelete(trade.id);
                      }
                    }}
                    className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
