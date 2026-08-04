import type { Trade } from "../types/Trade";

export interface TradeStorage {
  getTrades: () => Trade[];
  getTrade: (id: string) => Trade | undefined;
  addTrade: (trade: Omit<Trade, "id">) => Trade;
  updateTrade: (trade: Trade) => Trade;
  deleteTrade: (id: string) => void;
  clearAllTrades: () => void;
  mergeTrades: (imported: Trade[]) => number;
}

export function createTradeStorage(storageKey: string): TradeStorage {
  function getTrades(): Trade[] {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Trade[]) : [];
    } catch {
      return [];
    }
  }

  function getTrade(id: string): Trade | undefined {
    return getTrades().find((trade) => trade.id === id);
  }

  function saveTrades(trades: Trade[]): void {
    localStorage.setItem(storageKey, JSON.stringify(trades));
  }

  function addTrade(trade: Omit<Trade, "id">): Trade {
    const created: Trade = { ...trade, id: crypto.randomUUID() };
    saveTrades([...getTrades(), created]);
    return created;
  }

  function updateTrade(trade: Trade): Trade {
    saveTrades(getTrades().map((t) => (t.id === trade.id ? trade : t)));
    return trade;
  }

  function deleteTrade(id: string): void {
    saveTrades(getTrades().filter((t) => t.id !== id));
  }

  function clearAllTrades(): void {
    localStorage.removeItem(storageKey);
  }

  function mergeTrades(imported: Trade[]): number {
    const existing = getTrades();
    const seen = new Set(existing.map((t) => t.id));
    const fresh = imported.filter((t) => !seen.has(t.id));
    if (fresh.length === 0) return 0;
    saveTrades([...existing, ...fresh]);
    return fresh.length;
  }

  return {
    getTrades,
    getTrade,
    addTrade,
    updateTrade,
    deleteTrade,
    clearAllTrades,
    mergeTrades,
  };
}
