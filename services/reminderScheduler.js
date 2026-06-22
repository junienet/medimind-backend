/**
 * MediMind — Reminder Scheduler
 *
 * Runs every minute. For each active reminder whose time matches
 * the current HH:MM, sends a Telegram message to the patient
 * (if their account is linked) — but only once per day per reminder.
 */

const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const MedicationLog = require('../models/MedicationLog');
const { sendReminder } = require('./telegramBot');

function startScheduler() {
  // Runs at the top of every minute: "* * * * *"
  cron.schedule('* * * * *', async () => {
    try {
      const nowUTC = new Date();
      const nowMYT = new Date(nowUTC.getTime() + (8 * 60 * 60 * 1000));
      const hh = String(nowMYT.getHours()).padStart(2, '0');
      const mm = String(nowMYT.getMinutes()).padStart(2, '0');
      const currentTime = `${hh}:${mm}`;

      const dueReminders = await Reminder.find({
        reminder_time: currentTime,
        is_active: true
      }).populate({
        path: 'prescriptionId',
        match: { status: 'active' },
        populate: [
          { path: 'medicationId' },
          { path: 'patientId', populate: { path: 'userId' } }
        ]
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const reminder of dueReminders) {
        const prescription = reminder.prescriptionId;
        if (!prescription) continue; // prescription not active, skip

        const patientUser = prescription.patientId?.userId;
        if (!patientUser?.telegram_chat_id) continue; // not linked to Telegram

        // Avoid sending twice for the same dose on the same day
        const alreadyLogged = await MedicationLog.findOne({
          prescriptionId: prescription._id,
          scheduled_time: currentTime,
          createdAt: { $gte: today }
        });
        if (alreadyLogged) continue;

        await sendReminder(patientUser.telegram_chat_id, {
          medicationName: prescription.medicationId?.medication_name || 'Medication',
          dosage: prescription.medicationId?.dosage || '',
          instructions: prescription.medicationId?.instructions || '',
          prescriptionId: prescription._id,
          reminderTime: currentTime
        });

        console.log(`📩 Sent Telegram reminder to ${patientUser.name} — ${prescription.medicationId?.medication_name} (${currentTime})`);
      }
    } catch (err) {
      console.error('Reminder scheduler error:', err.message);
    }
  });

  console.log('✔ Reminder scheduler started (checking every minute)');
}

module.exports = { startScheduler };
