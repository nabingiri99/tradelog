export type SessionType = "London" | "NewYork" | "Overlap" | "Other";

export type DirectionType = "Buy" | "Sell";

export type ZoneType = "Supply" | "Demand";

export type ResultType = "Win" | "Loss" | "BreakEven" | "Open";

export interface Trade {
  id: string;
  date: string;
  pair: string;
  session: SessionType;
  direction: DirectionType;
  zoneType: ZoneType;
  entry: number;
  stopLoss: number;
  target: number;
  result: ResultType;
  rr: number;
  notes?: string;
  isValidRuleTrade: boolean;
}
