import { describe, it, expect } from "vitest";
import type { Trade } from "../../types/Trade";
import {
  inferSessionFromTime,
  getSessionAnalytics,
  getStreaks,
  getRrComparison,
  getDirectionAnalytics,
  getHourlyAnalytics,
  getDailyAnalytics,
  getNetPnl,
  getJournalingStreak,
} from "../analytics";

function trade(overrides: Partial<Trade>): Trade {
  return {
    id: "1",
    date: "2026-08-01",
    entryTime: "09:30",
    pair: "EURUSD",
    session: "Other",
    direction: "Buy",
    entry: 1.1,
    stopLoss: 1.09,
    target: 1.13,
    result: "Win",
    rr: 3,
    isValidRuleTrade: false,
    ...overrides,
  };
}

describe("inferSessionFromTime", () => {
  it("maps times to sessions", () => {
    expect(inferSessionFromTime("02:00")).toBe("Asian");
    expect(inferSessionFromTime("09:30")).toBe("London");
    expect(inferSessionFromTime("14:00")).toBe("Overlap");
    expect(inferSessionFromTime("19:00")).toBe("NewYork");
    expect(inferSessionFromTime(undefined)).toBeNull();
    expect(inferSessionFromTime("not-a-time")).toBeNull();
  });
});

describe("getSessionAnalytics", () => {
  it("uses entryTime over the session field and skips open trades", () => {
    const trades = [
      trade({ entryTime: "10:00", result: "Win" }),
      trade({ entryTime: "19:00", result: "Loss" }),
      trade({ entryTime: "19:00", result: "Open" }),
    ];
    const result = getSessionAnalytics(trades);
    const london = result.find((s) => s.session === "London")!;
    const newYork = result.find((s) => s.session === "NewYork")!;
    expect(london.trades).toBe(1);
    expect(london.winRate).toBe(100);
    expect(newYork.trades).toBe(1);
    expect(newYork.winRate).toBe(0);
  });
});

describe("getStreaks", () => {
  it("computes longest and current streaks chronologically", () => {
    const trades = [
      trade({ result: "Win" }),
      trade({ result: "Win" }),
      trade({ result: "Loss" }),
      trade({ result: "Win" }),
    ];
    const streaks = getStreaks(trades);
    expect(streaks.longestWinStreak).toBe(2);
    expect(streaks.longestLossStreak).toBe(1);
    expect(streaks.currentWinStreak).toBe(1);
    expect(streaks.currentLossStreak).toBe(0);
  });
});

describe("getRrComparison", () => {
  it("computes planned vs achieved average R", () => {
    const trades = [
      trade({ rr: 3, result: "Win" }),
      trade({ rr: 2, result: "Loss" }),
    ];
    const cmp = getRrComparison(trades);
    expect(cmp.avgPlanned).toBe(2.5);
    expect(cmp.avgAchieved).toBe((3 - 1) / 2);
    expect(cmp.difference).toBeCloseTo(-1.5);
  });
});

describe("getDirectionAnalytics", () => {
  it("aggregates by direction including netR", () => {
    const trades = [
      trade({ direction: "Buy", rr: 3, result: "Win" }),
      trade({ direction: "Buy", rr: 2, result: "Loss" }),
      trade({ direction: "Sell", rr: 1, result: "Win" }),
    ];
    const result = getDirectionAnalytics(trades);
    const buy = result.find((d) => d.direction === "Buy")!;
    const sell = result.find((d) => d.direction === "Sell")!;
    expect(buy.trades).toBe(2);
    expect(buy.winRate).toBe(50);
    expect(buy.netR).toBe(2);
    expect(sell.trades).toBe(1);
    expect(sell.netR).toBe(1);
  });
});

describe("getHourlyAnalytics", () => {
  it("produces 24 hourly buckets", () => {
    const trades = [
      trade({ entryTime: "09:15", result: "Win" }),
      trade({ entryTime: "09:45", result: "Loss" }),
    ];
    const result = getHourlyAnalytics(trades);
    expect(result).toHaveLength(24);
    const nine = result.find((h) => h.hour === 9)!;
    expect(nine.trades).toBe(2);
    expect(nine.winRate).toBe(50);
  });
});

describe("getDailyAnalytics", () => {
  it("groups by day of week with Sunday = 0", () => {
    // 2026-08-02 is a Sunday.
    const trades = [
      trade({ date: "2026-08-02", result: "Win" }),
      trade({ date: "2026-08-02", result: "Loss" }),
    ];
    const result = getDailyAnalytics(trades);
    expect(result).toHaveLength(7);
    expect(result[0].label).toBe("Sun");
    expect(result[0].trades).toBe(2);
    expect(result[0].winRate).toBe(50);
  });
});

describe("getNetPnl", () => {
  it("sums pnlAmount ignoring undefined", () => {
    const trades = [
      trade({ pnlAmount: 300 }),
      trade({ pnlAmount: -100 }),
      trade({ pnlAmount: undefined }),
    ];
    expect(getNetPnl(trades)).toBe(200);
  });
});

describe("getJournalingStreak", () => {
  it("counts consecutive days ending today", () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const trades = [trade({ date: today }), trade({ date: yesterday }), trade({ date: twoDaysAgo })];
    expect(getJournalingStreak(trades)).toBe(3);
  });
});
