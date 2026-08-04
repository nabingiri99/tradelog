const express = require('express');

const {
  getAllTrades,
  getTradeById,
  createTrade,
  updateTrade,
  deleteTrade,
  clearAllTrades,
  bulkCreateTrades,
} = require('../controllers/tradeController');

const { validateTrade } = require('../middleware/validateTrade');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getAllTrades)
  .post(validateTrade, createTrade)
  .delete(clearAllTrades);

router.post('/bulk', bulkCreateTrades);

router
  .route('/:id')
  .get(getTradeById)
  .put(validateTrade, updateTrade)
  .delete(deleteTrade);

module.exports = router;
