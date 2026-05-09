'use strict';

const express = require('express');
const path = require('path');

const professorsRouter = require('./src/routes/professors');
const studentsRouter   = require('./src/routes/students');
const roomsRouter      = require('./src/routes/rooms');
const coursesRouter    = require('./src/routes/courses');
const scheduleRouter   = require('./src/routes/schedule');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/professors', professorsRouter);
app.use('/api/students',   studentsRouter);
app.use('/api/rooms',      roomsRouter);
app.use('/api/courses',    coursesRouter);
app.use('/api/schedule',   scheduleRouter);

// Fallback – serve the SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

/* istanbul ignore next */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Sistem Rekomendasi Jadwal running at http://localhost:${PORT}`);
  });
}

module.exports = app;
