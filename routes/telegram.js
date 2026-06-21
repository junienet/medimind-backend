const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// POST /api/telegram/link-code — generate a 6-digit code, valid for 10 minutes
router.post('/link-code', protect, async (req, res) => {
  try {
    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await User.findByIdAndUpdate(req.user._id, {
      telegram_link_code: code,
      telegram_link_code_expires: expires
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'YourMediMindBot';

    res.json({
      code,
      expires_in_minutes: 10,
      bot_link: `https://t.me/${botUsername}?start=${code}`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/telegram/status — check if this user's Telegram is linked
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ linked: !!user.telegram_chat_id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/telegram/unlink — disconnect Telegram from this account
router.post('/unlink', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { telegram_chat_id: null });
    res.json({ message: 'Telegram disconnected.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
