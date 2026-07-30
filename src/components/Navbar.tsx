import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  List,
  PlusCircle,
  CheckSquare,
  TrendingUp,
  Menu,
  X,
  LineChart,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/log", label: "Trade Log", icon: List },
  { to: "/add", label: "Add Trade", icon: PlusCircle },
  { to: "/checklist", label: "Rules Checklist", icon: CheckSquare },
  { to: "/backtest", label: "Backtest Progress", icon: TrendingUp },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
            ].join(" ")
          }
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <LineChart className="h-6 w-6 text-emerald-400" aria-hidden="true" />
          <span className="text-lg font-semibold text-slate-100">TradeLog</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-900 p-4 transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-auto",
        ].join(" ")}
      >
        <div className="mb-8 hidden items-center gap-2 lg:flex">
          <LineChart className="h-7 w-7 text-emerald-400" aria-hidden="true" />
          <span className="text-xl font-semibold text-slate-100">TradeLog</span>
        </div>
        <div className="mt-14 lg:mt-0">
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </div>
      </aside>
    </>
  );
}
