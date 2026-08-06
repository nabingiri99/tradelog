const SESSIONS = ['London', 'NewYork', 'Overlap', 'Other'];
const DIRECTIONS = ['Buy', 'Sell'];
const RESULTS = ['Win', 'Loss', 'BreakEven', 'Open'];

const validateTrade = (req, res, next) => {
  const body = req.body || {};
  const { pair, direction, entry, stopLoss, target, session, result } = body;
  const errors = [];
  const isCreate = req.method === 'POST';

  if (isCreate && (!pair || typeof pair !== 'string' || pair.trim() === '')) {
    errors.push('pair is required');
  } else if (pair !== undefined && (typeof pair !== 'string' || pair.trim() === '')) {
    errors.push('pair must be a non-empty string');
  }

  if (isCreate && !direction) {
    errors.push('direction is required');
  } else if (direction !== undefined && !DIRECTIONS.includes(direction)) {
    errors.push('direction must be either "Buy" or "Sell"');
  }

  if (isCreate && (entry === undefined || entry === null)) {
    errors.push('entry is required');
  } else if (entry !== undefined && entry !== null && (typeof entry !== 'number' || !(entry > 0))) {
    errors.push('entry must be a positive number');
  }

  if (isCreate && (stopLoss === undefined || stopLoss === null)) {
    errors.push('stopLoss is required');
  } else if (stopLoss !== undefined && stopLoss !== null && (typeof stopLoss !== 'number' || !(stopLoss > 0))) {
    errors.push('stopLoss must be a positive number');
  }

  if (isCreate && (target === undefined || target === null)) {
    errors.push('target is required');
  } else if (target !== undefined && target !== null && (typeof target !== 'number' || !(target > 0))) {
    errors.push('target must be a positive number');
  }

  if (session !== undefined && !SESSIONS.includes(session)) {
    errors.push('session must be one of: London, NewYork, Overlap, Other');
  }

  if (result !== undefined && !RESULTS.includes(result)) {
    errors.push('result must be one of: Win, Loss, BreakEven, Open');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

module.exports = { validateTrade };
