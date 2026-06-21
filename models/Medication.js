const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  medication_name: { type: String, required: true, trim: true },
  dosage:          { type: String, required: true },
  frequency:       { type: String },
  duration:        { type: String },
  instructions:    { type: String },
  description:     { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Medication', medicationSchema);
