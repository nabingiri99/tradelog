import { useState } from "react";
import type { ReactNode } from "react";
import { UserRound, KeyRound, Target, CheckCircle2 } from "lucide-react";
import { useAuth } from "../lib/authStore";
import { useSettings } from "../lib/settingsStore";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-800/50">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
        <span className="text-indigo-600 dark:text-indigo-400">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function SuccessNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-2 flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-4 w-4" />
      {message}
    </p>
  );
}

export default function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const { settings, updateSettings } = useSettings();

  const [name, setName] = useState(user?.name ?? "");
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [goal, setGoal] = useState(String(settings.backtestGoal));
  const [goalMsg, setGoalMsg] = useState<string | null>(null);

  async function handleNameSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNameError(null);
    const result = await updateProfile(name);
    if (!result.ok) {
      setNameError(result.error ?? "Could not update name.");
      return;
    }
    setNameMsg("Name updated.");
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    const result = await changePassword(currentPassword, newPassword);
    if (!result.ok) {
      setPasswordError(result.error ?? "Could not change password.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg("Password changed.");
  }

  function handleGoalSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(goal);
    if (!Number.isFinite(value) || value < 1) {
      setGoalMsg(null);
      return;
    }
    updateSettings({ backtestGoal: Math.round(value) });
    setGoal(String(Math.round(value)));
    setGoalMsg(`Backtest goal set to ${Math.round(value)} trades.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Profile</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage your account and trading preferences
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section icon={<UserRound className="h-4 w-4" />} title="Account">
          <p className="mb-4 text-xs text-slate-500">
            Email: <span className="text-slate-700 dark:text-slate-300">{user?.email}</span>
          </p>
          <form onSubmit={handleNameSubmit} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="displayName">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {nameError && <p className="text-sm text-rose-600 dark:text-rose-400">{nameError}</p>}
            <SuccessNote message={nameMsg} />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Save Name
            </button>
          </form>
        </Section>

        <Section icon={<KeyRound className="h-4 w-4" />} title="Change Password">
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="currentPassword">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="newPassword">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {passwordError && (
              <p className="text-sm text-rose-600 dark:text-rose-400">{passwordError}</p>
            )}
            <SuccessNote message={passwordMsg} />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Change Password
            </button>
          </form>
        </Section>

        <Section icon={<Target className="h-4 w-4" />} title="Backtest Goal">
          <form onSubmit={handleGoalSubmit} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="goal">
                Target number of backtested trades
              </label>
              <input
                id="goal"
                type="number"
                min={1}
                className={inputClass}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                required
              />
            </div>
            <SuccessNote message={goalMsg} />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Save Goal
            </button>
          </form>
        </Section>
      </div>
    </div>
  );
}
