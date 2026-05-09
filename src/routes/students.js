'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../data/store');

const router = express.Router();

// GET all students
router.get('/', (req, res) => {
  res.json(store.students);
});

// GET single student
router.get('/:id', (req, res) => {
  const student = store.students.find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

// POST create student
router.post('/', (req, res) => {
  const { name, nim, preferences } = req.body;
  if (!name || !nim) return res.status(400).json({ error: 'name and nim are required' });

  // Ensure NIM is unique
  if (store.students.some(s => s.nim === nim)) {
    return res.status(409).json({ error: 'NIM already exists' });
  }

  const student = {
    id: uuidv4(),
    name,
    nim,
    preferences: preferences || { days: [], timeSlots: [] },
    enrolledCourses: [],
  };
  store.students.push(student);
  res.status(201).json(student);
});

// PUT update student
router.put('/:id', (req, res) => {
  const idx = store.students.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Student not found' });

  const { name, nim, preferences, enrolledCourses } = req.body;
  const student = store.students[idx];
  if (name) student.name = name;
  if (nim) {
    // Ensure updated NIM is unique across other students
    if (nim !== student.nim && store.students.some(s => s.nim === nim)) {
      return res.status(409).json({ error: 'NIM already exists' });
    }
    student.nim = nim;
  }
  if (preferences) student.preferences = preferences;
  if (enrolledCourses) student.enrolledCourses = enrolledCourses;

  res.json(student);
});

// DELETE student
router.delete('/:id', (req, res) => {
  const idx = store.students.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Student not found' });

  // Remove student from all courses
  store.courses.forEach(c => {
    c.enrolledStudents = c.enrolledStudents.filter(id => id !== req.params.id);
  });

  store.students.splice(idx, 1);
  res.json({ message: 'Student deleted' });
});

// POST enroll student in a course
router.post('/:id/enroll', (req, res) => {
  const student = store.students.find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const { courseId } = req.body;
  if (!courseId) return res.status(400).json({ error: 'courseId is required' });

  const course = store.courses.find(c => c.id === courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  if (!student.enrolledCourses.includes(courseId)) {
    student.enrolledCourses.push(courseId);
  }
  if (!course.enrolledStudents.includes(student.id)) {
    course.enrolledStudents.push(student.id);
  }

  res.json({ message: 'Enrolled successfully', student, course });
});

// DELETE unenroll student from a course
router.delete('/:id/enroll/:courseId', (req, res) => {
  const student = store.students.find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const course = store.courses.find(c => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  student.enrolledCourses = student.enrolledCourses.filter(id => id !== req.params.courseId);
  course.enrolledStudents = course.enrolledStudents.filter(id => id !== student.id);

  res.json({ message: 'Unenrolled successfully' });
});

module.exports = router;
