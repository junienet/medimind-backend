const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const MedicationLog = require('../models/MedicationLog');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const { protect } = require('../middleware/auth');

// GET /api/reminders/today — get today's reminders for logged-in patient
router.get('/today', protect, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient profile not found.' });

    const activePrescriptions = await Prescription.find({
      patientId: patient._id,
      status: 'active'
    });

    const prescriptionIds = activePrescriptions.map(p => p._id);
    const reminders = await Reminder.find({
      prescriptionId: { $in: prescriptionIds },
      is_active: true
    }).populate({
      path: 'prescriptionId',
      populate: { path: 'medicationId' }
    });

    // Check which ones are already completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayLogs = await MedicationLog.find({
      prescriptionId: { $in: prescriptionIds },
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const completedPrescriptionIds = new Set(
      todayLogs.filter(l => l.status === 'Completed').map(l => l.prescriptionId.toString())
    );

    const enriched = reminders.map(r => ({
      ...r.toObject(),
      completed_today: completedPrescriptionIds.has(r.prescriptionId._id.toString())
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/reminders/mark-taken — patient marks a reminder as taken
router.post('/mark-taken', protect, async (req, res) => {
  try {
    const { prescriptionId, scheduled_time } = req.body;

    const log = await MedicationLog.create({
      prescriptionId,
      scheduled_time,
      taken_time: new Date(),
      status: 'Completed'
    });

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reminders/history — patient's full medication history
router.get('/history', protect, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    const prescriptions = await Prescription.find({ patientId: patient._id });
    const ids = prescriptions.map(p => p._id);

    const logs = await MedicationLog.find({ prescriptionId: { $in: ids } })
      .populate({ path: 'prescriptionId', populate: { path: 'medicationId' } })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reminders/patient/:patientId/today — doctor views a patient's today reminders
router.get('/patient/:patientId/today', protect, async (req, res) => {
  try {
    const activePrescriptions = await Prescription.find({
      patientId: req.params.patientId,
      status: 'active'
    });

    const prescriptionIds = activePrescriptions.map(p => p._id);
    const reminders = await Reminder.find({
      prescriptionId: { $in: prescriptionIds },
      is_active: true
    }).populate({
      path: 'prescriptionId',
      populate: [
        { path: 'medicationId' },
        { path: 'patientId', populate: { path: 'userId', select: 'name phone_number' } }
      ]
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayLogs = await MedicationLog.find({
      prescriptionId: { $in: prescriptionIds },
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const completedIds = new Set(
      todayLogs.filter(l => l.status === 'Completed').map(l => l.prescriptionId.toString())
    );

    const enriched = reminders.map(r => ({
      ...r.toObject(),
      completed_today: completedIds.has(r.prescriptionId._id.toString()),
      taken_time: todayLogs.find(l =>
        l.prescriptionId.toString() === r.prescriptionId._id.toString() &&
        l.status === 'Completed'
      )?.taken_time || null
    }));

    // Sort: not taken first, then taken
    enriched.sort((a, b) => {
      if (a.completed_today === b.completed_today)
        return (a.reminder_time || '').localeCompare(b.reminder_time || '');
      return a.completed_today ? 1 : -1;
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reminders/patient/:patientId/history — doctor views a patient's medication history
router.get('/patient/:patientId/history', protect, async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.params.patientId });
    const ids = prescriptions.map(p => p._id);

    const logs = await MedicationLog.find({ prescriptionId: { $in: ids } })
      .populate({ path: 'prescriptionId', populate: { path: 'medicationId' } })
      .sort({ createdAt: -1 })
      .limit(60);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
