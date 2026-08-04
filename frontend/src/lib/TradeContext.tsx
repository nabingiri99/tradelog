import { createContext, useContext } from "react";
import type { Trade } from "../types/Trade";

export interface TradeContextValue {
  trades: Trade[];
  getTrade: (id: string) => Trade | undefined;
  addTrade: (trade: Omit<Trade, "id">) => Trade;
  updateTrade: (trade: Trade) => Trade;
  deleteTrade: (id: string) => void;
  deleteTrades: (ids: string[]) => void;
  duplicateTrade: (id: string) => Trade | undefined;
  clearAllTrades: () => void;
  importTrades: (trades: Trade[]) => number;
  canUndo: boolean;
  undoDelete: () => number;
}

export const TradeContext = createContext<TradeContextValue | null>(null);

export function useTrades(): TradeContextValue {
  const ctx = useContext(TradeContext);
  if (!ctx) {
    throw new Error("useTrades must be used within a TradeProvider");
  }
  return ctx;
}
