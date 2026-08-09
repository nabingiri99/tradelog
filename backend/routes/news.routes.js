const express = require('express');

const { getCalendar } = require('../controllers/newsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getCalendar);

module.exports = router;
