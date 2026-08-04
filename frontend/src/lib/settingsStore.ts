import { createContext, useContext } from "react";

export interface UserSettings {
  backtestGoal: number;
}

export interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
}

export const DEFAULT_SETTINGS: UserSettings = { backtestGoal: 50 };

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
