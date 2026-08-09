const express = require('express');

const { runBackup, getState } = require('../services/backup');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect);

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: getState() });
  })
);

router.post(
  '/run',
  asyncHandler(async (req, res) => {
    const state = await runBackup();
    res.json({ success: true, message: 'Backup completed', data: state });
  })
);

module.exports = router;
