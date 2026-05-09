'use strict';

const { v4: uuidv4 } = require('uuid');

// ─── Time slots available for scheduling ─────────────────────────────────────
const TIME_SLOTS = [
  '07:00-08:40',
  '08:40-10:20',
  '10:20-12:00',
  '13:00-14:40',
  '14:40-16:20',
  '16:20-18:00',
];

// ─── Days of the week ─────────────────────────────────────────────────────────
const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

// ─── In-memory data store ─────────────────────────────────────────────────────
const store = {
  professors: [],
  students: [],
  rooms: [],
  courses: [],
  confirmedSchedules: [],
};

// ─── Seed data ────────────────────────────────────────────────────────────────
function seedData() {
  // Professors
  const prof1 = { id: uuidv4(), name: 'Dr. Ahmad Fauzi', nidn: '0012345678', preferences: { days: ['Senin', 'Rabu', 'Jumat'], timeSlots: ['08:40-10:20', '10:20-12:00'] } };
  const prof2 = { id: uuidv4(), name: 'Prof. Siti Rahmi', nidn: '0023456789', preferences: { days: ['Selasa', 'Kamis'], timeSlots: ['07:00-08:40', '08:40-10:20'] } };
  const prof3 = { id: uuidv4(), name: 'Dr. Budi Santoso', nidn: '0034567890', preferences: { days: ['Senin', 'Selasa', 'Rabu'], timeSlots: ['13:00-14:40', '14:40-16:20'] } };
  store.professors.push(prof1, prof2, prof3);

  // Rooms
  const room1 = { id: uuidv4(), name: 'Ruang A101', capacity: 40, type: 'Kuliah' };
  const room2 = { id: uuidv4(), name: 'Ruang B202', capacity: 30, type: 'Kuliah' };
  const room3 = { id: uuidv4(), name: 'Lab Komputer 1', capacity: 25, type: 'Lab' };
  const room4 = { id: uuidv4(), name: 'Ruang C303', capacity: 60, type: 'Kuliah' };
  const room5 = { id: uuidv4(), name: 'Ruang Seminar', capacity: 80, type: 'Seminar' };
  store.rooms.push(room1, room2, room3, room4, room5);

  // Students
  const students = [
    { id: uuidv4(), name: 'Andi Pratama', nim: '2021001', preferences: { days: ['Senin', 'Rabu'], timeSlots: ['08:40-10:20', '10:20-12:00'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Budi Setiawan', nim: '2021002', preferences: { days: ['Senin', 'Selasa'], timeSlots: ['07:00-08:40', '08:40-10:20'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Citra Dewi', nim: '2021003', preferences: { days: ['Rabu', 'Jumat'], timeSlots: ['10:20-12:00', '13:00-14:40'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Dian Permata', nim: '2021004', preferences: { days: ['Selasa', 'Kamis'], timeSlots: ['08:40-10:20', '13:00-14:40'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Eka Saputra', nim: '2021005', preferences: { days: ['Senin', 'Rabu', 'Jumat'], timeSlots: ['07:00-08:40'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Farah Aulia', nim: '2021006', preferences: { days: ['Selasa', 'Kamis'], timeSlots: ['14:40-16:20', '16:20-18:00'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Gilang Ramadhan', nim: '2021007', preferences: { days: ['Senin', 'Selasa', 'Rabu'], timeSlots: ['08:40-10:20'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Hana Lestari', nim: '2021008', preferences: { days: ['Rabu', 'Kamis'], timeSlots: ['10:20-12:00', '13:00-14:40'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Indra Wijaya', nim: '2021009', preferences: { days: ['Senin', 'Jumat'], timeSlots: ['13:00-14:40', '14:40-16:20'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Joko Susilo', nim: '2021010', preferences: { days: ['Selasa', 'Rabu', 'Kamis'], timeSlots: ['07:00-08:40', '08:40-10:20'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Kiki Amelia', nim: '2021011', preferences: { days: ['Senin', 'Rabu'], timeSlots: ['10:20-12:00'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Lina Marlina', nim: '2021012', preferences: { days: ['Selasa', 'Kamis', 'Jumat'], timeSlots: ['08:40-10:20', '13:00-14:40'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Miko Prasetyo', nim: '2021013', preferences: { days: ['Rabu', 'Jumat'], timeSlots: ['14:40-16:20', '16:20-18:00'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Nisa Fitriani', nim: '2021014', preferences: { days: ['Senin', 'Selasa'], timeSlots: ['10:20-12:00', '13:00-14:40'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Omar Hakim', nim: '2021015', preferences: { days: ['Kamis', 'Jumat'], timeSlots: ['07:00-08:40', '08:40-10:20'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Putri Cahyani', nim: '2021016', preferences: { days: ['Senin', 'Rabu', 'Jumat'], timeSlots: ['13:00-14:40'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Rizki Nugroho', nim: '2021017', preferences: { days: ['Selasa', 'Kamis'], timeSlots: ['10:20-12:00', '14:40-16:20'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Sari Indah', nim: '2021018', preferences: { days: ['Senin', 'Rabu'], timeSlots: ['08:40-10:20', '10:20-12:00'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Taufik Hidayat', nim: '2021019', preferences: { days: ['Selasa', 'Jumat'], timeSlots: ['07:00-08:40', '13:00-14:40'] }, enrolledCourses: [] },
    { id: uuidv4(), name: 'Umi Kalsum', nim: '2021020', preferences: { days: ['Rabu', 'Kamis', 'Jumat'], timeSlots: ['08:40-10:20', '10:20-12:00'] }, enrolledCourses: [] },
  ];
  store.students.push(...students);

  // Courses
  const course1 = {
    id: uuidv4(),
    name: 'Pemrograman Web',
    code: 'TI301',
    credits: 3,
    type: 'Kuliah',
    professorId: prof1.id,
    enrolledStudents: students.slice(0, 8).map(s => s.id),
  };
  const course2 = {
    id: uuidv4(),
    name: 'Basis Data',
    code: 'TI302',
    credits: 3,
    type: 'Kuliah',
    professorId: prof2.id,
    enrolledStudents: students.slice(5, 15).map(s => s.id),
  };
  const course3 = {
    id: uuidv4(),
    name: 'Praktikum Pemrograman',
    code: 'TI303',
    credits: 1,
    type: 'Lab',
    professorId: prof3.id,
    enrolledStudents: students.slice(10, 20).map(s => s.id),
  };
  store.courses.push(course1, course2, course3);

  // Update student enrolled courses
  store.students.slice(0, 8).forEach(s => s.enrolledCourses.push(course1.id));
  store.students.slice(5, 15).forEach(s => s.enrolledCourses.push(course2.id));
  store.students.slice(10, 20).forEach(s => s.enrolledCourses.push(course3.id));
}

seedData();

module.exports = { store, TIME_SLOTS, DAYS };
