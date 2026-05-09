'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../data/store');

const router = express.Router();

// GET all courses (with professor and student count info)
router.get('/', (req, res) => {
  const courses = store.courses.map(course => {
    const professor = store.professors.find(p => p.id === course.professorId);
    const confirmed = store.confirmedSchedules.find(s => s.courseId === course.id);
    return {
      ...course,
      professorName: professor ? professor.name : 'Unknown',
      enrolledCount: course.enrolledStudents.length,
      scheduledAt: confirmed
        ? { day: confirmed.day, timeSlot: confirmed.timeSlot, room: confirmed.roomName }
        : null,
    };
  });
  res.json(courses);
});

// GET single course
router.get('/:id', (req, res) => {
  const course = store.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const professor = store.professors.find(p => p.id === course.professorId);
  const students = course.enrolledStudents.map(id => store.students.find(s => s.id === id)).filter(Boolean);

  res.json({
    ...course,
    professor: professor || null,
    students,
  });
});

// POST create course
router.post('/', (req, res) => {
  const { name, code, credits, type, professorId, enrolledStudents } = req.body;
  if (!name || !code || !professorId) {
    return res.status(400).json({ error: 'name, code, and professorId are required' });
  }

  if (!store.professors.find(p => p.id === professorId)) {
    return res.status(404).json({ error: 'Professor not found' });
  }

  if (store.courses.some(c => c.code === code)) {
    return res.status(409).json({ error: 'Course code already exists' });
  }

  const course = {
    id: uuidv4(),
    name,
    code,
    credits: credits || 3,
    type: type || 'Kuliah',
    professorId,
    enrolledStudents: enrolledStudents || [],
  };
  store.courses.push(course);

  // Update enrolled students' course list
  course.enrolledStudents.forEach(sid => {
    const student = store.students.find(s => s.id === sid);
    if (student && !student.enrolledCourses.includes(course.id)) {
      student.enrolledCourses.push(course.id);
    }
  });

  res.status(201).json(course);
});

// PUT update course
router.put('/:id', (req, res) => {
  const idx = store.courses.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Course not found' });

  const { name, code, credits, type, professorId, enrolledStudents } = req.body;
  const course = store.courses[idx];

  if (name) course.name = name;
  if (code) course.code = code;
  if (credits) course.credits = credits;
  if (type) course.type = type;
  if (professorId) {
    if (!store.professors.find(p => p.id === professorId)) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    course.professorId = professorId;
  }
  if (enrolledStudents) course.enrolledStudents = enrolledStudents;

  res.json(course);
});

// DELETE course
router.delete('/:id', (req, res) => {
  const idx = store.courses.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Course not found' });

  // Remove confirmed schedule if any
  const schedIdx = store.confirmedSchedules.findIndex(s => s.courseId === req.params.id);
  if (schedIdx !== -1) store.confirmedSchedules.splice(schedIdx, 1);

  // Remove course from students' enrolled lists
  store.students.forEach(s => {
    s.enrolledCourses = s.enrolledCourses.filter(id => id !== req.params.id);
  });

  store.courses.splice(idx, 1);
  res.json({ message: 'Course deleted' });
});

module.exports = router;
