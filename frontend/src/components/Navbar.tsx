import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  List,
  PlusCircle,
  PieChart,
  CheckSquare,
  Newspaper,
  Menu,
  X,
  LineChart,
  LogOut,
  UserRound,
} from "lucide-react";
import { useAuth } from "../lib/authStore";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/log", label: "Trade Log", icon: List },
  { to: "/add", label: "Add Trade", icon: PlusCircle },
  { to: "/analytics", label: "Analytics", icon: PieChart },
  { to: "/checklist", label: "Rules Checklist", icon: CheckSquare },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/profile", label: "Profile", icon: UserRound },
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
                ? "bg-slate-200/80 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100",
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    setMobileOpen(false);
    navigate("/login");
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            navigate("/");
          }}
          className="flex items-center gap-2"
          aria-label="Go to dashboard"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
            <LineChart className="h-4 w-4 text-white" aria-hidden="true" />
          </span>
          <span className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-lg font-semibold text-transparent dark:from-indigo-300 dark:to-emerald-300">
            TradeLog
          </span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-28">
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
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
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white p-4 transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-auto",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-8 hidden items-center gap-2.5 lg:flex"
          aria-label="Go to dashboard"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600">
            <LineChart className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <span className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-xl font-semibold text-transparent dark:from-indigo-300 dark:to-emerald-300">
            TradeLog
          </span>
        </button>
        <div className="mt-14 flex-1 lg:mt-0">
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </div>
        {user && (
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="mb-3">
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-200">
                  {user.name}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <button
                type="button"
                title="Log out"
                aria-label="Log out"
                onClick={handleLogout}
                className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-rose-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
