const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['deposit', 'withdraw', 'transfer_in', 'transfer_out'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },
    counterpartyAccount: {
      type: String,
      default: null
    },
    counterpartyName: {
      type: String,
      default: null
    },
    reference: {
      type: String,
      required: true,
      unique: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
