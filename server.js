const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const { initBot } = require('./services/telegramBot');
const { startScheduler } = require('./services/reminderScheduler');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:8080', 'http://127.0.0.1:5500', 'null']
    : ['http://localhost:8080', 'http://localhost:5173', 'http://127.0.0.1:5500', 'null'],
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/medications', require('./routes/medications'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/telegram', require('./routes/telegram'));

// Telegram webhook endpoint
app.post('/api/telegram/webhook', (req, res) => {
  const bot = require('./services/telegramBot').getBot();
  if (bot) {
    bot.processUpdate(req.body);
  }
  else {
    console.error('⚠ Bot instance not initialized');

  }
  res.sendStatus(200);
});
app.get('/api/health', (req, res) => res.json({ status: 'MediMind API is running' }));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medimind';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to database');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`MediMind API running on port ${PORT}`));

    // Start Telegram bot + reminder scheduler (no-op if TELEGRAM_BOT_TOKEN is unset)
    initBot();
    startScheduler();
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
