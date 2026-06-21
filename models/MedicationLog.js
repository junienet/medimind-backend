const mongoose = require('mongoose');

const medicationLogSchema = new mongoose.Schema({
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true },
  scheduled_time: { type: String, required: true },
  taken_time:     { type: Date },
  status:         { type: String, enum: ['Completed', 'Active', 'Ignored'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('MedicationLog', medicationLogSchema);
