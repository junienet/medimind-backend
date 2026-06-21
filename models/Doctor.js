const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  specialisation: { type: String, required: true },
  license_num:    { type: String, required: true, unique: true },
  institution:    { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
