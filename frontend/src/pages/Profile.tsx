import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  UserRound,
  KeyRound,
  CheckCircle2,
  Wallet,
  Flame,
  Bell,
  DatabaseBackup,
} from "lucide-react";
import { useAuth } from "../lib/authStore";
import { useSettings } from "../lib/settingsStore";
import { useTrades } from "../lib/TradeContext";
import { getJournalingStreak } from "../lib/analytics";
import { api, type BackupStatus } from "../lib/api";

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
  const { trades } = useTrades();

  const [name, setName] = useState(user?.name ?? "");
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [balance, setBalance] = useState(
    user?.accountBalance != null ? String(user.accountBalance) : "",
  );
  const [balanceMsg, setBalanceMsg] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [reminderEnabled, setReminderEnabled] = useState(
    settings.journalReminderEnabled,
  );
  const [reminderTime, setReminderTime] = useState(settings.journalReminderTime);
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  const [backup, setBackup] = useState<BackupStatus | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const streak = useMemo(() => getJournalingStreak(trades), [trades]);

  useEffect(() => {
    api.backup
      .status()
      .then((res) => setBackup(res.data))
      .catch(() => setBackup(null));
  }, []);

  async function handleNameSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNameError(null);
    const result = await updateProfile({ name });
    if (!result.ok) {
      setNameError(result.error ?? "Could not update name.");
      return;
    }
    setNameMsg("Name updated.");
  }

  async function handleBalanceSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBalanceError(null);
    setBalanceMsg(null);
    const value = Number(balance);
    if (balance.trim() === "" || !Number.isFinite(value) || value < 0) {
      setBalanceError("Enter a non-negative number.");
      return;
    }
    const result = await updateProfile({ accountBalance: Math.round(value * 100) / 100 });
    if (!result.ok) {
      setBalanceError(result.error ?? "Could not update balance.");
      return;
    }
    setBalanceMsg("Account balance saved.");
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

  function handleReminderSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateSettings({
      journalReminderEnabled: reminderEnabled,
      journalReminderTime: reminderTime,
    });
    setReminderMsg(
      reminderEnabled
        ? `Daily journal reminder set for ${reminderTime}.`
        : "Journal reminder disabled.",
    );
  }

  async function handleBackupRun() {
    setBackupLoading(true);
    setBackupMsg(null);
    try {
      const res = await api.backup.run();
      setBackup(res.data);
      setBackupMsg("Backup completed.");
    } catch (err) {
      setBackupMsg(err instanceof Error ? err.message : "Backup failed.");
    } finally {
      setBackupLoading(false);
    }
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

        <Section icon={<Wallet className="h-4 w-4" />} title="Account Balance">
          <p className="mb-4 text-xs text-slate-500">
            Used to estimate risk % and max daily-loss levels on your dashboard.
          </p>
          <form onSubmit={handleBalanceSubmit} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="accountBalance">
                Account balance ($)
              </label>
              <input
                id="accountBalance"
                type="number"
                min={0}
                step="any"
                className={inputClass}
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="e.g. 10000"
              />
            </div>
            {balanceError && (
              <p className="text-sm text-rose-600 dark:text-rose-400">{balanceError}</p>
            )}
            <SuccessNote message={balanceMsg} />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Save Balance
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

        <Section icon={<Flame className="h-4 w-4" />} title="Journaling">
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-900">
            <Flame className="h-6 w-6 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {streak} day{streak === 1 ? "" : "s"} streak
              </p>
              <p className="text-xs text-slate-500">
                Consecutive days with at least one logged trade
              </p>
            </div>
          </div>
          <form onSubmit={handleReminderSubmit} className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="accent-indigo-500"
              />
              <span className="flex items-center gap-1.5">
                <Bell className="h-4 w-4" />
                Daily journal reminder
              </span>
            </label>
            <div className="flex items-end gap-3">
              <div className="w-40">
                <label className={labelClass} htmlFor="reminderTime">
                  Reminder time
                </label>
                <input
                  id="reminderTime"
                  type="time"
                  className={inputClass}
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  disabled={!reminderEnabled}
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Save Reminder
              </button>
            </div>
            <SuccessNote message={reminderMsg} />
            <p className="text-xs text-slate-500">
              Reminders show as a banner in the app when the set time is reached.
            </p>
          </form>
        </Section>

        <Section icon={<DatabaseBackup className="h-4 w-4" />} title="Automated Backups">
          <p className="mb-3 text-xs text-slate-500">
            The server dumps your journal to JSON automatically on a schedule.
          </p>
          {backup ? (
            <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
              <p>
                Status:{" "}
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {backup.enabled ? "Enabled" : "Disabled"}
                </span>
              </p>
              <p>
                Last run:{" "}
                <span className="font-medium">
                  {backup.lastRunAt
                    ? new Date(backup.lastRunAt).toLocaleString()
                    : "Never"}
                </span>
              </p>
              {backup.lastRunTradeCount != null && (
                <p>
                  Trades backed up:{" "}
                  <span className="font-medium">{backup.lastRunTradeCount}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Could not reach the backup service.</p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackupRun}
              disabled={backupLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DatabaseBackup className="h-4 w-4" />
              {backupLoading ? "Running..." : "Run Backup Now"}
            </button>
          </div>
          {backupMsg && (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{backupMsg}</p>
          )}
        </Section>
      </div>
    </div>
  );
}
