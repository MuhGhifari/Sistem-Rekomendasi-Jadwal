'use strict';

/**
 * Unit tests for the scheduling recommendation algorithm.
 *
 * NOTE: Because store.js calls seedData() at module load time we re-require
 * the algorithm after manipulating the store.
 */

// ─── Isolate the store so we can manipulate it freely ────────────────────────
jest.mock('../src/data/store', () => {
  const { v4: uuidv4 } = require('uuid');
  const TIME_SLOTS = ['07:00-08:40', '08:40-10:20', '10:20-12:00', '13:00-14:40', '14:40-16:20', '16:20-18:00'];
  const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  const store = {
    professors: [],
    students: [],
    rooms: [],
    courses: [],
    confirmedSchedules: [],
  };

  return { store, TIME_SLOTS, DAYS };
});

const { store } = require('../src/data/store');
const {
  professorPreferenceScore,
  studentPreferenceScore,
  roomSuitabilityScore,
  isRoomAvailable,
  isProfessorAvailable,
  generateRecommendations,
} = require('../src/algorithm/scheduler');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clearStore() {
  store.professors = [];
  store.students = [];
  store.rooms = [];
  store.courses = [];
  store.confirmedSchedules = [];
}

function makeProfessor(overrides = {}) {
  return {
    id: 'prof-1',
    name: 'Dr. Test',
    nidn: '0000000001',
    preferences: { days: ['Senin', 'Rabu'], timeSlots: ['08:40-10:20'] },
    ...overrides,
  };
}

function makeStudent(id, days, timeSlots) {
  return { id, name: `Student ${id}`, nim: id, preferences: { days, timeSlots }, enrolledCourses: [] };
}

function makeRoom(overrides = {}) {
  return { id: 'room-1', name: 'Ruang A', capacity: 30, type: 'Kuliah', ...overrides };
}

function makeCourse(overrides = {}) {
  return {
    id: 'course-1',
    name: 'Test Course',
    code: 'TC101',
    credits: 3,
    type: 'Kuliah',
    professorId: 'prof-1',
    enrolledStudents: [],
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// professorPreferenceScore
// ═════════════════════════════════════════════════════════════════════════════
describe('professorPreferenceScore', () => {
  const prof = makeProfessor();

  test('returns 1.0 when both day and timeSlot match preference', () => {
    expect(professorPreferenceScore(prof, 'Senin', '08:40-10:20')).toBe(1.0);
  });

  test('returns 0.5 when only day matches', () => {
    expect(professorPreferenceScore(prof, 'Senin', '13:00-14:40')).toBe(0.5);
  });

  test('returns 0.5 when only timeSlot matches', () => {
    expect(professorPreferenceScore(prof, 'Selasa', '08:40-10:20')).toBe(0.5);
  });

  test('returns 0.0 when neither day nor timeSlot matches', () => {
    expect(professorPreferenceScore(prof, 'Kamis', '16:20-18:00')).toBe(0.0);
  });

  test('returns 0.5 (neutral) when professor has no preferences', () => {
    const noPrefs = makeProfessor({ preferences: { days: [], timeSlots: [] } });
    expect(professorPreferenceScore(noPrefs, 'Senin', '07:00-08:40')).toBe(0.5);
  });

  test('returns 0.9 when only days preference set and day matches', () => {
    const dayOnly = makeProfessor({ preferences: { days: ['Senin'], timeSlots: [] } });
    expect(professorPreferenceScore(dayOnly, 'Senin', '07:00-08:40')).toBe(0.9);
  });

  test('returns 0.9 when only timeSlot preference set and timeSlot matches', () => {
    const slotOnly = makeProfessor({ preferences: { days: [], timeSlots: ['08:40-10:20'] } });
    expect(professorPreferenceScore(slotOnly, 'Kamis', '08:40-10:20')).toBe(0.9);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// studentPreferenceScore
// ═════════════════════════════════════════════════════════════════════════════
describe('studentPreferenceScore', () => {
  beforeEach(() => clearStore());

  test('returns 0.5 for an empty student list', () => {
    expect(studentPreferenceScore([], 'Senin', '08:40-10:20')).toBe(0.5);
  });

  test('returns 1.0 when all students prefer the exact slot', () => {
    store.students.push(
      makeStudent('s1', ['Senin'], ['08:40-10:20']),
      makeStudent('s2', ['Senin'], ['08:40-10:20']),
    );
    expect(studentPreferenceScore(['s1', 's2'], 'Senin', '08:40-10:20')).toBe(1.0);
  });

  test('returns 0.0 when no student matches the slot', () => {
    store.students.push(
      makeStudent('s1', ['Selasa'], ['13:00-14:40']),
      makeStudent('s2', ['Kamis'], ['16:20-18:00']),
    );
    expect(studentPreferenceScore(['s1', 's2'], 'Senin', '08:40-10:20')).toBe(0.0);
  });

  test('returns average across mixed preferences', () => {
    store.students.push(
      makeStudent('s1', ['Senin'], ['08:40-10:20']),  // 1.0
      makeStudent('s2', ['Selasa'], ['13:00-14:40']),  // 0.0
    );
    const score = studentPreferenceScore(['s1', 's2'], 'Senin', '08:40-10:20');
    expect(score).toBeCloseTo(0.5, 5);
  });

  test('returns 0.5 for students with no preferences', () => {
    store.students.push(makeStudent('s1', [], []));
    expect(studentPreferenceScore(['s1'], 'Senin', '08:40-10:20')).toBe(0.5);
  });

  test('ignores unknown student ids', () => {
    store.students.push(makeStudent('s1', ['Senin'], ['08:40-10:20']));
    // s999 does not exist – should be filtered out
    const score = studentPreferenceScore(['s1', 's999'], 'Senin', '08:40-10:20');
    expect(score).toBe(1.0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// roomSuitabilityScore
// ═════════════════════════════════════════════════════════════════════════════
describe('roomSuitabilityScore', () => {
  test('returns -1 when room capacity is insufficient', () => {
    const room = makeRoom({ capacity: 10 });
    expect(roomSuitabilityScore(room, 15, 'Kuliah')).toBe(-1);
  });

  test('returns 1.0 (+ bonus) when ratio >= 0.7 and type matches', () => {
    const room = makeRoom({ capacity: 30, type: 'Kuliah' });
    // 24/30 = 0.8 -> capacityScore 1.0, typeBonus 0.1 -> capped at 1.0
    expect(roomSuitabilityScore(room, 24, 'Kuliah')).toBe(1.0);
  });

  test('returns 1.0 when ratio >= 0.7 and type does not match', () => {
    const room = makeRoom({ capacity: 30, type: 'Lab' });
    // 24/30 = 0.8 -> capacityScore 1.0, no bonus -> 1.0
    expect(roomSuitabilityScore(room, 24, 'Kuliah')).toBe(1.0);
  });

  test('returns 0.85 when ratio is between 0.5 and 0.7', () => {
    const room = makeRoom({ capacity: 30, type: 'Lab' });
    // 15/30 = 0.5 -> capacityScore 0.85
    expect(roomSuitabilityScore(room, 15, 'Kuliah')).toBe(0.85);
  });

  test('returns 0.65 when ratio is between 0.3 and 0.5', () => {
    const room = makeRoom({ capacity: 30, type: 'Lab' });
    // 9/30 = 0.3 -> capacityScore 0.65
    expect(roomSuitabilityScore(room, 9, 'Kuliah')).toBe(0.65);
  });

  test('returns 0.4 when ratio is below 0.3 (oversized room)', () => {
    const room = makeRoom({ capacity: 100, type: 'Lab' });
    // 5/100 = 0.05 -> capacityScore 0.4
    expect(roomSuitabilityScore(room, 5, 'Kuliah')).toBe(0.4);
  });

  test('perfect fit returns 1.0', () => {
    const room = makeRoom({ capacity: 20, type: 'Kuliah' });
    expect(roomSuitabilityScore(room, 20, 'Kuliah')).toBe(1.0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// isRoomAvailable / isProfessorAvailable
// ═════════════════════════════════════════════════════════════════════════════
describe('availability checks', () => {
  beforeEach(() => clearStore());

  test('room is available when no confirmed schedules exist', () => {
    expect(isRoomAvailable('room-1', 'Senin', '08:40-10:20')).toBe(true);
  });

  test('room is NOT available when already booked at that slot', () => {
    store.confirmedSchedules.push({
      id: 'sched-1', courseId: 'course-X', professorId: 'prof-X',
      roomId: 'room-1', day: 'Senin', timeSlot: '08:40-10:20',
    });
    expect(isRoomAvailable('room-1', 'Senin', '08:40-10:20')).toBe(false);
  });

  test('room is available when booking is for the same course (re-scheduling)', () => {
    store.confirmedSchedules.push({
      id: 'sched-1', courseId: 'course-1', professorId: 'prof-1',
      roomId: 'room-1', day: 'Senin', timeSlot: '08:40-10:20',
    });
    expect(isRoomAvailable('room-1', 'Senin', '08:40-10:20', 'course-1')).toBe(true);
  });

  test('professor is available when not teaching at that slot', () => {
    expect(isProfessorAvailable('prof-1', 'Senin', '08:40-10:20')).toBe(true);
  });

  test('professor is NOT available when already teaching another course', () => {
    store.confirmedSchedules.push({
      id: 'sched-1', courseId: 'course-X', professorId: 'prof-1',
      roomId: 'room-X', day: 'Senin', timeSlot: '08:40-10:20',
    });
    expect(isProfessorAvailable('prof-1', 'Senin', '08:40-10:20')).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// generateRecommendations (integration)
// ═════════════════════════════════════════════════════════════════════════════
describe('generateRecommendations', () => {
  beforeEach(() => {
    clearStore();
    store.professors.push(makeProfessor());
    store.rooms.push(makeRoom({ capacity: 30 }));
    store.students.push(
      makeStudent('s1', ['Senin'], ['08:40-10:20']),
      makeStudent('s2', ['Senin'], ['08:40-10:20']),
    );
    store.courses.push(makeCourse({ enrolledStudents: ['s1', 's2'] }));
  });

  test('throws when course does not exist', () => {
    expect(() => generateRecommendations('nonexistent')).toThrow('not found');
  });

  test('returns recommendations array with correct shape', () => {
    const result = generateRecommendations('course-1');
    expect(result.courseId).toBe('course-1');
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  test('recommendations are sorted by total score descending', () => {
    const { recommendations } = generateRecommendations('course-1');
    for (let i = 1; i < recommendations.length; i++) {
      expect(recommendations[i - 1].scores.total).toBeGreaterThanOrEqual(recommendations[i].scores.total);
    }
  });

  test('rank 1 recommendation gets rank property = 1', () => {
    const { recommendations } = generateRecommendations('course-1');
    expect(recommendations[0].rank).toBe(1);
  });

  test('top recommendation uses professor-preferred slot when available', () => {
    const { recommendations } = generateRecommendations('course-1');
    const top = recommendations[0];
    // Professor prefers Senin + 08:40-10:20, students also prefer those – should be best
    expect(top.day).toBe('Senin');
    expect(top.timeSlot).toBe('08:40-10:20');
  });

  test('total score equals weighted sum of component scores', () => {
    const { recommendations, weights } = generateRecommendations('course-1');
    recommendations.forEach(r => {
      const expected = weights.professor * r.scores.professor
                     + weights.student   * r.scores.student
                     + weights.room      * r.scores.room;
      expect(r.scores.total).toBeCloseTo(expected, 3);
    });
  });

  test('custom weights are applied correctly', () => {
    const result = generateRecommendations('course-1', {
      professorWeight: 0.6,
      studentWeight: 0.3,
      roomWeight: 0.1,
    });
    expect(result.weights.professor).toBe(0.6);
    expect(result.weights.student).toBe(0.3);
    expect(result.weights.room).toBe(0.1);
  });

  test('skips room/slot combinations already confirmed for another course', () => {
    store.confirmedSchedules.push({
      id: 'sched-x', courseId: 'course-X', professorId: 'prof-X',
      roomId: 'room-1', day: 'Senin', timeSlot: '08:40-10:20',
    });
    const { recommendations } = generateRecommendations('course-1');
    const conflicting = recommendations.find(r => r.day === 'Senin' && r.timeSlot === '08:40-10:20');
    expect(conflicting).toBeUndefined();
  });

  test('allows re-scheduling same course (excludes its own booking)', () => {
    store.confirmedSchedules.push({
      id: 'sched-1', courseId: 'course-1', professorId: 'prof-1',
      roomId: 'room-1', day: 'Senin', timeSlot: '08:40-10:20',
    });
    const { recommendations } = generateRecommendations('course-1');
    const slot = recommendations.find(r => r.day === 'Senin' && r.timeSlot === '08:40-10:20');
    expect(slot).toBeDefined();
  });

  test('excludes rooms with insufficient capacity', () => {
    store.rooms.push({ id: 'tiny-room', name: 'Tiny', capacity: 1, type: 'Kuliah' });
    const { recommendations } = generateRecommendations('course-1');
    const tinyRoomUsed = recommendations.some(r => r.room.id === 'tiny-room');
    expect(tinyRoomUsed).toBe(false);
  });
});
