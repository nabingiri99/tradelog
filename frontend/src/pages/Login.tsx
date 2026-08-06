import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LineChart,
  Loader2,
  ChartCandlestick,
  TrendingUp,
  BookOpen,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  Lock,
  Info,
} from "lucide-react";
import { useAuth } from "../lib/authStore";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800";
const labelClass =
  "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

const FEATURES = [
  {
    icon: ChartCandlestick,
    title: "Candlestick chart backtesting",
    text: "Replay historical candles with a TradingView-style chart and journal the results.",
  },
  {
    icon: TrendingUp,
    title: "Performance analytics",
    text: "Win rates by session and setup, streaks, and R:R execution quality.",
  },
  {
    icon: BookOpen,
    title: "Custom trading rules",
    text: "Build your own pre-trade checklist and validate every entry against it.",
  },
  {
    icon: ShieldCheck,
    title: "Server-backed & secure",
    text: "Your journal lives in your own MongoDB database, protected by JWT authentication.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: LineChart,
    title: "Log your trades",
    text: "Record every entry, stop-loss, and take-profit with setup, session, and R:R in seconds.",
  },
  {
    step: "02",
    icon: BookOpen,
    title: "Review against your rules",
    text: "Validate each entry against your custom pre-trade checklist before and after the trade.",
  },
  {
    step: "03",
    icon: ChartCandlestick,
    title: "Backtest your strategy",
    text: "Replay historical candles with a TradingView-style chart and measure your edge over time.",
  },
];

const CHANGELOG = [
  {
    version: "1.2.0",
    date: "August 2026",
    summary: "Landing page & observability",
    items: [
      { type: "Added", text: "Branded header and landing sections (How it works, Changelog, About)" },
      { type: "Added", text: "Live request logging with method, path, status, and latency for every API call" },
      { type: "Improved", text: "Login page redesigned with a professional header, footer, and release history" },
      { type: "Improved", text: "Responsive layout polish for tablets and small screens" },
    ],
  },
  {
    version: "1.1.0",
    date: "August 2026",
    summary: "Local-first setup",
    items: [
      { type: "Added", text: "Local MongoDB with one-command start scripts for Linux, macOS, and Windows" },
      { type: "Added", text: "Windows PowerShell installer that downloads, extracts, and starts MongoDB automatically" },
      { type: "Added", text: "Idempotent start/stop scripts that handle the full stack (MongoDB, backend, frontend)" },
      { type: "Improved", text: "Automatic .env generation with a secure random JWT secret" },
      { type: "Improved", text: "Health-check on startup so the app only boots once the database is reachable" },
      { type: "Fixed", text: "MongoDB PATH resolution on Windows when the mongod binary lives in a nested folder" },
    ],
  },
  {
    version: "1.0.0",
    date: "July 2026",
    summary: "Initial release",
    items: [
      { type: "Added", text: "JWT authentication with per-user trade isolation and remember-me sessions" },
      { type: "Added", text: "Server-backed journal: full CRUD, optimistic updates, and undo" },
      { type: "Added", text: "CSV import/export for backup and offline analysis" },
      { type: "Added", text: "Dashboard analytics: win rate, total R, average R, streaks, and session breakdowns" },
      { type: "Added", text: "Custom pre-trade rules checklist to validate every entry" },
      { type: "Added", text: "Backtest progress tracker and TradingView-style candlestick chart backtester" },
      { type: "Added", text: "Equity curve and performance charts powered by Recharts" },
      { type: "Added", text: "Dark mode with a light/dark theme toggle" },
    ],
  },
];

const CHANGELOG_BADGES: Record<string, string> = {
  Added: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  Improved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Fixed: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

const ABOUT_TEXT =
  "TradeLog is a full-stack trading journal and backtester built with React, Express, and MongoDB. Every account owns an isolated journal, trades are stored server-side, and all sessions are protected with JWT authentication. Your data stays in your own database - local by default, cloud-ready on demand.";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname ?? "/";

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, from, navigate]);

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError(null);
    setShowPassword(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "register") {
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      setLoading(true);
      const result = await register(name, email, password);
      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? "Registration failed.");
        return;
      }
      navigate(from, { replace: true });
      return;
    }

    setLoading(true);
    const result = await login(email, password, remember);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Login failed.");
      return;
    }
    navigate(from, { replace: true });
  }

  const isRegister = mode === "register";

  return (
    <div id="top" className="relative flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950">
      {/* Top header bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="TradeLog home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-900/20">
              <LineChart className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <span>
              <span className="block bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-lg font-bold leading-none text-transparent dark:from-indigo-300 dark:to-emerald-300">
                TradeLog
              </span>
              <span className="mt-0.5 block text-[11px] leading-none text-slate-500">
                Trading Journal &amp; Backtester
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400 md:flex">
            {[
              ["#features", "Features"],
              ["#how", "How it works"],
              ["#security", "Security"],
              ["#changelog", "Changelog"],
              ["#about", "About"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="group relative py-1 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
              >
                {label}
                <span className="absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-indigo-600 to-emerald-600 transition-transform duration-200 group-hover:scale-x-100" />
              </a>
            ))}
          </nav>

          <a
            href="#signin"
            className="hidden rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-900/20 transition-colors hover:bg-indigo-500 sm:inline-flex"
          >
            Sign in
          </a>
        </div>
      </header>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/4 h-[32rem] w-[32rem] rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/15" />
        <div className="absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-600/10" />
        <div className="absolute right-1/3 top-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-600/10" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(100,116,139,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.06)_1px,transparent_1px)] bg-[size:48px_48px] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.04)_1px,transparent_1px)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-10 px-6 py-12 lg:flex-row lg:gap-20">
        {/* Brand panel */}
        <div className="w-full max-w-lg lg:flex-1">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-900/30">
              <LineChart className="h-6 w-6 text-white" aria-hidden="true" />
            </span>
            <div>
              <p className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-2xl font-bold text-transparent dark:from-indigo-300 dark:to-emerald-300">
                TradeLog
              </p>
              <p className="text-xs text-slate-500">Trading Journal & Backtester</p>
            </div>
          </div>

          <h1 className="mt-8 text-3xl font-bold leading-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Trade smarter.
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent dark:from-indigo-300 dark:to-emerald-300">
              Journal every trade.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Track every entry, review your rules, and backtest strategies on
            live market data — all from one focused workspace.
          </p>

          <ul id="features" className="mt-8 space-y-4">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-indigo-400">
                  <feature.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                    {feature.title}
                  </p>
                  <p className="text-xs text-slate-500">{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div id="security" className="mt-8 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-700 dark:border-emerald-800/40 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                <span className="font-medium">Server-backed & secure.</span>{" "}
                Your journal data is stored in your MongoDB database behind
                JWT authentication.
              </p>
          </div>
        </div>

        {/* Form panel */}
        <div id="signin" className="w-full max-w-md lg:w-[26rem] lg:flex-none scroll-mt-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/40 dark:backdrop-blur sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {isRegister ? "Create your account" : "Welcome back"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isRegister
                  ? "Start journaling your trades in under a minute."
                  : "Sign in to continue to your journal."}
              </p>
            </div>

            <div className="mb-6 flex rounded-lg border border-slate-300 p-1 dark:border-slate-700">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "login"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "register"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className={labelClass} htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    className={inputClass}
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <label className={labelClass} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    className={`${inputClass} pr-10`}
                    placeholder={isRegister ? "Create a password" : "Your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className={labelClass} htmlFor="confirm">
                    Confirm Password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
              )}

              {!isRegister && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 bg-slate-100 accent-indigo-500 dark:border-slate-600 dark:bg-slate-800"
                  />
                  Remember me
                </label>
              )}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-800/50 dark:text-rose-300"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500 dark:bg-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" aria-hidden="true" />
                )}
                {loading
                  ? isRegister
                    ? "Creating account..."
                    : "Signing in..."
                  : isRegister
                    ? "Create Account"
                    : "Sign In"}
                {!loading && (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              {isRegister ? "Already have an account? " : "New to TradeLog? "}
              <button
                type="button"
                onClick={() => switchMode(isRegister ? "login" : "register")}
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {isRegister ? "Sign in instead" : "Create an account"}
              </button>
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-600">
            <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            Your journal data is stored in your MongoDB database.
          </div>
        </div>
      </div>

      {/* How it works */}
      <section id="how" className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 sm:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            How it works
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
            From entry to edge in three steps
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-2xl font-bold text-slate-200 dark:text-slate-700">
                  {item.step}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Changelog */}
      <section id="changelog" className="relative z-10 mx-auto w-full max-w-3xl px-6 py-16 sm:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Changelog
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
            Release history
          </h2>
        </div>
        <div className="mt-10 space-y-8">
          {CHANGELOG.map((entry) => (
            <article
              key={entry.version}
              className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-slate-900 px-2.5 py-1 font-mono text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                    v{entry.version}
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {entry.summary}
                  </h3>
                </div>
                <time className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {entry.date}
                </time>
              </div>
              <ul className="mt-4 space-y-2.5">
                {entry.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <span
                      className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${CHANGELOG_BADGES[item.type] ?? "bg-slate-500/10 text-slate-600 dark:text-slate-400"}`}
                    >
                      {item.type}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-16 sm:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
            <Info className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
            About TradeLog
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {ABOUT_TEXT}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
              React
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
              Express
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
              MongoDB
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
              JWT Auth
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
              Node.js
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/70 px-6 py-4 text-center text-xs text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-600">
        &copy; {new Date().getFullYear()} TradeLog &mdash; Your journal data is stored in your own MongoDB database behind JWT authentication.
      </footer>
    </div>
  );
}
