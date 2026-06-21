const express = require('express');
const router = express.Router();
const Medication = require('../models/Medication');
const { protect, restrictTo } = require('../middleware/auth');

// GET /api/medications — list all medications (for prescription dropdown)
router.get('/', protect, async (req, res) => {
  try {
    const medications = await Medication.find().sort({ medication_name: 1 });
    res.json(medications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/medications — doctor adds a new medication to the system
router.post('/', protect, restrictTo('doctor'), async (req, res) => {
  try {
    const med = await Medication.create(req.body);
    res.status(201).json(med);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
