'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store, TIME_SLOTS, DAYS } = require('../data/store');
const { generateRecommendations } = require('../algorithm/scheduler');

const router = express.Router();

// GET all confirmed schedules
router.get('/', (req, res) => {
  res.json(store.confirmedSchedules);
});

// GET confirmed schedule for a specific course
router.get('/course/:courseId', (req, res) => {
  const schedule = store.confirmedSchedules.find(s => s.courseId === req.params.courseId);
  if (!schedule) return res.status(404).json({ error: 'No confirmed schedule for this course' });
  res.json(schedule);
});

// GET available time slots and constants
router.get('/slots', (req, res) => {
  res.json({ days: DAYS, timeSlots: TIME_SLOTS });
});

// POST generate recommendations for a course
router.post('/recommend/:courseId', (req, res) => {
  const { weights } = req.body || {};
  try {
    const result = generateRecommendations(req.params.courseId, weights);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST confirm a schedule (choose one recommendation)
router.post('/confirm', (req, res) => {
  const { courseId, day, timeSlot, roomId } = req.body;
  if (!courseId || !day || !timeSlot || !roomId) {
    return res.status(400).json({ error: 'courseId, day, timeSlot, and roomId are required' });
  }

  const course = store.courses.find(c => c.id === courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const room = store.rooms.find(r => r.id === roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const professor = store.professors.find(p => p.id === course.professorId);
  if (!professor) return res.status(404).json({ error: 'Professor not found' });

  // Check room is not already booked at this slot (by another course)
  const roomConflict = store.confirmedSchedules.find(
    s => s.roomId === roomId && s.day === day && s.timeSlot === timeSlot && s.courseId !== courseId,
  );
  if (roomConflict) {
    return res.status(409).json({ error: `Room "${room.name}" is already booked at ${day} ${timeSlot} for course "${roomConflict.courseName}"` });
  }

  // Check professor is not already teaching at this slot (another course)
  const profConflict = store.confirmedSchedules.find(
    s => s.professorId === professor.id && s.day === day && s.timeSlot === timeSlot && s.courseId !== courseId,
  );
  if (profConflict) {
    return res.status(409).json({ error: `Professor "${professor.name}" already has a class at ${day} ${timeSlot}` });
  }

  // Remove existing confirmed schedule for this course (re-scheduling)
  const existingIdx = store.confirmedSchedules.findIndex(s => s.courseId === courseId);
  if (existingIdx !== -1) store.confirmedSchedules.splice(existingIdx, 1);

  const schedule = {
    id: uuidv4(),
    courseId,
    courseName: course.name,
    courseCode: course.code,
    professorId: professor.id,
    professorName: professor.name,
    roomId,
    roomName: room.name,
    roomCapacity: room.capacity,
    day,
    timeSlot,
    enrolledCount: course.enrolledStudents.length,
    confirmedAt: new Date().toISOString(),
  };

  store.confirmedSchedules.push(schedule);
  res.status(201).json(schedule);
});

// DELETE a confirmed schedule
router.delete('/:id', (req, res) => {
  const idx = store.confirmedSchedules.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Schedule not found' });
  store.confirmedSchedules.splice(idx, 1);
  res.json({ message: 'Schedule removed' });
});

module.exports = router;
