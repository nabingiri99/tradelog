const Trade = require('../models/Trade');
const { asyncHandler } = require('../utils/asyncHandler');

const contribution = (t) =>
  t.result === 'Win' ? t.rr : t.result === 'Loss' ? -1 : 0;

const getAnalytics = asyncHandler(async (req, res) => {
  const trades = await Trade.find({ user: req.user._id }).sort({ date: 1, createdAt: 1 });
  const closed = trades.filter((t) => t.result !== 'Open');
  const wins = closed.filter((t) => t.result === 'Win');
  const losses = closed.filter((t) => t.result === 'Loss');

  const totalR = closed.reduce((s, t) => s + contribution(t), 0);
  const grossProfit = wins.reduce((s, t) => s + t.rr, 0);
  const grossLoss = losses.length;
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : null;

  let running = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let bestWinStreak = 0;
  let bestLossStreak = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const t of closed) {
    running += contribution(t);
    peak = Math.max(peak, running);
    maxDrawdown = Math.max(maxDrawdown, peak - running);
    if (t.result === 'Win') {
      curWin += 1;
      curLoss = 0;
      bestWinStreak = Math.max(bestWinStreak, curWin);
    } else if (t.result === 'Loss') {
      curLoss += 1;
      curWin = 0;
      bestLossStreak = Math.max(bestLossStreak, curLoss);
    } else {
      curWin = 0;
      curLoss = 0;
    }
  }
  const lastResult = closed[closed.length - 1]?.result;

  const byPair = new Map();
  const byMonth = new Map();
  const byDirection = new Map();
  const bySession = new Map();
  const byHour = new Map();
  const byDayOfWeek = new Map();
  const byTag = new Map();

  const bump = (map, key, t) => {
    const entry = map.get(key) ?? { trades: 0, wins: 0, losses: 0, netR: 0, pnl: 0 };
    entry.trades += 1;
    if (t.result === 'Win') entry.wins += 1;
    else if (t.result === 'Loss') entry.losses += 1;
    entry.netR += contribution(t);
    if (t.pnlAmount != null) entry.pnl += t.pnlAmount;
    map.set(key, entry);
  };

  for (const t of closed) {
    bump(byPair, t.pair, t);
    bump(byMonth, t.date.slice(0, 7), t);
    bump(byDirection, t.direction, t);
    bump(bySession, t.session, t);
    if (t.entryTime) {
      const hour = Number(t.entryTime.slice(0, 2));
      if (Number.isFinite(hour)) bump(byHour, String(hour), t);
    }
    const dow = new Date(`${t.date}T00:00:00`).getDay();
    bump(byDayOfWeek, String(dow), t);
    (t.tags || []).forEach((tag) => bump(byTag, tag, t));
  }

  const toArray = (map) =>
    Array.from(map.entries())
      .map(([key, s]) => {
        const closedCount = s.wins + s.losses;
        return {
          key,
          ...s,
          winRate: closedCount > 0 ? Math.round((s.wins / closedCount) * 100) : 0,
        };
      })
      .sort((a, b) => b.netR - a.netR);

  const netPnl = closed.reduce((s, t) => s + (t.pnlAmount ?? 0), 0);

  res.json({
    success: true,
    data: {
      counts: {
        total: trades.length,
        closed: closed.length,
        wins: wins.length,
        losses: losses.length,
        breaks: closed.length - wins.length - losses.length,
      },
      winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
      totalR,
      avgR: wins.length + losses.length > 0 ? totalR / (wins.length + losses.length) : 0,
      expectancy: closed.length > 0 ? totalR / closed.length : 0,
      profitFactor,
      maxDrawdown,
      bestWinStreak,
      bestLossStreak,
      currentWinStreak: lastResult === 'Win' ? curWin : 0,
      currentLossStreak: lastResult === 'Loss' ? curLoss : 0,
      netPnl,
      byPair: toArray(byPair),
      byMonth: toArray(byMonth),
      byDirection: toArray(byDirection),
      bySession: toArray(bySession),
      byHour: Array.from(byHour.entries())
        .map(([key, s]) => {
          const closedCount = s.wins + s.losses;
          return {
            key: Number(key),
            ...s,
            winRate: closedCount > 0 ? Math.round((s.wins / closedCount) * 100) : 0,
          };
        })
        .sort((a, b) => a.key - b.key),
      byDayOfWeek: Array.from(byDayOfWeek.entries())
        .map(([key, s]) => {
          const closedCount = s.wins + s.losses;
          return {
            key: Number(key),
            ...s,
            winRate: closedCount > 0 ? Math.round((s.wins / closedCount) * 100) : 0,
          };
        })
        .sort((a, b) => a.key - b.key),
      byTag: toArray(byTag),
    },
  });
});

module.exports = { getAnalytics };
