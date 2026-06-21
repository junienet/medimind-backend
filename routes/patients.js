const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { protect, restrictTo } = require('../middleware/auth');

// GET /api/patients/search?name=query — doctor searches ALL patients by name
router.get('/search', protect, restrictTo('doctor'), async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || name.trim().length < 1) return res.json([]);

    // Find all users with user_type patient whose name matches (case-insensitive)
    const matchingUsers = await User.find({
      user_type: 'patient',
      name: { $regex: name.trim(), $options: 'i' }
    }).select('_id name phone_number email');

    if (!matchingUsers.length) return res.json([]);

    const userIds = matchingUsers.map(u => u._id);

    // Get their patient profiles
    const patients = await Patient.find({ userId: { $in: userIds } })
      .populate('userId', 'name phone_number email')
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });

    // Get this doctor's profile to mark which patients are already theirs
    const doctor = await Doctor.findOne({ userId: req.user._id });
    const myPatientIds = new Set(
      patients
        .filter(p => p.doctorId?._id?.toString() === doctor?._id?.toString())
        .map(p => p._id.toString())
    );

    const result = patients.map(p => ({
      ...p.toObject(),
      isMyPatient: myPatientIds.has(p._id.toString())
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/', protect, restrictTo('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found.' });

    const patients = await Patient.find({ doctorId: doctor._id })
      .populate('userId', 'name phone_number email');
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/patients/assign — doctor assigns a patient by phone number
router.post('/assign', protect, restrictTo('doctor'), async (req, res) => {
  try {
    const { phone_number } = req.body;
    const doctor = await Doctor.findOne({ userId: req.user._id });

    const patientUser = await User.findOne({ phone_number, user_type: 'patient' });
    if (!patientUser) {
      return res.status(404).json({ message: 'No patient found with that phone number.' });
    }

    const patient = await Patient.findOneAndUpdate(
      { userId: patientUser._id },
      { doctorId: doctor._id },
      { new: true }
    ).populate('userId', 'name phone_number email');

    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/patients/profile — patient gets their own profile
router.get('/profile', protect, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id })
      .populate('userId', 'name phone_number email')
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/patients/profile — patient updates their own profile
router.patch('/profile', protect, async (req, res) => {
  try {
    const { name, email } = req.body;
    await User.findByIdAndUpdate(req.user._id, { name, email });
    const patient = await Patient.findOneAndUpdate(
      { userId: req.user._id },
      { date_of_birth: req.body.date_of_birth, address: req.body.address },
      { new: true }
    ).populate('userId', 'name phone_number email');
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
