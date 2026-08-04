const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema(
  {
    pair: {
      type: String,
      required: [true, 'Trading pair is required'],
      trim: true,
      uppercase: true,
    },
    direction: {
      type: String,
      required: [true, 'Trade direction is required'],
      enum: {
        values: ['long', 'short'],
        message: 'Direction must be either "long" or "short"',
      },
    },
    entryPrice: {
      type: Number,
      required: [true, 'Entry price is required'],
      validate: {
        validator: (value) => value > 0,
        message: 'Entry price must be a positive number',
      },
    },
    exitPrice: {
      type: Number,
      min: [0, 'Exit price cannot be negative'],
    },
    stopLoss: {
      type: Number,
      min: [0, 'Stop loss cannot be negative'],
    },
    takeProfit: {
      type: Number,
      min: [0, 'Take profit cannot be negative'],
    },
    lotSize: {
      type: Number,
      default: 0,
      min: [0, 'Lot size cannot be negative'],
    },
    entryDate: {
      type: Date,
      default: Date.now,
    },
    exitDate: {
      type: Date,
    },
    pnl: {
      type: Number,
    },
    riskReward: {
      type: Number,
    },
    strategy: {
      type: String,
      trim: true,
    },
    session: {
      type: String,
      trim: true,
    },
    emotion: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Trade', tradeSchema);
