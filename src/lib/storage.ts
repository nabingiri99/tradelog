import type { Trade } from "../types/Trade";

const STORAGE_KEY = "tradelog.trades";

export function getTrades(): Trade[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Trade[]) : [];
  } catch {
    return [];
  }
}

export function getTrade(id: string): Trade | undefined {
  return getTrades().find((trade) => trade.id === id);
}

function saveTrades(trades: Trade[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

export function addTrade(trade: Omit<Trade, "id">): Trade {
  const created: Trade = { ...trade, id: crypto.randomUUID() };
  saveTrades([...getTrades(), created]);
  return created;
}

export function updateTrade(trade: Trade): Trade {
  saveTrades(getTrades().map((t) => (t.id === trade.id ? trade : t)));
  return trade;
}

export function deleteTrade(id: string): void {
  saveTrades(getTrades().filter((t) => t.id !== id));
}
