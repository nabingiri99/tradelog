export type SessionType = "London" | "NewYork" | "Overlap" | "Other";

export type DirectionType = "Buy" | "Sell";

export type ResultType = "Win" | "Loss" | "BreakEven" | "Open";

export interface Trade {
  id: string;
  date: string;
  entryTime?: string;
  pair: string;
  session: SessionType;
  direction: DirectionType;
  entry: number;
  stopLoss: number;
  target: number;
  result: ResultType;
  rr: number;
  notes?: string;
  tags?: string[];
  mindset?: { before: string; after: string };
  emotion?: string;
  reason?: string;
  screenshot?: string;
  isValidRuleTrade: boolean;
}
