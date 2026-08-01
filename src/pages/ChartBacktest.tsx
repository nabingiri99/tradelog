import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Loader2,
  Save,
  Upload,
  AlertCircle,
  TrendingUp,
  Trophy,
  Target,
} from "lucide-react";
import CandleChart, { type ChartOverlay } from "../components/CandleChart";
import { useTrades } from "../lib/TradeContext";
import {
  CRYPTO_SYMBOLS,
  INTERVALS,
  fetchKlines,
  parseOhlcCsv,
  formatCandleTime,
  formatDateKey,
  type Candle,
} from "../lib/market";

interface OpenPosition {
  id: string;
  direction: "Buy" | "Sell";
  entry: number;
  sl: number;
  tp: number;
  entryIndex: number;
  entryTime: number;
}

interface ClosedTrade {
  id: string;
  direction: "Buy" | "Sell";
  entry: number;
  sl: number;
  tp: number;
  exit: number;
  entryIndex: number;
  exitIndex: number;
  entryTime: number;
  exitTime: number;
  rr: number;
  result: "Win" | "Loss" | "BreakEven";
}

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-300";

function fmt(v: number): string {
  return v >= 100 ? v.toFixed(1) : v.toFixed(4);
}

function computeRr(entry: number, sl: number, tp: number): number {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk <= 0 || reward <= 0) return 1;
  return Math.round((reward / risk) * 100) / 100;
}

export default function ChartBacktest() {
  const navigate = useNavigate();
  const { addTrade } = useTrades();

  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [interval, setIntervalState] = useState<string>("15m");
  const [limit, setLimit] = useState(200);
  const [customLabel, setCustomLabel] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [showCsv, setShowCsv] = useState(false);

  const [data, setData] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const [viewEnd, setViewEnd] = useState(0);
  const [position, setPosition] = useState<OpenPosition | null>(null);
  const [slInput, setSlInput] = useState("");
  const [tpInput, setTpInput] = useState("");
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const playTimer = useRef<number | null>(null);
  const viewEndRef = useRef(0);
  const positionRef = useRef<OpenPosition | null>(null);

  const current = data[viewEnd];
  const pairLabel = customLabel ?? symbol;

  function applyCandles(candles: Candle[]) {
    const last = Math.max(0, candles.length - 1);
    setData(candles);
    viewEndRef.current = last;
    setViewEnd(last);
    setError(null);
  }

  function resetSessionState() {
    positionRef.current = null;
    setPosition(null);
    setClosedTrades([]);
    setPlaying(false);
    setMessage(null);
    setSaveMessage(null);
    setCsvError(null);
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setSaveMessage(null);
    setPosition(null);
    setClosedTrades([]);
    setPlaying(false);
    setCustomLabel(null);
    setCsvError(null);
    try {
      applyCandles(await fetchKlines(symbol, interval, limit));
    } catch (err) {
      setData([]);
      setError(err instanceof Error ? err.message : "Failed to load market data.");
    } finally {
      setLoading(false);
    }
  }

  function loadCsv() {
    setCsvError(null);
    setMessage(null);
    setSaveMessage(null);
    try {
      const candles = parseOhlcCsv(csvText);
      if (candles.length < 20) {
        setCsvError("Need at least 20 candles for backtesting.");
        return;
      }
      resetSessionState();
      setCustomLabel(csvText.trim().split(/\r?\n/)[0].split(",")[0].trim() || "CUSTOM");
      applyCandles(candles);
      setShowCsv(false);
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Could not parse CSV.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchKlines(symbol, interval, limit)
      .then((candles) => {
        if (cancelled) return;
        applyCandles(candles);
      })
      .catch((err) => {
        if (cancelled) return;
        setData([]);
        setError(err instanceof Error ? err.message : "Failed to load market data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-play stepping
  useEffect(() => {
    if (!playing) return;
    playTimer.current = window.setInterval(() => {
      if (viewEndRef.current >= data.length - 1) {
        setPlaying(false);
        return;
      }
      setCursor(viewEndRef.current + 1);
    }, 700);
    return () => {
      if (playTimer.current !== null) window.clearInterval(playTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, data.length]);

  const resolve = useCallback(
    (pos: OpenPosition, toIndex: number): ClosedTrade | null => {
      const start = pos.entryIndex + 1;
      const end = Math.min(toIndex, data.length - 1);
      if (start > end) return null;
      const isBuy = pos.direction === "Buy";
      const rr = computeRr(pos.entry, pos.sl, pos.tp);
      for (let j = start; j <= end; j++) {
        const bar = data[j];
        const slHit = isBuy ? bar.low <= pos.sl : bar.high >= pos.sl;
        const tpHit = isBuy ? bar.high >= pos.tp : bar.low <= pos.tp;
        if (slHit) {
          return {
            id: crypto.randomUUID(),
            direction: pos.direction,
            entry: pos.entry,
            sl: pos.sl,
            tp: pos.tp,
            exit: pos.sl,
            entryIndex: pos.entryIndex,
            exitIndex: j,
            entryTime: pos.entryTime,
            exitTime: bar.time,
            rr: -1,
            result: "Loss",
          };
        }
        if (tpHit) {
          return {
            id: crypto.randomUUID(),
            direction: pos.direction,
            entry: pos.entry,
            sl: pos.sl,
            tp: pos.tp,
            exit: pos.tp,
            entryIndex: pos.entryIndex,
            exitIndex: j,
            entryTime: pos.entryTime,
            exitTime: bar.time,
            rr,
            result: "Win",
          };
        }
      }
      return null;
    },
    [data],
  );

  // Advance the replay cursor and resolve the open position if SL/TP is hit
  function setCursor(next: number) {
    const n = Math.max(0, Math.min(data.length - 1, next));
    viewEndRef.current = n;
    setViewEnd(n);
    const pos = positionRef.current;
    if (!pos) return;
    const closed = resolve(pos, n);
    if (closed) {
      positionRef.current = null;
      setPosition(null);
      setClosedTrades((prev) => [...prev, closed]);
      setMessage(
        `${closed.result === "Win" ? "Take profit hit" : "Stop loss hit"} on ${pairLabel} at ${fmt(closed.exit)} (${closed.result === "Win" ? "+" : ""}${closed.rr}R)`,
      );
    }
  }

  function openPosition(direction: "Buy" | "Sell") {
    if (!current) return;
    const entry = current.close;
    const sl = Number(slInput);
    const tp = Number(tpInput);
    if (!slInput || !tpInput || !Number.isFinite(sl) || !Number.isFinite(tp)) {
      setMessage("Enter valid Stop Loss and Take Profit prices first.");
      return;
    }
    if (sl === tp || entry === sl) {
      setMessage("Stop Loss must differ from entry and target.");
      return;
    }
    const valid =
      direction === "Buy"
        ? sl < entry && tp > entry
        : sl > entry && tp < entry;
    if (!valid) {
      setMessage(
        direction === "Buy"
          ? "For a Buy: SL below entry, TP above entry."
          : "For a Sell: SL above entry, TP below entry.",
      );
      return;
    }
    const pos: OpenPosition = {
      id: crypto.randomUUID(),
      direction,
      entry,
      sl,
      tp,
      entryIndex: viewEnd,
      entryTime: current.time,
    };
    positionRef.current = pos;
    setPosition(pos);
    setMessage(`Opened ${direction} ${pairLabel} at ${fmt(entry)} (${computeRr(entry, sl, tp)}R)`);
  }

  function closeNow() {
    if (!position || !current) return;
    const isBuy = position.direction === "Buy";
    const pnl = isBuy ? current.close - position.entry : position.entry - current.close;
    const risk = Math.abs(position.entry - position.sl);
    const signedR = risk > 0 ? Math.round((pnl / risk) * 100) / 100 : 0;
    const result: ClosedTrade["result"] = pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "BreakEven";
    const trade: ClosedTrade = {
      id: crypto.randomUUID(),
      direction: position.direction,
      entry: position.entry,
      sl: position.sl,
      tp: position.tp,
      exit: current.close,
      entryIndex: position.entryIndex,
      exitIndex: viewEnd,
      entryTime: position.entryTime,
      exitTime: current.time,
      rr: signedR,
      result,
    };
    positionRef.current = null;
    setPosition(null);
    setClosedTrades((prev) => [...prev, trade]);
    setMessage(`Closed manually at ${fmt(current.close)} (${signedR >= 0 ? "+" : ""}${signedR}R)`);
  }

  function resetSession() {
    resetSessionState();
    const last = Math.max(0, data.length - 1);
    viewEndRef.current = last;
    setViewEnd(last);
  }

  function saveTrade(t: ClosedTrade) {
    addTrade({
      date: formatDateKey(t.exitTime),
      pair: pairLabel,
      session: "Other",
      direction: t.direction,
      zoneType: "Demand",
      entry: t.entry,
      stopLoss: t.sl,
      target: t.tp,
      result: t.result,
      rr: Math.abs(t.rr),
      notes: `Backtested on ${pairLabel} ${interval}`,
      isValidRuleTrade: false,
    });
    setSaveMessage(`Saved ${pairLabel} ${t.result.toLowerCase()} to Trade Log.`);
  }

  function saveAll() {
    closedTrades.forEach((t) => {
      addTrade({
        date: formatDateKey(t.exitTime),
        pair: pairLabel,
        session: "Other",
        direction: t.direction,
        zoneType: "Demand",
        entry: t.entry,
        stopLoss: t.sl,
        target: t.tp,
        result: t.result,
        rr: Math.abs(t.rr),
        notes: `Backtested on ${pairLabel} ${interval}`,
        isValidRuleTrade: false,
      });
    });
    setSaveMessage(`Saved ${closedTrades.length} trade${closedTrades.length === 1 ? "" : "s"} to Trade Log.`);
  }

  const stats = useMemo(() => {
    const wins = closedTrades.filter((t) => t.result === "Win").length;
    const losses = closedTrades.filter((t) => t.result === "Loss").length;
    const netR = closedTrades.reduce((s, t) => s + t.rr, 0);
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    return { wins, losses, netR, winRate, total: closedTrades.length };
  }, [closedTrades]);

  const overlays: ChartOverlay[] = position
    ? [
        { kind: "entry", price: position.entry, index: position.entryIndex, direction: position.direction },
        { kind: "sl", price: position.sl, index: position.entryIndex, direction: position.direction },
        { kind: "tp", price: position.tp, index: position.entryIndex, direction: position.direction },
      ]
    : [];

  const unrealizedR =
    position && current
      ? (() => {
          const risk = Math.abs(position.entry - position.sl);
          if (risk <= 0) return 0;
          const pnl =
            position.direction === "Buy"
              ? current.close - position.entry
              : position.entry - current.close;
          return Math.round((pnl / risk) * 100) / 100;
        })()
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            Chart Backtest
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Replay historical candles and journal the trades, TradingView-style
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/backtest")}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-slate-600 hover:text-slate-200"
        >
          View Backtest Progress →
        </button>
      </div>

      {/* Data controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 bg-slate-800/50 p-4">
        <div>
          <label className={labelClass} htmlFor="symbol">
            Symbol
          </label>
          <select
            id="symbol"
            className={inputClass}
            value={symbol}
            disabled={customLabel !== null}
            onChange={(e) => setSymbol(e.target.value)}
          >
            {CRYPTO_SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="interval">
            Timeframe
          </label>
          <select
            id="interval"
            className={inputClass}
            value={interval}
            onChange={(e) => setIntervalState(e.target.value)}
          >
            {INTERVALS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="limit">
            Candles
          </label>
          <select
            id="limit"
            className={inputClass}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[100, 200, 500, 1000].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading || customLabel !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Load Data
        </button>
        <button
          type="button"
          onClick={() => setShowCsv((s) => !s)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100"
        >
          <Upload className="h-4 w-4" />
          OHLC CSV
        </button>
        <p className="ml-auto text-xs text-slate-500">
          {customLabel
            ? `Data: custom CSV (${pairLabel})`
            : `Data: Binance ${symbol} ${interval}`}
        </p>
      </div>

      {showCsv && (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-800/50 p-4">
          <p className="text-sm text-slate-400">
            Paste OHLC data (columns: time, open, high, low, close[, volume]) to
            backtest any instrument, e.g. a TradingView export.
          </p>
          <textarea
            rows={5}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={"time,open,high,low,close\n2024-01-01,1.0850,1.0870,1.0830,1.0860\n..."}
            className={`${inputClass} font-mono text-xs`}
          />
          {csvError && (
            <p className="flex items-center gap-1 text-sm text-rose-400">
              <AlertCircle className="h-4 w-4" />
              {csvError}
            </p>
          )}
          <button
            type="button"
            onClick={loadCsv}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Load CSV Data
          </button>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {/* Chart */}
      {data.length > 0 && (
        <>
          <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-300">
                {pairLabel} · {interval}
              </h2>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-cyan-400" /> Entry
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 border-t border-dashed border-rose-400" /> SL
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 border-t border-dashed border-emerald-400" /> TP
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 border-t border-dashed border-indigo-400" /> Cursor
                </span>
              </div>
            </div>
            <CandleChart
              candles={data}
              focusIndex={viewEnd}
              interval={interval}
              overlays={overlays}
            />
          </div>

          {/* Replay controls */}
          <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-300">Replay</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Skip to start"
                  onClick={() => {
                    setCursor(0);
                    setPlaying(false);
                  }}
                  className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Previous candle"
                  onClick={() => {
                    setCursor(viewEnd - 1);
                    setPlaying(false);
                  }}
                  className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  {playing ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {playing ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  title="Next candle"
                  onClick={() => {
                    setCursor(viewEnd + 1);
                    setPlaying(false);
                  }}
                  className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Skip to latest"
                  onClick={() => {
                    setCursor(data.length - 1);
                    setPlaying(false);
                  }}
                  className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Reset session"
                  onClick={resetSession}
                  className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={data.length - 1}
              value={viewEnd}
              onChange={(e) => {
                setCursor(Number(e.target.value));
                setPlaying(false);
              }}
              className="w-full accent-indigo-500"
              aria-label="Replay position"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                {viewEnd + 1} / {data.length}
              </span>
              {current && (
                <span>
                  {formatCandleTime(current.time, interval)} — O {fmt(current.open)} · H{" "}
                  {fmt(current.high)} · L {fmt(current.low)} · C {fmt(current.close)}
                </span>
              )}
            </div>
          </div>

          {/* Trade panel */}
          <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-300">Trade</h2>
            {!position ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-36">
                  <label className={labelClass} htmlFor="sl">
                    Stop Loss
                  </label>
                  <input
                    id="sl"
                    type="number"
                    step="any"
                    className={inputClass}
                    value={slInput}
                    onChange={(e) => setSlInput(e.target.value)}
                    placeholder={current ? fmt(current.close) : ""}
                  />
                </div>
                <div className="w-36">
                  <label className={labelClass} htmlFor="tp">
                    Take Profit
                  </label>
                  <input
                    id="tp"
                    type="number"
                    step="any"
                    className={inputClass}
                    value={tpInput}
                    onChange={(e) => setTpInput(e.target.value)}
                    placeholder={current ? fmt(current.close) : ""}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => openPosition("Buy")}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Buy @ {current ? fmt(current.close) : "—"}
                </button>
                <button
                  type="button"
                  onClick={() => openPosition("Sell")}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
                >
                  Sell @ {current ? fmt(current.close) : "—"}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <div>
                  <p className="text-xs text-slate-500">Position</p>
                  <p
                    className={`text-sm font-semibold ${
                      position.direction === "Buy" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {position.direction} @ {fmt(position.entry)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">SL / TP</p>
                  <p className="text-sm text-slate-300">
                    {fmt(position.sl)} / {fmt(position.tp)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Unrealized</p>
                  <p
                    className={`text-sm font-semibold ${
                      unrealizedR >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {unrealizedR >= 0 ? "+" : ""}
                    {unrealizedR.toFixed(2)}R
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeNow}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600"
                >
                  Close @ {current ? fmt(current.close) : "—"}
                </button>
              </div>
            )}
            {message && (
              <p className="mt-3 text-sm text-indigo-300">{message}</p>
            )}
          </div>

          {/* Session stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Target className="h-4 w-4" />
                Trades
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {stats.total}
              </p>
              <p className="text-xs text-slate-500">
                {stats.wins}W / {stats.losses}L
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <TrendingUp className="h-4 w-4" />
                Net R
              </div>
              <p
                className={`mt-2 text-2xl font-semibold ${
                  stats.netR > 0
                    ? "text-emerald-400"
                    : stats.netR < 0
                      ? "text-rose-400"
                      : "text-slate-100"
                }`}
              >
                {stats.netR > 0 ? "+" : ""}
                {stats.netR.toFixed(2)}R
              </p>
              <p className="text-xs text-slate-500">This session</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Trophy className="h-4 w-4" />
                Win Rate
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {stats.total > 0 ? `${stats.winRate}%` : "—"}
              </p>
              <p className="text-xs text-slate-500">Closed trades</p>
            </div>
          </div>

          {/* Closed trades */}
          {closedTrades.length > 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-300">
                  Session Trades
                </h2>
                <button
                  type="button"
                  onClick={saveAll}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save All to Journal
                </button>
              </div>
              {saveMessage && (
                <p className="mb-3 text-sm text-emerald-400">{saveMessage}</p>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead>
                    <tr>
                      {["Entry", "Exit", "Dir", "R", "Result", ""].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {closedTrades.map((t) => (
                      <tr key={t.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-300">
                          {fmt(t.entry)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-300">
                          {fmt(t.exit)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-sm ${
                            t.direction === "Buy" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {t.direction}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-sm font-medium ${
                            t.rr > 0 ? "text-emerald-400" : t.rr < 0 ? "text-rose-400" : "text-slate-300"
                          }`}
                        >
                          {t.rr > 0 ? "+" : ""}
                          {t.rr.toFixed(2)}R
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-300">
                          {t.result}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => saveTrade(t)}
                            className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {data.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-20">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-slate-600" />
          <h3 className="text-base font-medium text-slate-300">Loading market data...</h3>
        </div>
      )}
    </div>
  );
}
