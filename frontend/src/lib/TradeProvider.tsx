import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Trade } from "../types/Trade";
import { TradeContext } from "./TradeContext";
import { api } from "./api";
import { useAuth } from "./authStore";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TradeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [lastDeleted, setLastDeleted] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tradesRef = useRef<Trade[]>([]);
  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  const reloadTrades = useCallback(async () => {
    try {
      const res = await api.trades.list();
      tradesRef.current = res.data;
      setTrades(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load trades.");
    }
  }, []);

  useEffect(() => {
    if (!user) {
      tradesRef.current = [];
      Promise.resolve().then(() => {
        setTrades([]);
        setLastDeleted([]);
        setLoading(false);
        setError(null);
      });
      return;
    }

    let cancelled = false;
    api.trades
      .list()
      .then((res) => {
        if (cancelled) return;
        tradesRef.current = res.data;
        setTrades(res.data);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load trades.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, reloadTrades]);

  const value = useMemo(
    () => {
      function addTrade(trade: Omit<Trade, "id">): Trade {
        const optimistic: Trade = { ...trade, id: crypto.randomUUID() };
        setTrades((prev) => [...prev, optimistic]);
        setError(null);
        api.trades
          .create(optimistic)
          .then((res) => {
            setTrades((prev) =>
              prev.map((t) => (t.id === optimistic.id ? res.data : t)),
            );
          })
          .catch(() => {
            setTrades((prev) => prev.filter((t) => t.id !== optimistic.id));
            setError("Failed to save trade on the server.");
          });
        return optimistic;
      }

      function updateTrade(trade: Trade): Trade {
        const previous = tradesRef.current.find((t) => t.id === trade.id);
        setTrades((prev) => prev.map((t) => (t.id === trade.id ? trade : t)));
        setError(null);
        api.trades
          .update(trade)
          .then((res) => {
            setTrades((prev) =>
              prev.map((t) => (t.id === res.data.id ? res.data : t)),
            );
          })
          .catch(() => {
            if (previous) {
              setTrades((prev) =>
                prev.map((t) => (t.id === previous.id ? previous : t)),
              );
            }
            setError("Failed to update trade on the server.");
          });
        return trade;
      }

      function deleteTrade(id: string) {
        const existing = tradesRef.current.find((t) => t.id === id);
        setLastDeleted(existing ? [existing] : []);
        setTrades((prev) => prev.filter((t) => t.id !== id));
        setError(null);
        api.trades.remove(id).catch(() => {
          if (existing) {
            setTrades((prev) =>
              prev.some((t) => t.id === id) ? prev : [...prev, existing],
            );
          }
          setError("Failed to delete trade on the server.");
        });
      }

      function deleteTrades(ids: string[]) {
        if (ids.length === 0) return;
        const removed = tradesRef.current.filter((t) => ids.includes(t.id));
        setLastDeleted(removed);
        setTrades((prev) => prev.filter((t) => !ids.includes(t.id)));
        setError(null);
        Promise.allSettled(ids.map((id) => api.trades.remove(id))).then(
          (results) => {
            if (results.some((r) => r.status === "rejected")) {
              reloadTrades();
              setError("Some trades could not be deleted on the server.");
            }
          },
        );
      }

      function duplicateTrade(id: string): Trade | undefined {
        const original = tradesRef.current.find((t) => t.id === id);
        if (!original) return undefined;
        const rest = Object.fromEntries(
          Object.entries(original).filter(([key]) => key !== "id"),
        ) as Omit<Trade, "id">;
        return addTrade({ ...rest, date: today() });
      }

      function clearAllTrades() {
        const all = tradesRef.current;
        setLastDeleted(all);
        setTrades([]);
        setError(null);
        api.trades.clearAll().catch(() => {
          reloadTrades();
          setError("Failed to clear trades on the server.");
        });
      }

      function importTrades(imported: Trade[]): number {
        const existing = tradesRef.current;
        const seen = new Set(existing.map((t) => t.id));
        const fresh = imported.filter((t) => !seen.has(t.id));
        if (fresh.length === 0) return 0;
        setTrades((prev) => [...prev, ...fresh]);
        setError(null);
        api.trades.bulkCreate(fresh).catch(() => {
          reloadTrades();
          setError("Failed to import trades on the server.");
        });
        return fresh.length;
      }

      function undoDelete(): number {
        const restored = lastDeleted.filter(
          (t) => !tradesRef.current.some((x) => x.id === t.id),
        );
        if (restored.length > 0) {
          setTrades((prev) => [...prev, ...restored]);
          setError(null);
          api.trades.bulkCreate(restored).catch(() => {
            reloadTrades();
            setError("Failed to restore trades on the server.");
          });
        }
        setLastDeleted([]);
        return restored.length;
      }

      return {
        trades,
        loading,
        error,
        getTrade: (id: string) => tradesRef.current.find((t) => t.id === id),
        addTrade,
        updateTrade,
        deleteTrade,
        deleteTrades,
        duplicateTrade,
        clearAllTrades,
        importTrades,
        canUndo: lastDeleted.length > 0,
        undoDelete,
      };
    },
    [trades, loading, error, lastDeleted, reloadTrades],
  );

  return <TradeContext.Provider value={value}>{children}</TradeContext.Provider>;
}
