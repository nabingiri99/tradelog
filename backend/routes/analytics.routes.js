const express = require('express');

const { getAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getAnalytics);

module.exports = router;
