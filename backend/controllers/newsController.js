const { Scraper } = require('forexfactory-scraper');
const { asyncHandler } = require('../utils/asyncHandler');

const CACHE_TTL_MS = 10 * 60 * 1000;

let cache = {
  fetchedAt: 0,
  events: [],
  stale: false,
};

const IMPACT_LEVELS = ['High', 'Medium', 'Low', 'Holiday'];

const normalizeImpact = (impact) => {
  if (!impact) return 'Low';
  const text = String(impact).trim();
  for (const level of IMPACT_LEVELS) {
    if (text.toLowerCase().includes(level.toLowerCase())) return level;
  }
  return 'Low';
};

const parseDate = (iso) => {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
};

const scrape = async () => {
  const events = await new Scraper().scrapeCalendar();
  const normalized = events.map((event) => ({
    date: parseDate(event.date),
    time: event.time || null,
    currency: event.currency || null,
    impact: normalizeImpact(event.impact),
    event: event.event || null,
    actual: event.actual || null,
    forecast: event.forecast || null,
    previous: event.previous || null,
  }));
  cache = {
    fetchedAt: Date.now(),
    events: normalized,
    stale: false,
  };
  return normalized;
};

const getCalendar = asyncHandler(async (req, res) => {
  const { impact, currency, days } = req.query;

  let events = cache.events;
  if (cache.stale || Date.now() - cache.fetchedAt > CACHE_TTL_MS) {
    try {
      events = await scrape();
    } catch (err) {
      if (events.length === 0) {
        return res.status(502).json({
          success: false,
          message: `Could not reach the ForexFactory calendar: ${err.message}`,
        });
      }
      cache.stale = true;
    }
  }

  let filtered = events;

  if (impact) {
    const wanted = String(impact)
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);
    if (wanted.length > 0) {
      filtered = filtered.filter((e) => wanted.includes(e.impact));
    }
  }

  if (currency) {
    const wantedCurrencies = String(currency)
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (wantedCurrencies.length > 0) {
      filtered = filtered.filter((e) => wantedCurrencies.includes(e.currency));
    }
  }

  if (days) {
    const dayCount = Number(days);
    if (Number.isFinite(dayCount) && dayCount > 0) {
      const now = Date.now();
      const future = now + dayCount * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((e) => {
        const t = new Date(e.date).getTime();
        return t >= now && t <= future;
      });
    }
  }

  filtered = [...filtered].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  res.json({
    success: true,
    data: filtered,
    meta: {
      total: filtered.length,
      cachedAt: cache.fetchedAt,
      source: 'forexfactory.com/calendar',
    },
  });
});

module.exports = { getCalendar };
