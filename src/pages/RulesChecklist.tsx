import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  X,
  ListChecks,
} from "lucide-react";
import { useAuth } from "../lib/authStore";
import {
  DEFAULT_RULES,
  isDefaultSet,
  loadRules,
  saveRules,
  type TradeRule,
} from "../lib/rulesStore";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

interface RuleFormState {
  label: string;
  category: string;
  description: string;
}

const EMPTY_FORM: RuleFormState = { label: "", category: "", description: "" };

function loadChecklist(key: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveChecklist(key: string, state: Record<string, boolean>) {
  localStorage.setItem(key, JSON.stringify(state));
}

export default function RulesChecklist() {
  const { user } = useAuth();
  const rulesKey = user ? `tradelog.rules.${user.email}` : "tradelog.rules";
  const checklistKey = user
    ? `tradelog.checklist.${user.email}`
    : "tradelog.checklist";
  return (
    <KeyedRules key={rulesKey} rulesKey={rulesKey} checklistKey={checklistKey} />
  );
}

function KeyedRules({
  rulesKey,
  checklistKey,
}: {
  rulesKey: string;
  checklistKey: string;
}) {
  const navigate = useNavigate();
  const [rules, setRules] = useState<TradeRule[]>(() => loadRules(rulesKey));
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    loadChecklist(checklistKey),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);

  const total = rules.length;
  const done = rules.filter((rule) => checked[rule.id]).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allComplete = total > 0 && done === total;
  const usingDefaults = isDefaultSet(rules);

  const categories: string[] = [];
  for (const rule of rules) {
    if (!categories.includes(rule.category)) categories.push(rule.category);
  }

  function persistRules(next: TradeRule[]) {
    setRules(next);
    saveRules(rulesKey, next);
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveChecklist(checklistKey, next);
      return next;
    });
  }

  function resetAll() {
    setChecked({});
    localStorage.removeItem(checklistKey);
  }

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function startEdit(rule: TradeRule) {
    setEditingId(rule.id);
    setForm({
      label: rule.label,
      category: rule.category,
      description: rule.description ?? "",
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  function handleSaveForm(event: React.FormEvent) {
    event.preventDefault();
    const label = form.label.trim();
    const category = form.category.trim() || "General";
    if (!label) return;
    const description = form.description.trim() || undefined;
    if (editingId) {
      persistRules(
        rules.map((rule) =>
          rule.id === editingId
            ? { ...rule, label, category, description }
            : rule,
        ),
      );
    } else {
      persistRules([
        ...rules,
        { id: crypto.randomUUID(), label, category, description },
      ]);
    }
    closeForm();
  }

  function deleteRule(id: string) {
    persistRules(rules.filter((rule) => rule.id !== id));
    setChecked((prev) => {
      const next = { ...prev };
      delete next[id];
      saveChecklist(checklistKey, next);
      return next;
    });
  }

  function moveRule(id: string, direction: "up" | "down") {
    const index = rules.findIndex((rule) => rule.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= rules.length) return;
    const current = rules[index];
    if (rules[target].category !== current.category) return;
    const next = [...rules];
    next[target] = current;
    next[index] = rules[target];
    persistRules(next);
  }

  function resetToDefaults() {
    persistRules(DEFAULT_RULES.map((rule) => ({ ...rule })));
    setChecked((prev) => {
      const next: Record<string, boolean> = {};
      for (const rule of DEFAULT_RULES) {
        if (prev[rule.id]) next[rule.id] = true;
      }
      saveChecklist(checklistKey, next);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Trading Rules</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {done} / {total} rules checked
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!usingDefaults && (
            <button
              type="button"
              onClick={resetToDefaults}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-600 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Defaults
            </button>
          )}
          {done > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-600 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear Checks
            </button>
          )}
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Add / Edit Rule Form */}
      {formOpen && (
        <form
          onSubmit={handleSaveForm}
          className="rounded-lg border border-indigo-500/40 bg-indigo-50 dark:bg-slate-800/70 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {editingId ? "Edit Rule" : "New Trading Rule"}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close rule form"
              className="rounded-lg p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="rule-label">
                Rule
              </label>
              <input
                id="rule-label"
                type="text"
                className={inputClass}
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Confirmation candle closes above the FVG"
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="rule-category">
                Category
              </label>
              <input
                id="rule-category"
                type="text"
                list="rule-categories"
                className={inputClass}
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="e.g. Risk Management"
              />
              <datalist id="rule-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelClass} htmlFor="rule-description">
                Description <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="rule-description"
                type="text"
                className={inputClass}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="e.g. No trade if the daily range is exceeded"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              {editingId ? "Save Changes" : "Add Rule"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allComplete ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Rule Groups */}
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-16 dark:border-slate-700">
          <ListChecks className="mb-4 h-12 w-12 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            No rules yet
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create your own trading rules to build a professional pre-trade checklist.
          </p>
          <button
            type="button"
            onClick={startAdd}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add Your First Rule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const groupRules = rules.filter((rule) => rule.category === category);
            return (
              <div
                key={category}
className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800/50"
                >
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    {category}
                  </span>
                  <span className="text-xs text-slate-500">
                    {groupRules.length} rule{groupRules.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800/70">
                  {groupRules.map((rule, groupIndex) => {
                    const isChecked = checked[rule.id] ?? false;
                    return (
                      <div
                        key={rule.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(rule.id)}
                          className="h-4 w-4 flex-shrink-0 rounded border-slate-600 bg-white text-indigo-500 accent-indigo-500 focus:ring-2 focus:ring-indigo-500/50 dark:bg-slate-800"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm ${
                              isChecked
                                ? "text-slate-600 dark:text-slate-400 line-through"
                                : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {rule.label}
                          </p>
                          {rule.description && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {rule.description}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5 text-slate-500">
                          <button
                            type="button"
                            onClick={() => moveRule(rule.id, "up")}
                            disabled={groupIndex === 0}
                            aria-label={`Move ${rule.label} up`}
                            className="rounded p-1 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRule(rule.id, "down")}
                            disabled={groupIndex === groupRules.length - 1}
                            aria-label={`Move ${rule.label} down`}
                            className="rounded p-1 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(rule)}
                            aria-label={`Edit ${rule.label}`}
                            className="rounded p-1 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRule(rule.id)}
                            aria-label={`Delete ${rule.label}`}
                            className="rounded p-1 transition-colors hover:bg-rose-600/20 hover:text-rose-600 dark:hover:text-rose-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Banner */}
      {total > 0 && (
        <div
          className={`rounded-lg border p-4 ${
            allComplete
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-amber-500/30 bg-amber-50 dark:bg-amber-500/10"
          }`}
        >
          <div className="flex items-start gap-3">
            {allComplete ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  allComplete
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-300"
                }`}
              >
                {allComplete
                  ? "Trade Valid - Execution Allowed"
                  : "Incomplete Rules - Proceed With Caution"}
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
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
      )}
    </div>
  );
}
