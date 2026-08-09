import type { Trade, DirectionType } from "../types/Trade";

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

export interface DirectionAnalytic {
  direction: DirectionType;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netR: number;
}

export function getDirectionAnalytics(trades: Trade[]): DirectionAnalytic[] {
  const byDir = new Map<
    DirectionType,
    { trades: number; wins: number; losses: number; netR: number }
  >([
    ["Buy", { trades: 0, wins: 0, losses: 0, netR: 0 }],
    ["Sell", { trades: 0, wins: 0, losses: 0, netR: 0 }],
  ]);
  for (const t of trades) {
    if (t.result === "Open") continue;
    const entry = byDir.get(t.direction);
    if (!entry) continue;
    entry.trades += 1;
    if (t.result === "Win") {
      entry.wins += 1;
      entry.netR += t.rr;
    } else if (t.result === "Loss") {
      entry.losses += 1;
      entry.netR -= 1;
    }
  }
  return Array.from(byDir.entries()).map(([direction, e]) => {
    const decided = e.wins + e.losses;
    return {
      direction,
      trades: e.trades,
      wins: e.wins,
      losses: e.losses,
      winRate: decided > 0 ? (e.wins / decided) * 100 : 0,
      netR: Math.round(e.netR * 100) / 100,
    };
  });
}

export interface HourAnalytic {
  hour: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

function hourOfTrade(t: Trade): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(t.entryTime ?? "");
  return match ? Number(match[1]) : null;
}

export function getHourlyAnalytics(trades: Trade[]): HourAnalytic[] {
  const map = new Map<number, { trades: number; wins: number; losses: number }>();
  for (let h = 0; h < 24; h++) map.set(h, { trades: 0, wins: 0, losses: 0 });
  for (const t of trades) {
    if (t.result === "Open") continue;
    const hour = hourOfTrade(t);
    if (hour === null) continue;
    const entry = map.get(hour)!;
    entry.trades += 1;
    if (t.result === "Win") entry.wins += 1;
    else if (t.result === "Loss") entry.losses += 1;
  }
  return Array.from(map.entries()).map(([hour, e]) => {
    const decided = e.wins + e.losses;
    return {
      hour,
      trades: e.trades,
      wins: e.wins,
      losses: e.losses,
      winRate: decided > 0 ? (e.wins / decided) * 100 : 0,
    };
  });
}

export interface DayAnalytic {
  day: number;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getDailyAnalytics(trades: Trade[]): DayAnalytic[] {
  const map = new Map<number, { trades: number; wins: number; losses: number }>();
  for (let d = 0; d < 7; d++) map.set(d, { trades: 0, wins: 0, losses: 0 });
  for (const t of trades) {
    if (t.result === "Open") continue;
    const day = new Date(`${t.date}T00:00:00`).getDay();
    if (Number.isNaN(day)) continue;
    const entry = map.get(day)!;
    entry.trades += 1;
    if (t.result === "Win") entry.wins += 1;
    else if (t.result === "Loss") entry.losses += 1;
  }
  return Array.from(map.entries()).map(([day, e]) => {
    const decided = e.wins + e.losses;
    return {
      day,
      label: WEEKDAY_LABELS[day],
      trades: e.trades,
      wins: e.wins,
      losses: e.losses,
      winRate: decided > 0 ? (e.wins / decided) * 100 : 0,
    };
  });
}

export function getNetPnl(trades: Trade[]): number {
  return trades.reduce((sum, t) => {
    if (t.pnlAmount === undefined) return sum;
    return sum + t.pnlAmount;
  }, 0);
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function getJournalingStreak(trades: Trade[]): number {
  const days = new Set(trades.map((t) => t.date));
  let offset = days.has(isoDaysAgo(0)) ? 0 : 1;
  let streak = 0;
  while (days.has(isoDaysAgo(offset))) {
    streak += 1;
    offset += 1;
  }
  return streak;
}
