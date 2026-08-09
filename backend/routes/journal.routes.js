const express = require('express');

const {
  getJournals,
  getJournalByDate,
  upsertJournal,
  deleteJournal,
} = require('../controllers/journalController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getJournals);

router
  .route('/:date')
  .get(getJournalByDate)
  .put(upsertJournal)
  .delete(deleteJournal);

module.exports = router;
