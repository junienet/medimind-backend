const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  phone_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\+?[0-9]{10,15}$/, 'Please enter a valid phone number']
  },
  name: { type: String, required: true, trim: true, maxlength: 64 },
  email: { type: String, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  user_type: {
    type: String,
    enum: ['patient', 'doctor', 'unverified'],
    default: 'unverified'
  },
  telegram_chat_id: { type: String, default: null },
  telegram_link_code: { type: String, default: null },
  telegram_link_code_expires: { type: Date, default: null }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Hide password and telegram link code in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.telegram_link_code;
  delete obj.telegram_link_code_expires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
