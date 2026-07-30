import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addTrade, updateTrade } from "../lib/storage";
import type {
  DirectionType,
  ResultType,
  SessionType,
  Trade,
  ZoneType,
} from "../types/Trade";

const COMMON_PAIRS = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "AUDUSD"] as const;
const SESSIONS: SessionType[] = ["London", "NewYork", "Overlap", "Other"];
const DIRECTIONS: DirectionType[] = ["Buy", "Sell"];
const ZONE_TYPES: ZoneType[] = ["Supply", "Demand"];
const RESULTS: ResultType[] = ["Open", "Win", "Loss", "BreakEven"];

const CUSTOM_PAIR = "__custom__";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-300";

function toggleClass(active: boolean): string {
  return [
    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "border-sky-500 bg-sky-500/15 text-sky-300"
      : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-100",
  ].join(" ");
}

export interface TradeFormProps {
  initialTrade?: Trade;
  onSubmitSuccess: () => void;
}

export default function TradeForm({
  initialTrade,
  onSubmitSuccess,
}: TradeFormProps) {
  const navigate = useNavigate();

  const [date, setDate] = useState(initialTrade?.date ?? today());
  const initialPairIsCommon =
    !initialTrade ||
    COMMON_PAIRS.includes(initialTrade.pair as (typeof COMMON_PAIRS)[number]);
  const [pairSelect, setPairSelect] = useState(
    initialPairIsCommon ? (initialTrade?.pair ?? COMMON_PAIRS[0]) : CUSTOM_PAIR,
  );
  const [customPair, setCustomPair] = useState(
    initialPairIsCommon ? "" : (initialTrade?.pair ?? ""),
  );
  const [session, setSession] = useState<SessionType>(
    initialTrade?.session ?? "London",
  );
  const [direction, setDirection] = useState<DirectionType>(
    initialTrade?.direction ?? "Buy",
  );
  const [zoneType, setZoneType] = useState<ZoneType>(
    initialTrade?.zoneType ?? "Demand",
  );
  const [entry, setEntry] = useState(
    initialTrade ? String(initialTrade.entry) : "",
  );
  const [stopLoss, setStopLoss] = useState(
    initialTrade ? String(initialTrade.stopLoss) : "",
  );
  const [target, setTarget] = useState(
    initialTrade ? String(initialTrade.target) : "",
  );
  const [result, setResult] = useState<ResultType>(
    initialTrade?.result ?? "Open",
  );
  const [notes, setNotes] = useState(initialTrade?.notes ?? "");
  const [isValidRuleTrade, setIsValidRuleTrade] = useState(
    initialTrade?.isValidRuleTrade ?? false,
  );
  const [error, setError] = useState<string | null>(null);

  const pair = pairSelect === CUSTOM_PAIR ? customPair.trim() : pairSelect;

  const rr = useMemo(() => {
    const entryValue = Number(entry);
    const stopValue = Number(stopLoss);
    const targetValue = Number(target);
    if (entry === "" || stopLoss === "" || target === "") return null;
    if (
      !Number.isFinite(entryValue) ||
      !Number.isFinite(stopValue) ||
      !Number.isFinite(targetValue)
    ) {
      return null;
    }
    const risk = Math.abs(entryValue - stopValue);
    if (risk === 0) return null;
    const reward = Math.abs(targetValue - entryValue);
    return Math.round((reward / risk) * 100) / 100;
  }, [entry, stopLoss, target]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!pair) {
      setError("Currency pair is required.");
      return;
    }
    const entryValue = Number(entry);
    const stopValue = Number(stopLoss);
    const targetValue = Number(target);
    if (
      entry === "" ||
      stopLoss === "" ||
      target === "" ||
      !Number.isFinite(entryValue) ||
      !Number.isFinite(stopValue) ||
      !Number.isFinite(targetValue)
    ) {
      setError("Entry, stop loss and target must be valid numbers.");
      return;
    }
    if (entryValue === stopValue) {
      setError("Entry price and stop loss price must be different.");
      return;
    }

    const payload = {
      date,
      pair: pair.toUpperCase(),
      session,
      direction,
      zoneType,
      entry: entryValue,
      stopLoss: stopValue,
      target: targetValue,
      result,
      rr: rr ?? 0,
      notes: notes.trim() || undefined,
      isValidRuleTrade,
    };

    if (initialTrade) {
      updateTrade({ ...payload, id: initialTrade.id });
    } else {
      addTrade(payload);
    }

    setError(null);
    onSubmitSuccess();
    navigate("/log");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            className={inputClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="pair">
            Currency Pair
          </label>
          <select
            id="pair"
            className={inputClass}
            value={pairSelect}
            onChange={(e) => setPairSelect(e.target.value)}
          >
            {COMMON_PAIRS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value={CUSTOM_PAIR}>Other (custom)</option>
          </select>
          {pairSelect === CUSTOM_PAIR && (
            <input
              type="text"
              aria-label="Custom currency pair"
              placeholder="e.g. USDCHF"
              className={`${inputClass} mt-2`}
              value={customPair}
              onChange={(e) => setCustomPair(e.target.value)}
            />
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="session">
            Session
          </label>
          <select
            id="session"
            className={inputClass}
            value={session}
            onChange={(e) => setSession(e.target.value as SessionType)}
          >
            {SESSIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className={labelClass}>Direction</span>
          <div className="flex gap-2">
            {DIRECTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={direction === option}
                className={toggleClass(direction === option)}
                onClick={() => setDirection(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={labelClass}>Zone Type</span>
          <div className="flex gap-2">
            {ZONE_TYPES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={zoneType === option}
                className={toggleClass(zoneType === option)}
                onClick={() => setZoneType(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="result">
            Result
          </label>
          <select
            id="result"
            className={inputClass}
            value={result}
            onChange={(e) => setResult(e.target.value as ResultType)}
          >
            {RESULTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="entry">
            Entry Price
          </label>
          <input
            id="entry"
            type="number"
            step="any"
            className={inputClass}
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="stopLoss">
            Stop Loss Price
          </label>
          <input
            id="stopLoss"
            type="number"
            step="any"
            className={inputClass}
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="target">
            Target Price
          </label>
          <input
            id="target"
            type="number"
            step="any"
            className={inputClass}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          />
        </div>

        <div className="flex items-end">
          <div className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Risk : Reward
            </p>
            <p className="text-2xl font-semibold text-sky-400">
              {rr === null ? "—" : `${rr.toFixed(2)}R`}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          className={inputClass}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-3 text-sm text-slate-300">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-600 bg-slate-800"
          checked={isValidRuleTrade}
          onChange={(e) => setIsValidRuleTrade(e.target.checked)}
        />
        Followed All Rules
      </label>

      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          {initialTrade ? "Update Trade" : "Save Trade"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/log")}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
