import type { ReactNode } from "react";

export interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  subtext: string;
  trend?: "up" | "down" | null;
}

const trendColors = {
  up: "text-emerald-400",
  down: "text-rose-400",
};

export default function StatCard({
  title,
  value,
  icon,
  subtext,
  trend,
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-700">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
        <span className="rounded-md bg-slate-100 p-1.5 text-slate-500 transition-colors group-hover:text-indigo-500 dark:bg-slate-700/40 dark:text-slate-400 dark:group-hover:text-indigo-400">
          {icon}
        </span>
      </div>
      <p
        className={`mt-2 text-2xl font-semibold ${
          trend ? trendColors[trend] : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{subtext}</p>
    </div>
  );
}
