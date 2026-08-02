import type { Trade } from "../types/Trade";

export type AnalyticsSession = "Asian" | "London" | "NewYork" | "Overlap" | "Other";

export const SESSION_ORDER: AnalyticsSession[] = [
  "Asian",
  "London",
  "Overlap",
  "NewYork",
  "Other",
];

export function inferSessionFromTime(time: string | undefined): AnalyticsSession | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (minutes < 7 * 60) return "Asian";
  if (minutes < 12 * 60) return "London";
  if (minutes < 16 * 60) return "Overlap";
  return "NewYork";
}

export function tradeSession(trade: Trade): AnalyticsSession {
  return inferSessionFromTime(trade.entryTime) ?? (trade.session as AnalyticsSession);
}

export interface SessionAnalytic {
  session: AnalyticsSession;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function getSessionAnalytics(trades: Trade[]): SessionAnalytic[] {
  const map = new Map<AnalyticsSession, { trades: number; wins: number; losses: number }>();
  for (const session of SESSION_ORDER) {
    map.set(session, { trades: 0, wins: 0, losses: 0 });
  }
  for (const t of trades) {
    if (t.result === "Open") continue;
    const entry = map.get(tradeSession(t));
    if (!entry) continue;
    entry.trades += 1;
    if (t.result === "Win") entry.wins += 1;
    else if (t.result === "Loss") entry.losses += 1;
  }
  return SESSION_ORDER.map((session) => {
    const entry = map.get(session)!;
    const decided = entry.wins + entry.losses;
    return {
      session,
      trades: entry.trades,
      wins: entry.wins,
      losses: entry.losses,
      winRate: decided > 0 ? (entry.wins / decided) * 100 : 0,
    };
  });
}

export interface TagAnalytic {
  tag: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function getTagAnalytics(trades: Trade[]): TagAnalytic[] {
  const map = new Map<string, { trades: number; wins: number; losses: number }>();
  for (const t of trades) {
    if (t.result === "Open" || !t.tags || t.tags.length === 0) continue;
    for (const tag of t.tags) {
      const entry = map.get(tag) ?? { trades: 0, wins: 0, losses: 0 };
      entry.trades += 1;
      if (t.result === "Win") entry.wins += 1;
      else if (t.result === "Loss") entry.losses += 1;
      map.set(tag, entry);
    }
  }
  return Array.from(map.entries())
    .map(([tag, entry]) => {
      const decided = entry.wins + entry.losses;
      return {
        tag,
        trades: entry.trades,
        wins: entry.wins,
        losses: entry.losses,
        winRate: decided > 0 ? (entry.wins / decided) * 100 : 0,
      };
    })
    .sort((a, b) => b.trades - a.trades || b.winRate - a.winRate);
}

export interface StreakStats {
  longestWinStreak: number;
  longestLossStreak: number;
  currentWinStreak: number;
  currentLossStreak: number;
}

function chronological(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const aTime = a.entryTime ?? "";
    const bTime = b.entryTime ?? "";
    if (aTime !== bTime) return aTime.localeCompare(bTime);
    return a.id.localeCompare(b.id);
  });
}

export function getStreaks(trades: Trade[]): StreakStats {
  const closed = chronological(trades.filter((t) => t.result !== "Open"));
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWin = 0;
  let currentLoss = 0;
  for (const t of closed) {
    if (t.result === "Win") {
      currentWin += 1;
      currentLoss = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWin);
    } else if (t.result === "Loss") {
      currentLoss += 1;
      currentWin = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLoss);
    } else {
      currentWin = 0;
      currentLoss = 0;
    }
  }
  const last = closed[closed.length - 1];
  return {
    longestWinStreak,
    longestLossStreak,
    currentWinStreak: last?.result === "Win" ? currentWin : 0,
    currentLossStreak: last?.result === "Loss" ? currentLoss : 0,
  };
}

export interface RrComparison {
  avgPlanned: number;
  avgAchieved: number;
  difference: number;
}

export function getRrComparison(trades: Trade[]): RrComparison {
  const closed = trades.filter((t) => t.result !== "Open");
  const plannedTotal = closed.reduce((sum, t) => sum + t.rr, 0);
  const avgPlanned = closed.length > 0 ? plannedTotal / closed.length : 0;
  const achievedTotal = closed.reduce((sum, t) => {
    if (t.result === "Win") return sum + t.rr;
    if (t.result === "Loss") return sum - 1;
    return sum;
  }, 0);
  const avgAchieved = closed.length > 0 ? achievedTotal / closed.length : 0;
  return {
    avgPlanned,
    avgAchieved,
    difference: avgAchieved - avgPlanned,
  };
}
