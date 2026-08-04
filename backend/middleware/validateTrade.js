const validateTrade = (req, res, next) => {
  const { pair, direction, entryPrice, exitPrice } = req.body || {};
  const errors = [];
  const isCreate = req.method === 'POST';

  if (isCreate && (!pair || typeof pair !== 'string' || pair.trim() === '')) {
    errors.push('pair is required');
  } else if (pair !== undefined && (typeof pair !== 'string' || pair.trim() === '')) {
    errors.push('pair must be a non-empty string');
  }

  if (isCreate && !direction) {
    errors.push('direction is required');
  } else if (direction !== undefined && !['long', 'short'].includes(direction)) {
    errors.push('direction must be either "long" or "short"');
  }

  if (isCreate && (entryPrice === undefined || entryPrice === null)) {
    errors.push('entryPrice is required');
  } else if (entryPrice !== undefined && entryPrice !== null && (typeof entryPrice !== 'number' || !(entryPrice > 0))) {
    errors.push('entryPrice must be a positive number');
  }

  if (exitPrice !== undefined && exitPrice !== null && (typeof exitPrice !== 'number' || exitPrice < 0)) {
    errors.push('exitPrice must be a number and cannot be negative');
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
