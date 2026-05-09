'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../data/store');

const router = express.Router();

// GET all rooms
router.get('/', (req, res) => {
  const rooms = store.rooms.map(room => ({
    ...room,
    scheduledSlots: store.confirmedSchedules
      .filter(s => s.roomId === room.id)
      .map(s => ({ day: s.day, timeSlot: s.timeSlot, courseName: s.courseName })),
  }));
  res.json(rooms);
});

// GET single room
router.get('/:id', (req, res) => {
  const room = store.rooms.find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

// POST create room
router.post('/', (req, res) => {
  const { name, capacity, type } = req.body;
  if (!name || !capacity) return res.status(400).json({ error: 'name and capacity are required' });
  if (typeof capacity !== 'number' || capacity < 1) {
    return res.status(400).json({ error: 'capacity must be a positive number' });
  }

  const room = {
    id: uuidv4(),
    name,
    capacity,
    type: type || 'Kuliah',
  };
  store.rooms.push(room);
  res.status(201).json(room);
});

// PUT update room
router.put('/:id', (req, res) => {
  const idx = store.rooms.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Room not found' });

  const { name, capacity, type } = req.body;
  const room = store.rooms[idx];
  if (name) room.name = name;
  if (capacity) room.capacity = capacity;
  if (type) room.type = type;

  res.json(room);
});

// DELETE room
router.delete('/:id', (req, res) => {
  const idx = store.rooms.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Room not found' });

  const inUse = store.confirmedSchedules.some(s => s.roomId === req.params.id);
  if (inUse) return res.status(409).json({ error: 'Room is in use by a confirmed schedule' });

  store.rooms.splice(idx, 1);
  res.json({ message: 'Room deleted' });
});

module.exports = router;
