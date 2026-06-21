const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patientId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor',  required: true },
  medicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medication', required: true },
  start_date:   { type: Date, required: true },
  end_date:     { type: Date, required: true },
  status:       { type: String, enum: ['active', 'ended', 'paused'], default: 'active' },
  notes:        { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
