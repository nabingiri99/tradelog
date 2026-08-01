import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_SETTINGS,
  SettingsContext,
  type UserSettings,
} from "./settingsStore";
import { useAuth } from "./authStore";

const DEFAULT_KEY = "tradelog.settings";

function loadSettings(key: string): UserSettings {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `tradelog.settings.${user.email}` : DEFAULT_KEY;
  return (
    <KeyedSettings key={storageKey} storageKey={storageKey}>
      {children}
    </KeyedSettings>
  );
}

function KeyedSettings({
  storageKey,
  children,
}: {
  storageKey: string;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<UserSettings>(() =>
    loadSettings(storageKey),
  );

  const value = useMemo(
    () => ({
      settings,
      updateSettings: (partial: Partial<UserSettings>) => {
        const next = { ...settings, ...partial };
        localStorage.setItem(storageKey, JSON.stringify(next));
        setSettings(next);
      },
    }),
    [settings, storageKey],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}
