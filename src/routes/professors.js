'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../data/store');

const router = express.Router();

// GET all professors
router.get('/', (req, res) => {
  res.json(store.professors);
});

// GET single professor
router.get('/:id', (req, res) => {
  const professor = store.professors.find(p => p.id === req.params.id);
  if (!professor) return res.status(404).json({ error: 'Professor not found' });
  res.json(professor);
});

// POST create professor
router.post('/', (req, res) => {
  const { name, nidn, preferences } = req.body;
  if (!name || !nidn) return res.status(400).json({ error: 'name and nidn are required' });

  const professor = {
    id: uuidv4(),
    name,
    nidn,
    preferences: preferences || { days: [], timeSlots: [] },
  };
  store.professors.push(professor);
  res.status(201).json(professor);
});

// PUT update professor
router.put('/:id', (req, res) => {
  const idx = store.professors.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Professor not found' });

  const { name, nidn, preferences } = req.body;
  const professor = store.professors[idx];
  if (name) professor.name = name;
  if (nidn) professor.nidn = nidn;
  if (preferences) professor.preferences = preferences;

  res.json(professor);
});

// DELETE professor
router.delete('/:id', (req, res) => {
  const idx = store.professors.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Professor not found' });

  // Prevent deletion if professor is assigned to a course
  const assigned = store.courses.some(c => c.professorId === req.params.id);
  if (assigned) return res.status(409).json({ error: 'Professor is assigned to one or more courses' });

  store.professors.splice(idx, 1);
  res.json({ message: 'Professor deleted' });
});

module.exports = router;
