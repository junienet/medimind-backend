const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  diagnosis: { type: String },
  date_of_birth: { type: Date },
  address:   { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
