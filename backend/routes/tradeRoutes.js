const express = require('express');

const {
  getAllTrades,
  getTradeById,
  createTrade,
  updateTrade,
  deleteTrade,
} = require('../controllers/tradeController');

const { validateTrade } = require('../middleware/validateTrade');

const router = express.Router();

router.get('/', getAllTrades);
router.get('/:id', getTradeById);
router.post('/', validateTrade, createTrade);
router.put('/:id', validateTrade, updateTrade);
router.delete('/:id', deleteTrade);

module.exports = router;
