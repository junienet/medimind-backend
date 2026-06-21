const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true },
  reminder_time:  { type: String, required: true }, // e.g. "08:00"
  recurring:      { type: Boolean, default: true },
  is_active:      { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);
