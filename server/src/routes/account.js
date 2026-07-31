const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { generateReference, roundMoney } = require('../utils/helpers');

const router = express.Router();

router.use(auth);

router.get('/summary', async (req, res) => {
  try {
    const recent = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthly = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: monthStart }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyMap = monthly.reduce((acc, item) => {
      acc[item._id] = { total: roundMoney(item.total), count: item.count };
      return acc;
    }, {});

    return res.json({
      user: req.user.toSafeJSON(),
      recentTransactions: recent,
      monthly: {
        deposits: monthlyMap.deposit || { total: 0, count: 0 },
        withdrawals: monthlyMap.withdraw || { total: 0, count: 0 },
        transfersIn: monthlyMap.transfer_in || { total: 0, count: 0 },
        transfersOut: monthlyMap.transfer_out || { total: 0, count: 0 }
      }
    });
  } catch (error) {
    console.error('Summary error:', error);
    return res.status(500).json({ message: 'Unable to load account summary' });
  }
});

router.post('/deposit', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const amount = roundMoney(req.body.amount);
    const description = (req.body.description || 'Deposit').trim();

    if (!amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Enter a valid deposit amount' });
    }

    const user = await User.findById(req.user._id).session(session);
    user.balance = roundMoney(user.balance + amount);
    await user.save({ session });

    const [tx] = await Transaction.create(
      [
        {
          user: user._id,
          type: 'deposit',
          amount,
          balanceAfter: user.balance,
          description,
          reference: generateReference('DEP')
        }
      ],
      { session }
    );

    await session.commitTransaction();
    return res.status(201).json({
      message: 'Deposit successful',
      user: user.toSafeJSON(),
      transaction: tx
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Deposit error:', error);
    return res.status(500).json({ message: 'Deposit failed' });
  } finally {
    session.endSession();
  }
});

router.post('/withdraw', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const amount = roundMoney(req.body.amount);
    const description = (req.body.description || 'Withdrawal').trim();

    if (!amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Enter a valid withdrawal amount' });
    }

    const user = await User.findById(req.user._id).session(session);
    if (user.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    user.balance = roundMoney(user.balance - amount);
    await user.save({ session });

    const [tx] = await Transaction.create(
      [
        {
          user: user._id,
          type: 'withdraw',
          amount,
          balanceAfter: user.balance,
          description,
          reference: generateReference('WDR')
        }
      ],
      { session }
    );

    await session.commitTransaction();
    return res.status(201).json({
      message: 'Withdrawal successful',
      user: user.toSafeJSON(),
      transaction: tx
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Withdraw error:', error);
    return res.status(500).json({ message: 'Withdrawal failed' });
  } finally {
    session.endSession();
  }
});

router.post('/transfer', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const amount = roundMoney(req.body.amount);
    const toAccountNumber = String(req.body.toAccountNumber || '').trim().toUpperCase();
    const description = (req.body.description || 'Transfer').trim();

    if (!amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Enter a valid transfer amount' });
    }

    if (!toAccountNumber) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Recipient account number is required' });
    }

    const sender = await User.findById(req.user._id).session(session);
    if (sender.accountNumber === toAccountNumber) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'You cannot transfer to your own account' });
    }

    const recipient = await User.findOne({ accountNumber: toAccountNumber }).session(session);
    if (!recipient) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Recipient account not found' });
    }

    if (sender.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    sender.balance = roundMoney(sender.balance - amount);
    recipient.balance = roundMoney(recipient.balance + amount);
    await sender.save({ session });
    await recipient.save({ session });

    const outRef = generateReference('OUT');
    const inRef = generateReference('IN');

    const [outTx] = await Transaction.create(
      [
        {
          user: sender._id,
          type: 'transfer_out',
          amount,
          balanceAfter: sender.balance,
          description,
          counterpartyAccount: recipient.accountNumber,
          counterpartyName: recipient.fullName,
          reference: outRef
        }
      ],
      { session }
    );

    await Transaction.create(
      [
        {
          user: recipient._id,
          type: 'transfer_in',
          amount,
          balanceAfter: recipient.balance,
          description,
          counterpartyAccount: sender.accountNumber,
          counterpartyName: sender.fullName,
          reference: inRef
        }
      ],
      { session }
    );

    await session.commitTransaction();
    return res.status(201).json({
      message: 'Transfer successful',
      user: sender.toSafeJSON(),
      transaction: outTx
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Transfer error:', error);
    return res.status(500).json({ message: 'Transfer failed' });
  } finally {
    session.endSession();
  }
});

module.exports = router;
