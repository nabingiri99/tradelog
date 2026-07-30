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
    <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        <span className="text-slate-500">{icon}</span>
      </div>
      <p
        className={`mt-2 text-2xl font-semibold ${
          trend ? trendColors[trend] : "text-slate-100"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{subtext}</p>
    </div>
  );
}
