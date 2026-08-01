import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Trade } from "../types/Trade";
import { createTradeStorage, type TradeStorage } from "./storage";
import { TradeContext } from "./TradeContext";
import { emailKey, useAuth } from "./authStore";

const DEFAULT_KEY = "tradelog.trades";

export function TradeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? emailKey(user.email) : DEFAULT_KEY;
  return (
    <KeyedTradeProvider key={storageKey} storageKey={storageKey}>
      {children}
    </KeyedTradeProvider>
  );
}

function KeyedTradeProvider({
  storageKey,
  children,
}: {
  storageKey: string;
  children: ReactNode;
}) {
  const storage = useMemo<TradeStorage>(
    () => createTradeStorage(storageKey),
    [storageKey],
  );

  const [trades, setTrades] = useState<Trade[]>(() => storage.getTrades());

  const value = useMemo(() => {
    function addTrade(trade: Omit<Trade, "id">): Trade {
      const created = storage.addTrade(trade);
      setTrades(storage.getTrades());
      return created;
    }

    function updateTrade(trade: Trade): Trade {
      const updated = storage.updateTrade(trade);
      setTrades(storage.getTrades());
      return updated;
    }

    function deleteTrade(id: string) {
      storage.deleteTrade(id);
      setTrades(storage.getTrades());
    }

    function duplicateTrade(id: string): Trade | undefined {
      const original = storage.getTrade(id);
      if (!original) return undefined;
      const clone = { ...original } as Partial<Trade>;
      delete clone.id;
      const copy = storage.addTrade({
        ...(clone as Omit<Trade, "id">),
        date: new Date().toISOString().slice(0, 10),
      });
      setTrades(storage.getTrades());
      return copy;
    }

    function clearAllTrades() {
      storage.clearAllTrades();
      setTrades([]);
    }

    function importTrades(imported: Trade[]): number {
      const merged = storage.mergeTrades(imported);
      setTrades(storage.getTrades());
      return merged;
    }

    return {
      trades,
      getTrade: (id: string) => storage.getTrade(id),
      addTrade,
      updateTrade,
      deleteTrade,
      duplicateTrade,
      clearAllTrades,
      importTrades,
    };
  }, [trades, storage]);

  return <TradeContext.Provider value={value}>{children}</TradeContext.Provider>;
}
