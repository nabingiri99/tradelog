import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../lib/authStore";

const ITEMS = [
  { id: "session", label: "Trading Session active?" },
  { id: "bias", label: "4H Bias clear and aligned?" },
  { id: "structure", label: "1H Structure confirmed?" },
  { id: "poi", label: "Price at designated POI (Order Block / FVG)?" },
  { id: "liquidity", label: "Liquidity Sweep completed?" },
  { id: "mss", label: "Market Structure Shift (MSS) confirmed on 15M/5M?" },
  { id: "risk", label: "Risk is <= 1% of account?" },
  { id: "rr", label: "Minimum 1:2 R:R target met?" },
  { id: "news", label: "High-impact news avoided within 30 minutes?" },
] as const;

function loadState(key: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveState(key: string, state: Record<string, boolean>) {
  localStorage.setItem(key, JSON.stringify(state));
}

export default function RulesChecklist() {
  const { user } = useAuth();
  const storageKey = user ? `tradelog.checklist.${user.email}` : "tradelog.checklist";
  return <KeyedChecklist key={storageKey} storageKey={storageKey} />;
}

function KeyedChecklist({ storageKey }: { storageKey: string }) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    loadState(storageKey),
  );

  const total = ITEMS.length;
  const done = ITEMS.filter((item) => checked[item.id]).length;
  const pct = Math.round((done / total) * 100);
  const allComplete = done === total;

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveState(storageKey, next);
      return next;
    });
  }

  function resetAll() {
    setChecked({});
    localStorage.removeItem(storageKey);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            Rules Checklist
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {done} / {total} rules checked
          </p>
        </div>
        {done > 0 && (
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-slate-600 hover:text-slate-200"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allComplete ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-1">
        {ITEMS.map((item) => {
          const isChecked = checked[item.id] ?? false;
          return (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 px-4 py-3 transition-colors hover:bg-slate-800/60"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(item.id)}
                className="h-4 w-4 flex-shrink-0 rounded border-slate-600 bg-slate-800 text-indigo-500 accent-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
              />
              <span
                className={`text-sm ${
                  isChecked ? "text-slate-400 line-through" : "text-slate-200"
                }`}
              >
                {item.label}
              </span>
            </label>
          );
        })}
      </div>

      {/* Dynamic Banner */}
      <div
        className={`rounded-lg border p-4 ${
          allComplete
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-amber-500/30 bg-amber-500/10"
        }`}
      >
        <div className="flex items-start gap-3">
          {allComplete ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          )}
          <div className="flex-1">
            <p
              className={`text-sm font-medium ${
                allComplete ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {allComplete
                ? "Trade Valid - Execution Allowed"
                : "Incomplete Rules - Proceed With Caution"}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {allComplete
                ? "All rules have been satisfied. You may proceed with the trade."
                : `${total - done} rule${total - done === 1 ? "" : "s"} still need${total - done === 1 ? "s" : ""} attention before this trade is fully validated.`}
            </p>
            {allComplete && (
              <button
                type="button"
                onClick={() => navigate("/add?valid=true")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Log Valid Trade
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
