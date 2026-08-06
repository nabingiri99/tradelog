import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { useTrades } from "../lib/TradeContext";
import { fileToCompressedDataUrl } from "../lib/image";
import { useAuth } from "../lib/authStore";
import { loadRules } from "../lib/rulesStore";
import type {
  DirectionType,
  ResultType,
  SessionType,
  Trade,
} from "../types/Trade";

const COMMON_PAIRS = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "AUDUSD"] as const;
const SESSIONS: SessionType[] = ["London", "NewYork", "Overlap", "Other"];
const DIRECTIONS: DirectionType[] = ["Buy", "Sell"];
const RESULTS: ResultType[] = ["Open", "Win", "Loss", "BreakEven"];
const EMOTIONS = [
  { value: "Calm", label: "Calm" },
  { value: "Confident", label: "Confident" },
  { value: "Neutral", label: "Neutral" },
  { value: "Anxious", label: "Anxious" },
  { value: "Fearful", label: "Fearful" },
  { value: "Greedy", label: "Greedy" },
] as const;
const REASONS = [
  { value: "", label: "Select reason (optional)" },
  { value: "Followed plan", label: "Followed plan" },
  { value: "Good discipline", label: "Good discipline" },
  { value: "FOMO entry", label: "FOMO entry" },
  { value: "Moved stop loss", label: "Moved stop loss" },
  { value: "Early exit", label: "Early exit" },
  { value: "Held too long", label: "Held too long" },
  { value: "Ignored rules", label: "Ignored rules" },
  { value: "News spike", label: "News spike" },
  { value: "Other", label: "Other" },
] as const;

const CUSTOM_PAIR = "__custom__";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const inputClass =
  "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

function toggleClass(active: boolean): string {
  return [
    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
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
  const { addTrade, updateTrade } = useTrades();
  const [searchParams] = useSearchParams();
  const validFromQuery = searchParams.get("valid") === "true";

  const { user } = useAuth();
  const rulesKey = user ? `tradelog.rules.${user.email}` : "tradelog.rules";
  const rules = useMemo(() => loadRules(rulesKey), [rulesKey]);

  const [date, setDate] = useState(initialTrade?.date ?? today());
  const [entryTime, setEntryTime] = useState(initialTrade?.entryTime ?? "");
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
  const [tagsText, setTagsText] = useState(initialTrade?.tags?.join(", ") ?? "");
  const [emotion, setEmotion] = useState(initialTrade?.emotion ?? "");
  const [reason, setReason] = useState(initialTrade?.reason ?? "");
  const [screenshot, setScreenshot] = useState(initialTrade?.screenshot ?? "");
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [isValidRuleTrade, setIsValidRuleTrade] = useState(
    initialTrade?.isValidRuleTrade ?? validFromQuery,
  );
  const [ruleChecks, setRuleChecks] = useState<Record<string, boolean>>(() => {
    if (initialTrade?.isValidRuleTrade || validFromQuery) {
      return Object.fromEntries(rules.map((rule) => [rule.id, true]));
    }
    return {};
  });
  const rulesCheckedCount = rules.filter((rule) => ruleChecks[rule.id]).length;
  const allRulesChecked =
    rules.length > 0 && rulesCheckedCount === rules.length;
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

  function toggleRule(id: string) {
    setRuleChecks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      setIsValidRuleTrade(
        rules.length > 0 && rules.every((rule) => next[rule.id]),
      );
      return next;
    });
  }

  function handleMasterRules(checked: boolean) {
    setIsValidRuleTrade(checked);
    setRuleChecks(
      checked
        ? Object.fromEntries(rules.map((rule) => [rule.id, true]))
        : {},
    );
  }

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

    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      date,
      entryTime: entryTime || undefined,
      pair: pair.toUpperCase(),
      session,
      direction,
      entry: entryValue,
      stopLoss: stopValue,
      target: targetValue,
      result,
      rr: rr ?? 0,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      emotion: emotion || undefined,
      reason: reason || undefined,
      screenshot: screenshot || undefined,
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

  async function handleScreenshotFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setScreenshotError("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setScreenshotError("Image is too large (max 10 MB).");
      return;
    }
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setScreenshot(dataUrl);
      setScreenshotError(null);
    } catch {
      setScreenshotError("Could not process the image.");
    }
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
          <label className={labelClass} htmlFor="entryTime">
            Entry Time <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="entryTime"
            type="time"
            className={inputClass}
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
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

        <div>
          <label className={labelClass} htmlFor="emotion">
            Emotion
          </label>
          <select
            id="emotion"
            className={inputClass}
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
          >
            <option value="">Select emotion (optional)</option>
            {EMOTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="reason">
            Win / Loss Reason
          </label>
          <select
            id="reason"
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <div className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Risk : Reward
            </p>
            <p className="text-2xl font-semibold text-violet-400">
              {rr === null ? "—" : `${rr.toFixed(2)}R`}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Trade Screenshot</label>
        {screenshot ? (
          <div className="relative inline-block">
            <img
              src={screenshot}
              alt="Trade screenshot"
              className="max-h-56 rounded-lg border border-slate-300 dark:border-slate-700"
            />
            <button
              type="button"
              title="Remove screenshot"
              onClick={() => setScreenshot("")}
              className="absolute -right-2 -top-2 rounded-full bg-slate-700 p-1 text-slate-700 dark:text-slate-300 hover:bg-rose-600 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-600 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScreenshotFile}
            />
            Upload chart screenshot
          </label>
        )}
        {screenshotError && (
          <p role="alert" className="mt-1 text-sm text-rose-600 dark:text-rose-400">
            {screenshotError}
          </p>
        )}
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

      <div>
        <label className={labelClass} htmlFor="tags">
          Tags
        </label>
        <input
          id="tags"
          type="text"
          placeholder="e.g. news, revenge, scalp (comma separated)"
          className={inputClass}
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
        />
      </div>

      <div>
        <span className={labelClass}>Trading Rules</span>
        {rules.length > 0 ? (
          <div className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {rulesCheckedCount} / {rules.length} rules followed
              </p>
              {!allRulesChecked && (
                <button
                  type="button"
                  onClick={() => handleMasterRules(true)}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                >
                  Check all
                </button>
              )}
            </div>
            <div className="space-y-1">
              {rules.map((rule) => {
                const isChecked = ruleChecks[rule.id] ?? false;
                return (
                  <label
                    key={rule.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/40"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRule(rule.id)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-white dark:bg-slate-800 accent-indigo-500"
                    />
                    <span>
                      <span
                        className={`block text-sm ${
                          isChecked
                            ? "text-slate-600 dark:text-slate-400 line-through"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {rule.label}
                      </span>
                      {rule.description && (
                        <span className="block text-xs text-slate-500">
                          {rule.description}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-3 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isValidRuleTrade}
                onChange={(e) => handleMasterRules(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-white dark:bg-slate-800 accent-indigo-500"
              />
              Followed All Rules
            </label>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2.5">
            <p className="text-sm text-slate-600 dark:text-slate-400">No rules configured yet.</p>
            <button
              type="button"
              onClick={() => navigate("/checklist")}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Create rules
            </button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          {initialTrade ? "Update Trade" : "Save Trade"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/log")}
          className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
