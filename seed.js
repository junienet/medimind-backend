/**
 * MediMind — Seed Script
 * Run from the backend folder: node seed.js
 * Wipes existing data and inserts fresh dummy records.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User          = require('./models/User');
const Doctor        = require('./models/Doctor');
const Patient       = require('./models/Patient');
const Medication    = require('./models/Medication');
const Prescription  = require('./models/Prescription');
const Reminder      = require('./models/Reminder');
const MedicationLog = require('./models/MedicationLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medimind';

// ─────────────────────────────────────────────
//  RAW DATA
// ─────────────────────────────────────────────

const DOCTORS_RAW = [
  { name: 'Dr. Amirah Razak',    phone: '+60111000001', email: 'amirah@medimind.com',    password: 'doctor123', specialisation: 'General Practitioner', license_num: 'MMC-10001', institution: 'Klinik Perdana Kuantan' },
  { name: 'Dr. Farouk Hassan',   phone: '+60111000002', email: 'farouk@medimind.com',    password: 'doctor123', specialisation: 'Internal Medicine',     license_num: 'MMC-10002', institution: 'Hospital Tengku Ampuan Afzan' },
  { name: 'Dr. Mei Ling Chong',  phone: '+60111000003', email: 'meiling@medimind.com',   password: 'doctor123', specialisation: 'Psychiatry',            license_num: 'MMC-10003', institution: 'Klinik Kesihatan Jaya' },
];

const PATIENTS_RAW = [
  { name: 'Ahmad Syahir',    phone: '+60122000001', email: 'syahir@mail.com',    password: 'patient123', diagnosis: 'Hypertension' },
  { name: 'Nurul Ain Yusof', phone: '+60122000002', email: 'nurul@mail.com',     password: 'patient123', diagnosis: 'Type 2 Diabetes' },
  { name: 'Kavitha Rajan',   phone: '+60122000003', email: 'kavitha@mail.com',   password: 'patient123', diagnosis: 'Seasonal Allergies' },
  { name: 'Wei Jian Lim',    phone: '+60122000004', email: 'weijian@mail.com',   password: 'patient123', diagnosis: 'Depression' },
  { name: 'Siti Hajar Nor',  phone: '+60122000005', email: 'sitihajar@mail.com', password: 'patient123', diagnosis: 'Asthma' },
  { name: 'Raj Krishnan',    phone: '+60122000006', email: 'raj@mail.com',       password: 'patient123', diagnosis: 'High Cholesterol' },
  { name: 'Farah Liyana',    phone: '+60122000007', email: 'farah@mail.com',     password: 'patient123', diagnosis: 'Migraine' },
  { name: 'Daniel Chew',     phone: '+60122000008', email: 'daniel@mail.com',    password: 'patient123', diagnosis: 'Acid Reflux (GERD)' },
  { name: 'Aisyah Zulkifli', phone: '+60122000009', email: 'aisyah@mail.com',   password: 'patient123', diagnosis: 'Anxiety Disorder' },
];

const MEDICATIONS_RAW = [
  { medication_name: 'Amlodipine',     dosage: '5mg',   frequency: 'Once daily',  duration: 'Ongoing',  instructions: 'Take in the morning with water',          description: 'Calcium channel blocker for hypertension' },
  { medication_name: 'Metformin',      dosage: '500mg', frequency: 'Twice daily', duration: 'Ongoing',  instructions: 'Take with meals to reduce stomach upset',  description: 'Biguanide for Type 2 Diabetes management' },
  { medication_name: 'Cetirizine',     dosage: '10mg',  frequency: 'Once daily',  duration: '7 days',   instructions: 'Take at night — may cause drowsiness',     description: 'Antihistamine for allergic reactions' },
  { medication_name: 'Sertraline',     dosage: '50mg',  frequency: 'Once daily',  duration: 'Ongoing',  instructions: 'Take in the morning with or without food', description: 'SSRI antidepressant for depression and anxiety' },
  { medication_name: 'Salbutamol',     dosage: '100mcg',frequency: 'As needed',   duration: 'Ongoing',  instructions: 'Inhale 1-2 puffs when experiencing symptoms', description: 'Bronchodilator inhaler for asthma relief' },
  { medication_name: 'Atorvastatin',   dosage: '20mg',  frequency: 'Once daily',  duration: 'Ongoing',  instructions: 'Take at night for best effect',            description: 'Statin for lowering LDL cholesterol' },
  { medication_name: 'Sumatriptan',    dosage: '50mg',  frequency: 'As needed',   duration: 'Per attack',instructions: 'Take at first sign of migraine. Max 2 doses per 24hr', description: 'Triptan for acute migraine relief' },
  { medication_name: 'Omeprazole',     dosage: '20mg',  frequency: 'Once daily',  duration: '4 weeks',  instructions: 'Take 30 minutes before breakfast',         description: 'Proton pump inhibitor for acid reflux (GERD)' },
  { medication_name: 'Escitalopram',   dosage: '10mg',  frequency: 'Once daily',  duration: 'Ongoing',  instructions: 'Take at the same time each day',           description: 'SSRI for anxiety disorder and depression' },
  { medication_name: 'Paracetamol',    dosage: '500mg', frequency: 'Up to 4x daily', duration: 'As needed', instructions: 'Do not exceed 4 doses in 24 hours',   description: 'Analgesic and antipyretic for pain and fever' },
];

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysAhead(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }

function pad(credentials, role, name, phone, password) {
  credentials.push({ role, name, phone, password });
}

// ─────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✔ Connected to database\n');

  // Wipe existing data
  await Promise.all([
    User.deleteMany({}), Doctor.deleteMany({}), Patient.deleteMany({}),
    Medication.deleteMany({}), Prescription.deleteMany({}),
    Reminder.deleteMany({}), MedicationLog.deleteMany({})
  ]);
  console.log('✔ Cleared existing data\n');

  const credentials = [];

  // ── Create doctors ──
  const doctorDocs = [];
  for (const d of DOCTORS_RAW) {
    const user = await User.create({
      phone_number: d.phone, name: d.name, email: d.email,
      password: d.password, user_type: 'doctor'
    });
    const doctor = await Doctor.create({
      userId: user._id, specialisation: d.specialisation,
      license_num: d.license_num, institution: d.institution
    });
    doctorDocs.push({ user, doctor });
    pad(credentials, 'Doctor', d.name, d.phone, d.password);
  }

  // ── Create patients ──
  const patientDocs = [];
  for (let i = 0; i < PATIENTS_RAW.length; i++) {
    const p = PATIENTS_RAW[i];
    const user = await User.create({
      phone_number: p.phone, name: p.name, email: p.email,
      password: p.password, user_type: 'patient'
    });
    // Distribute patients across doctors
    const assignedDoctor = doctorDocs[i % doctorDocs.length];
    const patient = await Patient.create({
      userId: user._id, doctorId: assignedDoctor.doctor._id, diagnosis: p.diagnosis
    });
    patientDocs.push({ user, patient, assignedDoctor });
    pad(credentials, 'Patient', p.name, p.phone, p.password);
  }

  // ── Create medications ──
  const medDocs = await Medication.insertMany(MEDICATIONS_RAW);
  console.log(`✔ Created ${medDocs.length} medications`);

  // ── Prescriptions + reminders + logs ──
  // Map each patient to a relevant medication
  const prescriptionPairs = [
    { patientIdx: 0, medName: 'Amlodipine',   times: ['08:00'],         daysBack: 14, daysForward: 60 },
    { patientIdx: 1, medName: 'Metformin',     times: ['07:30', '19:30'],daysBack: 30, daysForward: 60 },
    { patientIdx: 2, medName: 'Cetirizine',    times: ['21:00'],         daysBack: 3,  daysForward: 4  },
    { patientIdx: 3, medName: 'Sertraline',    times: ['09:00'],         daysBack: 21, daysForward: 90 },
    { patientIdx: 4, medName: 'Salbutamol',    times: ['08:00', '20:00'],daysBack: 7,  daysForward: 30 },
    { patientIdx: 5, medName: 'Atorvastatin',  times: ['21:00'],         daysBack: 10, daysForward: 60 },
    { patientIdx: 6, medName: 'Sumatriptan',   times: ['08:00'],         daysBack: 5,  daysForward: 14 },
    { patientIdx: 7, medName: 'Omeprazole',    times: ['07:00'],         daysBack: 10, daysForward: 18 },
    { patientIdx: 8, medName: 'Escitalopram',  times: ['09:00'],         daysBack: 14, daysForward: 90 },
    // Give patient 0 a second medication too
    { patientIdx: 0, medName: 'Paracetamol',   times: ['08:00', '14:00', '20:00'], daysBack: 2, daysForward: 5 },
  ];

  let prescriptionCount = 0, reminderCount = 0, logCount = 0;

  for (const pair of prescriptionPairs) {
    const { user: patientUser, patient, assignedDoctor } = patientDocs[pair.patientIdx];
    const med = medDocs.find(m => m.medication_name === pair.medName);
    if (!med) continue;

    const prescription = await Prescription.create({
      patientId:    patient._id,
      doctorId:     assignedDoctor.doctor._id,
      medicationId: med._id,
      start_date:   daysAgo(pair.daysBack),
      end_date:     daysAhead(pair.daysForward),
      status:       'active',
      notes:        `Prescribed for ${PATIENTS_RAW[pair.patientIdx].diagnosis}`
    });
    prescriptionCount++;

    // Create reminders
    for (const time of pair.times) {
      await Reminder.create({
        prescriptionId: prescription._id,
        reminder_time:  time,
        recurring:      true,
        is_active:      true
      });
      reminderCount++;
    }

    // Seed medication logs for the past few days
    // Simulate realistic adherence: ~80% taken
    const today = new Date(); today.setHours(0,0,0,0);
    for (let day = pair.daysBack; day >= 1; day--) {
      for (const time of pair.times) {
        const [h, m] = time.split(':').map(Number);
        const scheduled = new Date(today);
        scheduled.setDate(scheduled.getDate() - day);
        scheduled.setHours(h, m, 0, 0);

        // 80% chance taken, 20% ignored
        const taken = Math.random() > 0.2;
        const takenTime = new Date(scheduled.getTime() + Math.floor(Math.random() * 30 + 1) * 60000);

        await MedicationLog.create({
          prescriptionId: prescription._id,
          scheduled_time: time,
          taken_time:     taken ? takenTime : null,
          status:         taken ? 'Completed' : 'Ignored',
          createdAt:      scheduled
        });
        logCount++;
      }
    }
  }

  console.log(`✔ Created ${prescriptionCount} prescriptions`);
  console.log(`✔ Created ${reminderCount} reminders`);
  console.log(`✔ Created ${logCount} medication log entries\n`);

  // ─────────────────────────────────────────────
  //  PRINT CREDENTIALS TABLE
  // ─────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  MEDIMIND — LOGIN CREDENTIALS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const doctors  = credentials.filter(c => c.role === 'Doctor');
  const patients = credentials.filter(c => c.role === 'Patient');

  console.log('  DOCTORS');
  console.log('  ───────────────────────────────────────────────────────────');
  for (const c of doctors) {
    console.log(`  ${c.name.padEnd(22)} ${c.phone.padEnd(16)} ${c.password}`);
  }

  console.log('');
  console.log('  PATIENTS');
  console.log('  ───────────────────────────────────────────────────────────');
  for (const c of patients) {
    console.log(`  ${c.name.padEnd(22)} ${c.phone.padEnd(16)} ${c.password}`);
  }

  console.log('');
  console.log('  All passwords: doctors → doctor123 | patients → patient123');
  console.log('═══════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('✔ Done. Database seeded successfully.');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
