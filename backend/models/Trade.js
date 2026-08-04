const crypto = require('crypto');
const mongoose = require('mongoose');

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
    zoneType: {
      type: String,
      enum: {
        values: ['Supply', 'Demand'],
        message: 'Invalid zone type',
      },
      default: 'Demand',
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

tradeSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Trade', tradeSchema);
