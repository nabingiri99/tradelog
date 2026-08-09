const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
      index: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      trim: true,
    },
    mood: {
      type: String,
      trim: true,
      default: '',
    },
    performanceScore: {
      type: Number,
      min: [0, 'Score cannot be negative'],
      max: [10, 'Score cannot exceed 10'],
      default: null,
    },
    whatWentWell: {
      type: String,
      trim: true,
      default: '',
    },
    whatToImprove: {
      type: String,
      trim: true,
      default: '',
    },
    lessonsLearned: {
      type: String,
      trim: true,
      default: '',
    },
    nextDayPlan: {
      type: String,
      trim: true,
      default: '',
    },
    gratitude: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

journalSchema.index({ user: 1, date: 1 }, { unique: true });

journalSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Journal', journalSchema);
