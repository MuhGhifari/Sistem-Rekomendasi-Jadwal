'use strict';

const { store, TIME_SLOTS, DAYS } = require('../data/store');

/**
 * Calculate professor preference score for a given day and time slot.
 * Returns a value between 0 and 1.
 *
 * @param {Object} professor
 * @param {string} day
 * @param {string} timeSlot
 * @returns {number}
 */
function professorPreferenceScore(professor, day, timeSlot) {
  if (!professor.preferences || (!professor.preferences.days.length && !professor.preferences.timeSlots.length)) {
    return 0.5; // neutral when no preference set
  }

  const dayMatch = professor.preferences.days.includes(day);
  const timeMatch = professor.preferences.timeSlots.includes(timeSlot);

  if (dayMatch && timeMatch) return 1.0;
  if (dayMatch && !professor.preferences.timeSlots.length) return 0.9;
  if (!professor.preferences.days.length && timeMatch) return 0.9;
  if (dayMatch || timeMatch) return 0.5;
  return 0.0;
}

/**
 * Calculate average student preference score for a given day and time slot.
 * Returns a value between 0 and 1.
 *
 * @param {string[]} enrolledStudentIds
 * @param {string} day
 * @param {string} timeSlot
 * @returns {number}
 */
function studentPreferenceScore(enrolledStudentIds, day, timeSlot) {
  if (!enrolledStudentIds || enrolledStudentIds.length === 0) return 0.5;

  const students = enrolledStudentIds
    .map(id => store.students.find(s => s.id === id))
    .filter(Boolean);

  if (students.length === 0) return 0.5;

  const totalScore = students.reduce((sum, student) => {
    if (!student.preferences || (!student.preferences.days.length && !student.preferences.timeSlots.length)) {
      return sum + 0.5; // neutral
    }

    const dayMatch = student.preferences.days.includes(day);
    const timeMatch = student.preferences.timeSlots.includes(timeSlot);

    if (dayMatch && timeMatch) return sum + 1.0;
    if (dayMatch && !student.preferences.timeSlots.length) return sum + 0.9;
    if (!student.preferences.days.length && timeMatch) return sum + 0.9;
    if (dayMatch || timeMatch) return sum + 0.5;
    return sum + 0.0;
  }, 0);

  return totalScore / students.length;
}

/**
 * Calculate room suitability score based on capacity vs. enrolled students.
 * Returns a value between 0 and 1 (or -1 if room is too small).
 *
 * @param {Object} room
 * @param {number} studentCount
 * @param {string} courseType
 * @returns {number}
 */
function roomSuitabilityScore(room, studentCount, courseType) {
  // Room must be able to accommodate all students
  if (room.capacity < studentCount) return -1; // invalid

  // Course type matching bonus
  const typeBonus = room.type === courseType ? 0.1 : 0;

  // Ratio of students to room capacity (ideal = 0.7 – 1.0)
  const ratio = studentCount / room.capacity;

  let capacityScore;
  if (ratio >= 0.7) {
    capacityScore = 1.0;
  } else if (ratio >= 0.5) {
    capacityScore = 0.85;
  } else if (ratio >= 0.3) {
    capacityScore = 0.65;
  } else {
    capacityScore = 0.4; // room is greatly oversized
  }

  return Math.min(1.0, capacityScore + typeBonus);
}

/**
 * Check whether a room is already booked at the given day+timeSlot
 * (excluding the current course being scheduled).
 *
 * @param {string} roomId
 * @param {string} day
 * @param {string} timeSlot
 * @param {string|null} excludeCourseId
 * @returns {boolean}
 */
function isRoomAvailable(roomId, day, timeSlot, excludeCourseId = null) {
  return !store.confirmedSchedules.some(
    s => s.roomId === roomId &&
         s.day === day &&
         s.timeSlot === timeSlot &&
         s.courseId !== excludeCourseId,
  );
}

/**
 * Check whether a professor is already teaching at the given day+timeSlot
 * (excluding the current course being scheduled).
 *
 * @param {string} professorId
 * @param {string} day
 * @param {string} timeSlot
 * @param {string|null} excludeCourseId
 * @returns {boolean}
 */
function isProfessorAvailable(professorId, day, timeSlot, excludeCourseId = null) {
  return !store.confirmedSchedules.some(
    s => s.professorId === professorId &&
         s.day === day &&
         s.timeSlot === timeSlot &&
         s.courseId !== excludeCourseId,
  );
}

/**
 * Generate ranked schedule recommendations for a given course.
 *
 * Scoring weights:
 *   Professor preference  – 40 %
 *   Student preference    – 35 %
 *   Room suitability      – 25 %
 *
 * @param {string} courseId
 * @param {{ professorWeight?: number, studentWeight?: number, roomWeight?: number }} [weights]
 * @returns {{ courseId: string, recommendations: Object[] }}
 */
function generateRecommendations(courseId, weights = {}) {
  const course = store.courses.find(c => c.id === courseId);
  if (!course) throw new Error(`Course with id "${courseId}" not found`);

  const professor = store.professors.find(p => p.id === course.professorId);
  if (!professor) throw new Error(`Professor for course "${course.name}" not found`);

  const professorWeight = weights.professorWeight ?? 0.40;
  const studentWeight   = weights.studentWeight   ?? 0.35;
  const roomWeight      = weights.roomWeight       ?? 0.25;

  const recommendations = [];

  for (const day of DAYS) {
    for (const timeSlot of TIME_SLOTS) {
      // Professor must be free at this slot
      if (!isProfessorAvailable(professor.id, day, timeSlot, courseId)) continue;

      for (const room of store.rooms) {
        // Room must be free at this slot
        if (!isRoomAvailable(room.id, day, timeSlot, courseId)) continue;

        const roomScore = roomSuitabilityScore(room, course.enrolledStudents.length, course.type);
        // Room too small – skip
        if (roomScore < 0) continue;

        const profScore = professorPreferenceScore(professor, day, timeSlot);
        const stuScore  = studentPreferenceScore(course.enrolledStudents, day, timeSlot);

        const totalScore =
          professorWeight * profScore +
          studentWeight   * stuScore  +
          roomWeight      * roomScore;

        recommendations.push({
          day,
          timeSlot,
          room: { id: room.id, name: room.name, capacity: room.capacity, type: room.type },
          scores: {
            professor: +profScore.toFixed(4),
            student:   +stuScore.toFixed(4),
            room:      +roomScore.toFixed(4),
            total:     +totalScore.toFixed(4),
          },
        });
      }
    }
  }

  // Sort by total score descending
  recommendations.sort((a, b) => b.scores.total - a.scores.total);

  // Add rank
  recommendations.forEach((r, i) => { r.rank = i + 1; });

  return {
    courseId,
    courseName: course.name,
    courseCode: course.code,
    professorName: professor.name,
    enrolledCount: course.enrolledStudents.length,
    weights: { professor: professorWeight, student: studentWeight, room: roomWeight },
    recommendations,
  };
}

module.exports = {
  generateRecommendations,
  professorPreferenceScore,
  studentPreferenceScore,
  roomSuitabilityScore,
  isRoomAvailable,
  isProfessorAvailable,
};
