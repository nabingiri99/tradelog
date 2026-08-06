const Trade = require('../models/Trade');
const { asyncHandler } = require('../utils/asyncHandler');

const tradeFields = [
  'date',
  'entryTime',
  'pair',
  'session',
  'direction',
  'entry',
  'stopLoss',
  'target',
  'result',
  'rr',
  'notes',
  'tags',
  'mindset',
  'emotion',
  'reason',
  'screenshot',
  'isValidRuleTrade',
];

const sortableFields = ['date', 'pair', 'entry', 'result', 'rr', 'createdAt', 'updatedAt'];

const pickTradeFields = (body) => {
  const picked = {};
  for (const field of tradeFields) {
    if (body[field] !== undefined) {
      picked[field] = body[field];
    }
  }
  return picked;
};

const buildDoc = (trade, userId) => {
  const doc = { user: userId, ...pickTradeFields(trade) };
  const id = typeof trade.id === 'string' && trade.id.trim() !== '' ? trade.id.trim() : undefined;
  if (id) doc._id = id;
  return doc;
};

const isValidId = (id) => typeof id === 'string' && id.trim() !== '';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAllTrades = asyncHandler(async (req, res) => {
  const { search, direction, result, startDate, endDate, sort = '-createdAt' } = req.query;

  const query = { user: req.user._id };

  if (search) {
    query.pair = { $regex: escapeRegExp(String(search).trim()), $options: 'i' };
  }

  if (direction) {
    if (!['Buy', 'Sell'].includes(direction)) {
      return res.status(400).json({
        success: false,
        message: 'direction must be either "Buy" or "Sell"',
      });
    }
    query.direction = direction;
  }

  if (result) {
    if (!['Win', 'Loss', 'BreakEven', 'Open'].includes(result)) {
      return res.status(400).json({
        success: false,
        message: 'result must be one of: Win, Loss, BreakEven, Open',
      });
    }
    query.result = result;
  }

  if (startDate || endDate) {
    const range = {};
    if (startDate) range.$gte = String(startDate).trim();
    if (endDate) range.$lte = String(endDate).trim();
    query.date = range;
  }

  const sortOptions = {};
  String(sort)
    .split(',')
    .forEach((field) => {
      const trimmed = field.trim();
      if (!trimmed) return;
      const descending = trimmed.startsWith('-');
      const name = descending ? trimmed.slice(1) : trimmed;
      if (sortableFields.includes(name)) {
        sortOptions[name] = descending ? -1 : 1;
      }
    });

  const trades = await Trade.find(query).sort(sortOptions);

  res.status(200).json({
    success: true,
    count: trades.length,
    data: trades,
  });
});

const getTradeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid trade ID',
    });
  }

  const trade = await Trade.findOne({ _id: id, user: req.user._id });

  if (!trade) {
    return res.status(404).json({
      success: false,
      message: `Trade not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    data: trade,
  });
});

const createTrade = asyncHandler(async (req, res) => {
  const trade = await Trade.create(buildDoc(req.body, req.user._id));

  res.status(201).json({
    success: true,
    message: 'Trade created successfully',
    data: trade,
  });
});

const updateTrade = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid trade ID',
    });
  }

  const trade = await Trade.findOneAndUpdate(
    { _id: id, user: req.user._id },
    pickTradeFields(req.body),
    { new: true, runValidators: true }
  );

  if (!trade) {
    return res.status(404).json({
      success: false,
      message: `Trade not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Trade updated successfully',
    data: trade,
  });
});

const deleteTrade = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid trade ID',
    });
  }

  const trade = await Trade.findOneAndDelete({ _id: id, user: req.user._id });

  if (!trade) {
    return res.status(404).json({
      success: false,
      message: `Trade not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Trade deleted successfully',
  });
});

const clearAllTrades = asyncHandler(async (req, res) => {
  const result = await Trade.deleteMany({ user: req.user._id });

  res.status(200).json({
    success: true,
    message: 'All trades deleted successfully',
    deleted: result.deletedCount,
  });
});

const bulkCreateTrades = asyncHandler(async (req, res) => {
  const list = req.body?.trades;

  if (!Array.isArray(list)) {
    return res.status(400).json({
      success: false,
      message: 'Expected a "trades" array in the request body',
    });
  }

  const docs = list
    .filter((trade) => trade && typeof trade === 'object')
    .map((trade) => buildDoc(trade, req.user._id));

  if (docs.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid trades to import',
    });
  }

  const created = await Trade.insertMany(docs, { ordered: false });

  res.status(201).json({
    success: true,
    message: 'Trades imported successfully',
    count: created.length,
    data: created,
  });
});

module.exports = {
  getAllTrades,
  getTradeById,
  createTrade,
  updateTrade,
  deleteTrade,
  clearAllTrades,
  bulkCreateTrades,
};
