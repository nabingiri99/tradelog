const mongoose = require('mongoose');
const Trade = require('../models/Trade');
const { asyncHandler } = require('../utils/asyncHandler');

const sortableFields = [
  'pair',
  'direction',
  'entryPrice',
  'exitPrice',
  'stopLoss',
  'takeProfit',
  'lotSize',
  'entryDate',
  'exitDate',
  'pnl',
  'riskReward',
  'strategy',
  'createdAt',
  'updatedAt',
];

const tradeFields = [
  'pair',
  'direction',
  'entryPrice',
  'exitPrice',
  'stopLoss',
  'takeProfit',
  'lotSize',
  'entryDate',
  'exitDate',
  'pnl',
  'riskReward',
  'strategy',
  'session',
  'emotion',
  'notes',
  'tags',
];

const pickTradeFields = (body) => {
  const picked = {};
  for (const field of tradeFields) {
    if (body[field] !== undefined) {
      picked[field] = body[field];
    }
  }
  return picked;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAllTrades = asyncHandler(async (req, res) => {
  const { search, direction, startDate, endDate, sort = '-createdAt', page = 1, limit = 10 } = req.query;

  const query = {};

  if (search) {
    query.pair = { $regex: escapeRegExp(String(search).trim()), $options: 'i' };
  }

  if (direction) {
    if (!['long', 'short'].includes(direction)) {
      return res.status(400).json({
        success: false,
        message: 'direction must be either "long" or "short"',
      });
    }
    query.direction = direction;
  }

  if (startDate || endDate) {
    const range = {};

    if (startDate) {
      const start = new Date(startDate);
      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'startDate must be a valid date',
        });
      }
      range.$gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'endDate must be a valid date',
        });
      }
      range.$lte = end;
    }

    query.entryDate = range;
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

  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (parsedPage - 1) * parsedLimit;

  const [trades, total] = await Promise.all([
    Trade.find(query).sort(sortOptions).skip(skip).limit(parsedLimit),
    Trade.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: trades.length,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages: Math.ceil(total / parsedLimit),
    },
    data: trades,
  });
});

const getTradeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid trade ID',
    });
  }

  const trade = await Trade.findById(id);

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
  const trade = await Trade.create(pickTradeFields(req.body));

  res.status(201).json({
    success: true,
    message: 'Trade created successfully',
    data: trade,
  });
});

const updateTrade = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid trade ID',
    });
  }

  const trade = await Trade.findByIdAndUpdate(id, pickTradeFields(req.body), {
    new: true,
    runValidators: true,
  });

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

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid trade ID',
    });
  }

  const trade = await Trade.findByIdAndDelete(id);

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

module.exports = {
  getAllTrades,
  getTradeById,
  createTrade,
  updateTrade,
  deleteTrade,
};
