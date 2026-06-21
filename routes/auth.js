const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { protect } = require('../middleware/auth');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { phone_number, name, email, password, user_type } = req.body;

    if (!phone_number || !name || !password) {
      return res.status(400).json({ message: 'Phone number, name, and password are required.' });
    }

    const existing = await User.findOne({ phone_number });
    if (existing) {
      return res.status(409).json({ message: 'An account with this phone number already exists.' });
    }

    const userType = user_type === 'doctor' ? 'doctor' : 'patient';
    const user = await User.create({ phone_number, name, email, password, user_type: userType });

    // Create subtype profile
    if (userType === 'patient') {
      await Patient.create({ userId: user._id });
    } else if (userType === 'doctor') {
      const { specialisation, license_num, institution } = req.body;
      await Doctor.create({ userId: user._id, specialisation, license_num, institution });
    }

    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone_number, password } = req.body;

    if (!phone_number || !password) {
      return res.status(400).json({ message: 'Phone number and password are required.' });
    }

    const user = await User.findOne({ phone_number });
    if (!user) {
      return res.status(401).json({ code: 'WRONG_PHONE', message: 'No account found with that phone number.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ code: 'WRONG_PASSWORD', message: 'Incorrect password. Please try again.' });
    }

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/me — update name and email
router.patch('/me', protect, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true }
    ).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me/doctor — get doctor professional details
router.get('/me/doctor', protect, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found.' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
