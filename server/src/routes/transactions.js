const express = require('express');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const type = req.query.type;
    const filter = { user: req.user._id };

    if (type && ['deposit', 'withdraw', 'transfer_in', 'transfer_out'].includes(type)) {
      filter.type = type;
    }

    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    return res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    console.error('Transactions list error:', error);
    return res.status(500).json({ message: 'Unable to load transactions' });
  }
});

module.exports = router;
