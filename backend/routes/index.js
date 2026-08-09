const express = require('express');

const router = express.Router();

router.use('/health', require('./health.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/trades', require('./tradeRoutes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/news', require('./news.routes'));
router.use('/backup', require('./backup.routes'));
router.use('/journal', require('./journal.routes'));

module.exports = router;
