import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "../lib/themeStore";

const OPTIONS: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
  { mode: "light", icon: Sun, label: "Light theme" },
  { mode: "system", icon: Monitor, label: "System theme" },
  { mode: "dark", icon: Moon, label: "Dark theme" },
];

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700/60 dark:bg-slate-800/40">
      {OPTIONS.map(({ mode: m, icon: Icon, label }) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          aria-label={label}
          title={label}
          aria-pressed={mode === m}
          className={`flex-1 rounded-md p-1.5 transition-colors ${
            mode === m
              ? "bg-indigo-600 text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Icon className="mx-auto h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
