const crypto = require('crypto');
const mongoose = require('mongoose');
const { computeRr } = require('../utils/rr');

const tradeSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
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
    entryTime: {
      type: String,
      trim: true,
    },
    pair: {
      type: String,
      required: [true, 'Trading pair is required'],
      trim: true,
      uppercase: true,
    },
    session: {
      type: String,
      enum: {
        values: ['London', 'NewYork', 'Overlap', 'Other'],
        message: 'Invalid session',
      },
      default: 'Other',
    },
    direction: {
      type: String,
      required: [true, 'Direction is required'],
      enum: {
        values: ['Buy', 'Sell'],
        message: 'Direction must be either "Buy" or "Sell"',
      },
    },
    entry: {
      type: Number,
      required: [true, 'Entry price is required'],
      validate: {
        validator: (value) => value > 0,
        message: 'Entry price must be positive',
      },
    },
    stopLoss: {
      type: Number,
      required: [true, 'Stop loss is required'],
      validate: {
        validator: (value) => value > 0,
        message: 'Stop loss must be positive',
      },
    },
    target: {
      type: Number,
      required: [true, 'Target is required'],
      validate: {
        validator: (value) => value > 0,
        message: 'Target must be positive',
      },
    },
    result: {
      type: String,
      enum: {
        values: ['Win', 'Loss', 'BreakEven', 'Open'],
        message: 'Invalid result',
      },
      default: 'Open',
    },
    rr: {
      type: Number,
      default: 0,
      min: [0, 'RR cannot be negative'],
    },
    positionSize: {
      type: Number,
      validate: {
        validator: (value) => value === undefined || value > 0,
        message: 'Position size must be positive',
      },
    },
    riskAmount: {
      type: Number,
      validate: {
        validator: (value) => value === undefined || value >= 0,
        message: 'Risk amount cannot be negative',
      },
    },
    pnlAmount: {
      type: Number,
      validate: {
        validator: (value) => value === undefined || Number.isFinite(value),
        message: 'P&L amount must be a number',
      },
    },
    notes: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    mindset: {
      before: { type: String, trim: true },
      after: { type: String, trim: true },
    },
    emotion: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    screenshot: {
      type: String,
    },
    isValidRuleTrade: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

tradeSchema.pre('validate', function autoRr() {
  const rr = computeRr(this.direction, this.entry, this.stopLoss, this.target);
  if (rr !== undefined) {
    this.rr = rr;
  }
});

tradeSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Trade', tradeSchema);
