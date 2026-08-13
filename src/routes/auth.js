const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateAccountNumber } = require('../utils/helpers');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    let accountNumber = generateAccountNumber();
    while (await User.exists({ accountNumber })) {
      accountNumber = generateAccountNumber();
    }

    const user = await User.create({
      fullName: String(fullName).trim(),
      email: String(email).toLowerCase().trim(),
      password,
      accountNumber,
      balance: 1000
    });

    const token = signToken(user);
    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: user.toSafeJSON()
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Unable to register account' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);
    return res.json({
      message: 'Login successful',
      token,
      user: user.toSafeJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Unable to login' });
  }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  return res.json({ user: req.user.toSafeJSON() });
});

module.exports = router;
