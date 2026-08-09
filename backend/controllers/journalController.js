const Journal = require('../models/Journal');
const { asyncHandler } = require('../utils/asyncHandler');

const journalFields = [
  'mood',
  'performanceScore',
  'whatWentWell',
  'whatToImprove',
  'lessonsLearned',
  'nextDayPlan',
  'gratitude',
];

const pickJournalFields = (body) => {
  const picked = {};
  for (const field of journalFields) {
    if (body[field] !== undefined) {
      picked[field] = body[field];
    }
  }
  return picked;
};

const isValidDate = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const getJournals = asyncHandler(async (req, res) => {
  const { from, to, limit = 60 } = req.query;

  const query = { user: req.user._id };

  if (from || to) {
    const range = {};
    if (from && isValidDate(String(from))) range.$gte = String(from);
    if (to && isValidDate(String(to))) range.$lte = String(to);
    if (Object.keys(range).length > 0) query.date = range;
  }

  const pageLimit = Math.min(500, Math.max(1, parseInt(limit, 10) || 60));

  const journals = await Journal.find(query)
    .sort({ date: -1, createdAt: -1 })
    .limit(pageLimit);

  res.status(200).json({
    success: true,
    count: journals.length,
    data: journals,
  });
});

const getJournalByDate = asyncHandler(async (req, res) => {
  const { date } = req.params;

  if (!isValidDate(date)) {
    return res.status(400).json({
      success: false,
      message: 'Date must be in YYYY-MM-DD format',
    });
  }

  const journal = await Journal.findOne({ user: req.user._id, date });

  if (!journal) {
    return res.status(404).json({
      success: false,
      message: `No journal entry found for ${date}`,
    });
  }

  res.status(200).json({
    success: true,
    data: journal,
  });
});

const upsertJournal = asyncHandler(async (req, res) => {
  const { date } = req.params;

  if (!isValidDate(date)) {
    return res.status(400).json({
      success: false,
      message: 'Date must be in YYYY-MM-DD format',
    });
  }

  const picked = pickJournalFields(req.body);

  if (picked.performanceScore !== undefined && picked.performanceScore !== null) {
    const score = Number(picked.performanceScore);
    if (!Number.isFinite(score) || score < 0 || score > 10) {
      return res.status(400).json({
        success: false,
        message: 'Performance score must be a number between 0 and 10',
      });
    }
    picked.performanceScore = score;
  }

  const journal = await Journal.findOneAndUpdate(
    { user: req.user._id, date },
    { $set: picked },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({
    success: true,
    message: 'Journal entry saved successfully',
    data: journal,
  });
});

const deleteJournal = asyncHandler(async (req, res) => {
  const { date } = req.params;

  if (!isValidDate(date)) {
    return res.status(400).json({
      success: false,
      message: 'Date must be in YYYY-MM-DD format',
    });
  }

  const journal = await Journal.findOneAndDelete({ user: req.user._id, date });

  if (!journal) {
    return res.status(404).json({
      success: false,
      message: `No journal entry found for ${date}`,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Journal entry deleted successfully',
  });
});

module.exports = {
  getJournals,
  getJournalByDate,
  upsertJournal,
  deleteJournal,
};
