import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Trade } from "../types/Trade";

export interface TradeTableProps {
  trades: Trade[];
  onDelete: (id: string) => void;
}

const headerClass =
  "whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400";
const cellClass = "whitespace-nowrap px-3 py-3 text-sm text-slate-200";

const SESSIONS: Record<string, string> = {
  London: "London",
  NewYork: "New York",
  Overlap: "Overlap",
  Other: "Other",
};

function ResultBadge({ result }: { result: Trade["result"] }) {
  const map: Record<
    Trade["result"],
    { bg: string; text: string; label: string }
  > = {
    Win: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Win" },
    Loss: { bg: "bg-rose-500/15", text: "text-rose-400", label: "Loss" },
    BreakEven: {
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      label: "BE",
    },
    Open: { bg: "bg-slate-500/15", text: "text-slate-400", label: "Open" },
  };
  const s = map[result];
  return (
    <span
      className={`inline-flex items-center rounded-full ${s.bg} ${s.text} px-2.5 py-0.5 text-xs font-medium`}
    >
      {s.label}
    </span>
  );
}

function DirectionBadge({ direction }: { direction: Trade["direction"] }) {
  const isBuy = direction === "Buy";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isBuy
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-rose-500/15 text-rose-400"
      }`}
    >
      {direction}
    </span>
  );
}

function RuleBadge({ valid }: { valid: boolean }) {
  if (valid) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Valid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400">
      <AlertTriangle className="h-3.5 w-3.5" />
      Invalid
    </span>
  );
}

export default function TradeTable({ trades, onDelete }: TradeTableProps) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800">
        <thead className="bg-slate-800/50">
          <tr>
            <th className={headerClass}>Date</th>
            <th className={headerClass}>Pair</th>
            <th className={headerClass}>Session</th>
            <th className={headerClass}>Direction</th>
            <th className={headerClass}>Zone</th>
            <th className={headerClass}>Entry</th>
            <th className={headerClass}>SL</th>
            <th className={headerClass}>TP</th>
            <th className={headerClass}>Result</th>
            <th className={headerClass}>R:R</th>
            <th className={headerClass}>Rules</th>
            <th className={`${headerClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {trades.map((trade) => (
            <tr key={trade.id} className="transition-colors hover:bg-slate-800/40">
              <td className={cellClass}>{trade.date}</td>
              <td className={`${cellClass} font-medium text-slate-100`}>
                {trade.pair}
              </td>
              <td className={cellClass}>{SESSIONS[trade.session] ?? trade.session}</td>
              <td className={cellClass}>
                <DirectionBadge direction={trade.direction} />
              </td>
              <td className={cellClass}>
                <span className="text-xs text-slate-400">{trade.zoneType}</span>
              </td>
              <td className={cellClass}>{trade.entry}</td>
              <td className={cellClass}>{trade.stopLoss}</td>
              <td className={cellClass}>{trade.target}</td>
              <td className={cellClass}>
                <ResultBadge result={trade.result} />
              </td>
              <td className={cellClass}>
                <span className="font-medium text-sky-400">
                  {trade.rr.toFixed(2)}R
                </span>
              </td>
              <td className={cellClass}>
                <RuleBadge valid={trade.isValidRuleTrade} />
              </td>
              <td className={`${cellClass} text-right`}>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    title="Edit trade"
                    onClick={() => navigate(`/edit/${trade.id}`)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-sky-400"
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
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-rose-400"
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
