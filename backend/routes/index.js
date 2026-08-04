const express = require('express');

const router = express.Router();

router.use('/health', require('./health.routes'));
router.use('/trades', require('./tradeRoutes'));

module.exports = router;
