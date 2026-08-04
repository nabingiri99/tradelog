export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const CRYPTO_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "TONUSDT",
] as const;

export const INTERVALS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;

export async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number,
): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      res.status === 429
        ? "Market data rate limit reached. Try again shortly."
        : `Market data request failed (HTTP ${res.status}).`,
    );
  }
  const data = (await res.json()) as Array<Array<string | number>>;
  return data.map((k) => ({
    time: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseOhlcCsv(content: string): Candle[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => normalizeHeader(h.trim()));
  const idx = (names: string[]): number => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const timeCol = idx(["time", "date", "datetime", "timestamp", "opentime"]);
  const openCol = idx(["open", "o"]);
  const highCol = idx(["high", "h"]);
  const lowCol = idx(["low", "l"]);
  const closeCol = idx(["close", "c"]);
  const volCol = idx(["volume", "vol", "v"]);

  if (openCol < 0 || highCol < 0 || lowCol < 0 || closeCol < 0) {
    throw new Error(
      "CSV needs time (optional), open, high, low and close columns.",
    );
  }

  const candles: Candle[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const get = (i: number): number => {
      if (i < 0) return 0;
      const n = Number(cells[i]);
      return Number.isFinite(n) ? n : NaN;
    };
    const open = get(openCol);
    const high = get(highCol);
    const low = get(lowCol);
    const close = get(closeCol);
    if (![open, high, low, close].every((v) => Number.isFinite(v))) continue;

    let time = get(timeCol);
    if (Number.isFinite(time) && time < 1_000_000_000_000) {
      time *= 1000;
    }
    if (!Number.isFinite(time)) {
      time = Date.now();
    }

    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume: Number.isFinite(get(volCol)) ? get(volCol) : 0,
    });
  }
  return candles;
}

export function formatCandleTime(time: number, interval: string): string {
  const d = new Date(time);
  if (interval.includes("1d") || interval === "1M") {
    return d.toISOString().slice(0, 10);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateKey(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}
