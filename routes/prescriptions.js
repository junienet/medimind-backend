const express = require('express');
const router = express.Router();
const Prescription = require('../models/Prescription');
const Reminder = require('../models/Reminder');
const Patient = require('../models/Patient');
const { protect, restrictTo } = require('../middleware/auth');

// GET /api/prescriptions/my — patient gets their own prescriptions
router.get('/my', protect, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient profile not found.' });

    const prescriptions = await Prescription.find({ patientId: patient._id, status: 'active' })
      .populate('medicationId')
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });

    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/prescriptions/patient/:patientId — doctor views a patient's prescriptions
router.get('/patient/:patientId', protect, restrictTo('doctor'), async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.params.patientId })
      .populate('medicationId');
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/prescriptions — doctor creates a prescription
router.post('/', protect, restrictTo('doctor'), async (req, res) => {
  try {
    const { patientId, medicationId, start_date, end_date, notes, reminder_times } = req.body;
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found.' });

    const prescription = await Prescription.create({
      patientId, doctorId: doctor._id, medicationId, start_date, end_date, notes
    });

    // Auto-generate reminders
    if (reminder_times && reminder_times.length > 0) {
      const reminders = reminder_times.map(time => ({
        prescriptionId: prescription._id,
        reminder_time: time,
        recurring: true,
        is_active: true
      }));
      await Reminder.insertMany(reminders);
    }

    res.status(201).json(prescription);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/prescriptions/:id — update prescription
router.patch('/:id', protect, restrictTo('doctor'), async (req, res) => {
  try {
    const prescription = await Prescription.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(prescription);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
