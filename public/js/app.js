'use strict';

// ─── API helpers ──────────────────────────────────────────────────────────────
const api = {
  async get(url) {
    const res = await fetch(url);
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Request failed'); }
    return res.json();
  },
  async post(url, body) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Request failed'); }
    return res.json();
  },
  async put(url, body) {
    const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Request failed'); }
    return res.json();
  },
  async del(url) {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Request failed'); }
    return res.json();
  },
};

// ─── Utility ──────────────────────────────────────────────────────────────────
const DAYS       = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const TIME_SLOTS = ['07:00-08:40', '08:40-10:20', '10:20-12:00', '13:00-14:40', '14:40-16:20', '16:20-18:00'];

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scoreColor(score) {
  if (score >= 0.8) return '#16a34a';
  if (score >= 0.6) return '#d97706';
  return '#dc2626';
}

function scoreBar(label, value, cls) {
  return `
    <div class="score-bar-wrap">
      <div class="score-bar-label"><span>${escHtml(label)}</span><span>${(value * 100).toFixed(1)}%</span></div>
      <div class="score-bar-bg">
        <div class="score-bar-fill ${cls}" style="width:${(value * 100).toFixed(1)}%"></div>
      </div>
    </div>`;
}

function alert$(type, msg) {
  return `<div class="alert alert-${type}"><span>${type === 'success' ? '✅' : type === 'danger' ? '❌' : 'ℹ️'}</span>${escHtml(msg)}</div>`;
}

function chipGroup(id, options, selected = []) {
  return `<div class="checkbox-group" id="${id}">
    ${options.map(opt => `
      <label class="checkbox-chip ${selected.includes(opt) ? 'selected' : ''}" data-val="${escHtml(opt)}">
        <input type="checkbox" hidden ${selected.includes(opt) ? 'checked' : ''} value="${escHtml(opt)}">${escHtml(opt)}
      </label>`).join('')}
  </div>`;
}

function bindChipGroup(containerId) {
  document.querySelectorAll(`#${containerId} .checkbox-chip`).forEach(chip => {
    chip.addEventListener('click', () => {
      const inp = chip.querySelector('input');
      inp.checked = !inp.checked;
      chip.classList.toggle('selected', inp.checked);
    });
  });
}

function getChipValues(containerId) {
  return [...document.querySelectorAll(`#${containerId} .checkbox-chip input:checked`)].map(i => i.value);
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle   = document.getElementById('modal-title');
const modalBody    = document.getElementById('modal-body');
const modalFooter  = document.getElementById('modal-footer');
const modalClose   = document.getElementById('modal-close');
const modalCancel  = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');

function openModal({ title, body, footer, onConfirm, confirmLabel = 'Simpan', hideFooter = false }) {
  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  modalConfirm.textContent = confirmLabel;
  modalFooter.style.display = hideFooter ? 'none' : '';
  if (onConfirm) {
    modalConfirm.onclick = onConfirm;
  }
  modalOverlay.classList.add('open');
}

function closeModal() { modalOverlay.classList.remove('open'); }
modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

// ─── Navigation ───────────────────────────────────────────────────────────────
const content   = document.getElementById('content');
const pageTitle = document.getElementById('page-title');

async function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const titles = {
    dashboard: 'Dashboard',
    professors: 'Dosen',
    students: 'Mahasiswa',
    rooms: 'Ruangan',
    courses: 'Mata Kuliah',
    recommend: 'Rekomendasi Jadwal',
    schedule: 'Jadwal Final',
  };
  pageTitle.textContent = titles[page] || page;
  content.innerHTML = '<div class="text-center mt-6 text-muted">Memuat…</div>';

  try {
    switch (page) {
      case 'dashboard':  await renderDashboard(); break;
      case 'professors': await renderProfessors(); break;
      case 'students':   await renderStudents();   break;
      case 'rooms':      await renderRooms();      break;
      case 'courses':    await renderCourses();    break;
      case 'recommend':  await renderRecommend();  break;
      case 'schedule':   await renderSchedule();   break;
    }
  } catch (err) {
    content.innerHTML = alert$('danger', err.message);
  }
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
async function renderDashboard() {
  const [professors, students, rooms, courses, schedules] = await Promise.all([
    api.get('/api/professors'),
    api.get('/api/students'),
    api.get('/api/rooms'),
    api.get('/api/courses'),
    api.get('/api/schedule'),
  ]);

  const scheduledCount = schedules.length;
  const unscheduledCount = courses.length - scheduledCount;

  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">👨‍🏫</div>
        <div><div class="stat-value">${professors.length}</div><div class="stat-label">Dosen</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">🎓</div>
        <div><div class="stat-value">${students.length}</div><div class="stat-label">Mahasiswa</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">🏛️</div>
        <div><div class="stat-value">${rooms.length}</div><div class="stat-label">Ruangan</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">📚</div>
        <div><div class="stat-value">${courses.length}</div><div class="stat-label">Mata Kuliah</div></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

      <!-- Scheduling progress -->
      <div class="card">
        <div class="card-header"><h3>📊 Status Penjadwalan</h3></div>
        <div class="card-body">
          ${courses.length === 0 ? '<p class="text-muted">Belum ada mata kuliah.</p>' : `
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
            ${scheduledCount} dari ${courses.length} mata kuliah telah dijadwalkan
          </p>
          <div class="score-bar-bg" style="height:12px;margin-bottom:16px">
            <div class="score-bar-fill total" style="width:${courses.length ? (scheduledCount/courses.length*100).toFixed(1) : 0}%"></div>
          </div>
          ${courses.map(c => {
            const sched = schedules.find(s => s.courseId === c.id);
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
              <span><strong>${escHtml(c.code)}</strong> ${escHtml(c.name)}</span>
              ${sched
                ? `<span class="badge badge-green">✓ ${escHtml(sched.day)} ${escHtml(sched.timeSlot)}</span>`
                : `<span class="badge badge-orange">Belum dijadwalkan</span>`}
            </div>`;
          }).join('')}
          `}
        </div>
      </div>

      <!-- Recent schedules -->
      <div class="card">
        <div class="card-header"><h3>🕐 Jadwal Terkonfirmasi</h3></div>
        <div class="card-body">
          ${schedules.length === 0
            ? '<div class="empty-state"><div class="icon">📭</div><p>Belum ada jadwal yang dikonfirmasi.</p></div>'
            : schedules.map(s => `
              <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                <div style="font-weight:700;font-size:14px">${escHtml(s.courseCode)} – ${escHtml(s.courseName)}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:3px">
                  📅 ${escHtml(s.day)} ${escHtml(s.timeSlot)} &nbsp;|&nbsp;
                  🏛️ ${escHtml(s.roomName)} &nbsp;|&nbsp;
                  👥 ${s.enrolledCount} mahasiswa
                </div>
              </div>`).join('')}
        </div>
      </div>

    </div>

    <div class="card mt-6">
      <div class="card-header"><h3>ℹ️ Tentang Sistem</h3></div>
      <div class="card-body" style="font-size:14px;line-height:1.7">
        <p>Sistem Rekomendasi Jadwal ini adalah <strong>Decision Support System (DSS)</strong> berbasis web yang membantu
        menentukan waktu dan ruangan terbaik untuk jadwal mata kuliah berdasarkan tiga faktor utama:</p>
        <ul style="margin:10px 0 0 20px">
          <li><strong>Preferensi Dosen (40%)</strong> – hari dan sesi yang disukai dosen pengampu</li>
          <li><strong>Preferensi Mahasiswa (35%)</strong> – rata-rata kesesuaian sesi dengan preferensi mahasiswa terdaftar</li>
          <li><strong>Ketersediaan Ruangan (25%)</strong> – kapasitas ruangan vs jumlah mahasiswa &amp; tipe kelas</li>
        </ul>
        <p style="margin-top:10px">Setiap kombinasi (hari, sesi, ruangan) yang valid dihitung skornya dan diurutkan dari yang terbaik.</p>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSORS
// ─────────────────────────────────────────────────────────────────────────────
async function renderProfessors() {
  const professors = await api.get('/api/professors');

  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>👨‍🏫 Daftar Dosen</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-professor">+ Tambah Dosen</button>
      </div>
      <div class="card-body" style="padding:0">
        ${professors.length === 0
          ? '<div class="empty-state"><div class="icon">👨‍🏫</div><p>Belum ada data dosen.</p></div>'
          : `<div class="table-wrap"><table>
            <thead><tr>
              <th>Nama Dosen</th><th>NIDN</th><th>Preferensi Hari</th><th>Preferensi Sesi</th><th>Aksi</th>
            </tr></thead>
            <tbody>
              ${professors.map(p => `
                <tr>
                  <td><strong>${escHtml(p.name)}</strong></td>
                  <td><span class="badge badge-gray">${escHtml(p.nidn)}</span></td>
                  <td>${(p.preferences?.days || []).map(d => `<span class="badge badge-blue" style="margin:1px">${escHtml(d)}</span>`).join('') || '<span class="text-muted">–</span>'}</td>
                  <td>${(p.preferences?.timeSlots || []).map(t => `<span class="badge badge-purple" style="margin:1px">${escHtml(t)}</span>`).join('') || '<span class="text-muted">–</span>'}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary" onclick="editProfessor('${p.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProfessor('${p.id}')">🗑️</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table></div>`}
      </div>
    </div>`;

  document.getElementById('btn-add-professor').addEventListener('click', () => showProfessorForm());
}

function professorForm(prof = null) {
  const days = prof?.preferences?.days || [];
  const slots = prof?.preferences?.timeSlots || [];
  return `
    <div class="form-row">
      <div class="form-group">
        <label>Nama Dosen *</label>
        <input class="form-control" id="f-name" value="${escHtml(prof?.name || '')}" placeholder="Dr. Ahmad Fauzi" />
      </div>
      <div class="form-group">
        <label>NIDN *</label>
        <input class="form-control" id="f-nidn" value="${escHtml(prof?.nidn || '')}" placeholder="0012345678" />
      </div>
    </div>
    <div class="form-group">
      <label>Preferensi Hari</label>
      ${chipGroup('f-days', DAYS, days)}
      <div class="form-hint">Pilih hari yang disukai dosen (kosongkan = tidak ada preferensi)</div>
    </div>
    <div class="form-group">
      <label>Preferensi Sesi</label>
      ${chipGroup('f-slots', TIME_SLOTS, slots)}
      <div class="form-hint">Pilih sesi yang disukai dosen</div>
    </div>`;
}

function showProfessorForm(prof = null) {
  openModal({
    title: prof ? 'Edit Dosen' : 'Tambah Dosen',
    body: professorForm(prof),
    onConfirm: async () => {
      const name = document.getElementById('f-name').value.trim();
      const nidn = document.getElementById('f-nidn').value.trim();
      if (!name || !nidn) { showToast('Nama dan NIDN wajib diisi', 'danger'); return; }
      const payload = {
        name, nidn,
        preferences: {
          days: getChipValues('f-days'),
          timeSlots: getChipValues('f-slots'),
        },
      };
      try {
        if (prof) await api.put(`/api/professors/${prof.id}`, payload);
        else await api.post('/api/professors', payload);
        closeModal();
        showToast(prof ? 'Dosen diperbarui' : 'Dosen ditambahkan', 'success');
        renderProfessors();
      } catch (err) { showToast(err.message, 'danger'); }
    },
  });
  bindChipGroup('f-days');
  bindChipGroup('f-slots');
}

async function editProfessor(id) {
  const prof = await api.get(`/api/professors/${id}`);
  showProfessorForm(prof);
}

async function deleteProfessor(id) {
  if (!confirm('Hapus dosen ini?')) return;
  try {
    await api.del(`/api/professors/${id}`);
    showToast('Dosen dihapus', 'success');
    renderProfessors();
  } catch (err) { showToast(err.message, 'danger'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────────────────────────────────────
async function renderStudents() {
  const [students, courses] = await Promise.all([api.get('/api/students'), api.get('/api/courses')]);

  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>🎓 Daftar Mahasiswa</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-student">+ Tambah Mahasiswa</button>
      </div>
      <div class="card-body" style="padding:0">
        ${students.length === 0
          ? '<div class="empty-state"><div class="icon">🎓</div><p>Belum ada data mahasiswa.</p></div>'
          : `<div class="table-wrap"><table>
            <thead><tr>
              <th>NIM</th><th>Nama</th><th>Preferensi Hari</th><th>Preferensi Sesi</th><th>Mata Kuliah</th><th>Aksi</th>
            </tr></thead>
            <tbody>
              ${students.map(s => {
                const enrolled = (s.enrolledCourses || []).map(cid => courses.find(c => c.id === cid)).filter(Boolean);
                return `<tr>
                  <td><span class="badge badge-gray">${escHtml(s.nim)}</span></td>
                  <td><strong>${escHtml(s.name)}</strong></td>
                  <td>${(s.preferences?.days || []).map(d => `<span class="badge badge-blue" style="margin:1px">${escHtml(d)}</span>`).join('') || '–'}</td>
                  <td>${(s.preferences?.timeSlots || []).map(t => `<span class="badge badge-purple" style="margin:1px">${escHtml(t)}</span>`).join('') || '–'}</td>
                  <td>${enrolled.map(c => `<span class="badge badge-green" style="margin:1px">${escHtml(c.code)}</span>`).join('') || '–'}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary" onclick="editStudent('${s.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteStudent('${s.id}')">🗑️</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>`}
      </div>
    </div>`;

  document.getElementById('btn-add-student').addEventListener('click', () => showStudentForm());
}

function studentForm(student = null) {
  const days = student?.preferences?.days || [];
  const slots = student?.preferences?.timeSlots || [];
  return `
    <div class="form-row">
      <div class="form-group">
        <label>Nama Mahasiswa *</label>
        <input class="form-control" id="f-name" value="${escHtml(student?.name || '')}" placeholder="Andi Pratama" />
      </div>
      <div class="form-group">
        <label>NIM *</label>
        <input class="form-control" id="f-nim" value="${escHtml(student?.nim || '')}" placeholder="2021001" />
      </div>
    </div>
    <div class="form-group">
      <label>Preferensi Hari</label>
      ${chipGroup('f-days', DAYS, days)}
    </div>
    <div class="form-group">
      <label>Preferensi Sesi</label>
      ${chipGroup('f-slots', TIME_SLOTS, slots)}
    </div>`;
}

function showStudentForm(student = null) {
  openModal({
    title: student ? 'Edit Mahasiswa' : 'Tambah Mahasiswa',
    body: studentForm(student),
    onConfirm: async () => {
      const name = document.getElementById('f-name').value.trim();
      const nim  = document.getElementById('f-nim').value.trim();
      if (!name || !nim) { showToast('Nama dan NIM wajib diisi', 'danger'); return; }
      const payload = {
        name, nim,
        preferences: { days: getChipValues('f-days'), timeSlots: getChipValues('f-slots') },
      };
      try {
        if (student) await api.put(`/api/students/${student.id}`, payload);
        else await api.post('/api/students', payload);
        closeModal();
        showToast(student ? 'Mahasiswa diperbarui' : 'Mahasiswa ditambahkan', 'success');
        renderStudents();
      } catch (err) { showToast(err.message, 'danger'); }
    },
  });
  bindChipGroup('f-days');
  bindChipGroup('f-slots');
}

async function editStudent(id) {
  const student = await api.get(`/api/students/${id}`);
  showStudentForm(student);
}

async function deleteStudent(id) {
  if (!confirm('Hapus mahasiswa ini?')) return;
  try {
    await api.del(`/api/students/${id}`);
    showToast('Mahasiswa dihapus', 'success');
    renderStudents();
  } catch (err) { showToast(err.message, 'danger'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOMS
// ─────────────────────────────────────────────────────────────────────────────
async function renderRooms() {
  const rooms = await api.get('/api/rooms');

  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>🏛️ Daftar Ruangan</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-room">+ Tambah Ruangan</button>
      </div>
      <div class="card-body" style="padding:0">
        ${rooms.length === 0
          ? '<div class="empty-state"><div class="icon">🏛️</div><p>Belum ada data ruangan.</p></div>'
          : `<div class="table-wrap"><table>
            <thead><tr>
              <th>Nama Ruangan</th><th>Kapasitas</th><th>Tipe</th><th>Jadwal Terpakai</th><th>Aksi</th>
            </tr></thead>
            <tbody>
              ${rooms.map(r => `<tr>
                <td><strong>${escHtml(r.name)}</strong></td>
                <td>${r.capacity} orang</td>
                <td><span class="badge badge-${r.type === 'Lab' ? 'orange' : r.type === 'Seminar' ? 'purple' : 'blue'}">${escHtml(r.type)}</span></td>
                <td>${(r.scheduledSlots || []).length === 0
                  ? '<span class="text-muted">Kosong</span>'
                  : r.scheduledSlots.map(sl => `<div style="font-size:12px">${escHtml(sl.day)} ${escHtml(sl.timeSlot)}</div>`).join('')}
                </td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="editRoom('${r.id}')">✏️ Edit</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteRoom('${r.id}')">🗑️</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}
      </div>
    </div>`;

  document.getElementById('btn-add-room').addEventListener('click', () => showRoomForm());
}

function roomForm(room = null) {
  return `
    <div class="form-row">
      <div class="form-group">
        <label>Nama Ruangan *</label>
        <input class="form-control" id="f-name" value="${escHtml(room?.name || '')}" placeholder="Ruang A101" />
      </div>
      <div class="form-group">
        <label>Kapasitas *</label>
        <input class="form-control" id="f-capacity" type="number" min="1" value="${room?.capacity || ''}" placeholder="40" />
      </div>
    </div>
    <div class="form-group">
      <label>Tipe Ruangan</label>
      <select class="form-control" id="f-type">
        ${['Kuliah', 'Lab', 'Seminar'].map(t => `<option ${room?.type === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>`;
}

function showRoomForm(room = null) {
  openModal({
    title: room ? 'Edit Ruangan' : 'Tambah Ruangan',
    body: roomForm(room),
    onConfirm: async () => {
      const name     = document.getElementById('f-name').value.trim();
      const capacity = parseInt(document.getElementById('f-capacity').value, 10);
      const type     = document.getElementById('f-type').value;
      if (!name || !capacity) { showToast('Nama dan kapasitas wajib diisi', 'danger'); return; }
      try {
        if (room) await api.put(`/api/rooms/${room.id}`, { name, capacity, type });
        else await api.post('/api/rooms', { name, capacity, type });
        closeModal();
        showToast(room ? 'Ruangan diperbarui' : 'Ruangan ditambahkan', 'success');
        renderRooms();
      } catch (err) { showToast(err.message, 'danger'); }
    },
  });
}

async function editRoom(id) {
  const room = await api.get(`/api/rooms/${id}`);
  showRoomForm(room);
}

async function deleteRoom(id) {
  if (!confirm('Hapus ruangan ini?')) return;
  try {
    await api.del(`/api/rooms/${id}`);
    showToast('Ruangan dihapus', 'success');
    renderRooms();
  } catch (err) { showToast(err.message, 'danger'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────────────────────────────────────
async function renderCourses() {
  const courses = await api.get('/api/courses');

  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>📚 Daftar Mata Kuliah</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-course">+ Tambah Mata Kuliah</button>
      </div>
      <div class="card-body" style="padding:0">
        ${courses.length === 0
          ? '<div class="empty-state"><div class="icon">📚</div><p>Belum ada data mata kuliah.</p></div>'
          : `<div class="table-wrap"><table>
            <thead><tr>
              <th>Kode</th><th>Nama</th><th>SKS</th><th>Tipe</th><th>Dosen</th><th>Peserta</th><th>Status</th><th>Aksi</th>
            </tr></thead>
            <tbody>
              ${courses.map(c => `<tr>
                <td><span class="badge badge-gray">${escHtml(c.code)}</span></td>
                <td><strong>${escHtml(c.name)}</strong></td>
                <td>${c.credits}</td>
                <td><span class="badge badge-${c.type === 'Lab' ? 'orange' : 'blue'}">${escHtml(c.type)}</span></td>
                <td>${escHtml(c.professorName)}</td>
                <td>${c.enrolledCount} mhs</td>
                <td>${c.scheduledAt
                  ? `<span class="badge badge-green">✓ ${escHtml(c.scheduledAt.day)} ${escHtml(c.scheduledAt.timeSlot)}</span>`
                  : '<span class="badge badge-orange">Belum dijadwalkan</span>'}</td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="editCourse('${c.id}')">✏️ Edit</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteCourse('${c.id}')">🗑️</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}
      </div>
    </div>`;

  document.getElementById('btn-add-course').addEventListener('click', () => showCourseForm());
}

async function showCourseForm(course = null) {
  const [professors, students] = await Promise.all([api.get('/api/professors'), api.get('/api/students')]);
  const enrolledIds = course?.enrolledStudents || [];

  const body = `
    <div class="form-row">
      <div class="form-group">
        <label>Nama Mata Kuliah *</label>
        <input class="form-control" id="f-name" value="${escHtml(course?.name || '')}" placeholder="Pemrograman Web" />
      </div>
      <div class="form-group">
        <label>Kode *</label>
        <input class="form-control" id="f-code" value="${escHtml(course?.code || '')}" placeholder="TI301" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>SKS</label>
        <input class="form-control" id="f-credits" type="number" min="1" max="6" value="${course?.credits || 3}" />
      </div>
      <div class="form-group">
        <label>Tipe</label>
        <select class="form-control" id="f-type">
          ${['Kuliah', 'Lab', 'Seminar'].map(t => `<option ${course?.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Dosen Pengampu *</label>
      <select class="form-control" id="f-professor">
        <option value="">-- Pilih Dosen --</option>
        ${professors.map(p => `<option value="${p.id}" ${course?.professorId === p.id ? 'selected' : ''}>${escHtml(p.name)} (${escHtml(p.nidn)})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Mahasiswa Terdaftar (${enrolledIds.length} terpilih)</label>
      <div style="max-height:160px;overflow-y:auto;border:1.5px solid var(--border);border-radius:6px;padding:8px">
        ${students.map(s => `
          <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;font-size:13px">
            <input type="checkbox" class="student-check" value="${s.id}" ${enrolledIds.includes(s.id) ? 'checked' : ''} />
            ${escHtml(s.nim)} – ${escHtml(s.name)}
          </label>`).join('')}
      </div>
    </div>`;

  openModal({
    title: course ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah',
    body,
    onConfirm: async () => {
      const name       = document.getElementById('f-name').value.trim();
      const code       = document.getElementById('f-code').value.trim();
      const credits    = parseInt(document.getElementById('f-credits').value, 10);
      const type       = document.getElementById('f-type').value;
      const professorId = document.getElementById('f-professor').value;
      const enrolledStudents = [...document.querySelectorAll('.student-check:checked')].map(i => i.value);

      if (!name || !code || !professorId) { showToast('Nama, kode, dan dosen wajib diisi', 'danger'); return; }
      try {
        if (course) await api.put(`/api/courses/${course.id}`, { name, code, credits, type, professorId, enrolledStudents });
        else await api.post('/api/courses', { name, code, credits, type, professorId, enrolledStudents });
        closeModal();
        showToast(course ? 'Mata kuliah diperbarui' : 'Mata kuliah ditambahkan', 'success');
        renderCourses();
      } catch (err) { showToast(err.message, 'danger'); }
    },
  });
}

async function editCourse(id) {
  const course = await api.get(`/api/courses/${id}`);
  showCourseForm(course);
}

async function deleteCourse(id) {
  if (!confirm('Hapus mata kuliah ini? Jadwal yang sudah dikonfirmasi juga akan dihapus.')) return;
  try {
    await api.del(`/api/courses/${id}`);
    showToast('Mata kuliah dihapus', 'success');
    renderCourses();
  } catch (err) { showToast(err.message, 'danger'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────────────────────
let currentRecommendations = null;
let selectedRecommendation = null;

async function renderRecommend() {
  const courses = await api.get('/api/courses');

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start">

      <!-- Controls panel -->
      <div>
        <div class="card mb-4">
          <div class="card-header"><h3>⚙️ Pengaturan</h3></div>
          <div class="card-body">
            <div class="form-group">
              <label>Pilih Mata Kuliah *</label>
              <select class="form-control" id="sel-course">
                <option value="">-- Pilih Mata Kuliah --</option>
                ${courses.map(c => `<option value="${c.id}">${escHtml(c.code)} – ${escHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Bobot Preferensi Dosen <span id="w-prof-val">40%</span></label>
              <input type="range" class="form-control" id="w-prof" min="0" max="100" value="40" style="padding:4px" />
            </div>
            <div class="form-group">
              <label>Bobot Preferensi Mahasiswa <span id="w-stu-val">35%</span></label>
              <input type="range" class="form-control" id="w-stu" min="0" max="100" value="35" style="padding:4px" />
            </div>
            <div class="form-group">
              <label>Bobot Ketersediaan Ruangan <span id="w-room-val">25%</span></label>
              <input type="range" class="form-control" id="w-room" min="0" max="100" value="25" style="padding:4px" />
            </div>
            <div id="weight-sum-warn" class="hidden">${alert$('danger', 'Total bobot harus = 100%')}</div>
            <button class="btn btn-primary w-full" id="btn-generate">🔍 Generate Rekomendasi</button>
          </div>
        </div>

        <div class="card" id="rec-summary-card" style="display:none">
          <div class="card-header"><h3>📌 Pilihan Terpilih</h3></div>
          <div class="card-body" id="rec-summary-body"></div>
        </div>
      </div>

      <!-- Results panel -->
      <div id="rec-results">
        <div class="card">
          <div class="card-body">
            <div class="empty-state">
              <div class="icon">🤖</div>
              <p>Pilih mata kuliah dan klik <strong>Generate Rekomendasi</strong></p>
            </div>
          </div>
        </div>
      </div>

    </div>`;

  // Weight sliders sync
  ['prof', 'stu', 'room'].forEach(k => {
    document.getElementById(`w-${k}`).addEventListener('input', () => {
      document.getElementById(`w-${k}-val`).textContent = document.getElementById(`w-${k}`).value + '%';
      const sum = +document.getElementById('w-prof').value + +document.getElementById('w-stu').value + +document.getElementById('w-room').value;
      document.getElementById('weight-sum-warn').classList.toggle('hidden', sum === 100);
    });
  });

  document.getElementById('btn-generate').addEventListener('click', () => generateRecommendations());
}

async function generateRecommendations() {
  const courseId = document.getElementById('sel-course').value;
  if (!courseId) { showToast('Pilih mata kuliah terlebih dahulu', 'danger'); return; }

  const wProf = +document.getElementById('w-prof').value / 100;
  const wStu  = +document.getElementById('w-stu').value  / 100;
  const wRoom = +document.getElementById('w-room').value / 100;

  if (Math.abs(wProf + wStu + wRoom - 1) > 0.01) {
    showToast('Total bobot harus = 100%', 'danger'); return;
  }

  const btn = document.getElementById('btn-generate');
  btn.disabled = true;
  btn.textContent = '⏳ Memproses…';

  try {
    const result = await api.post(`/api/schedule/recommend/${courseId}`, {
      weights: { professorWeight: wProf, studentWeight: wStu, roomWeight: wRoom },
    });
    currentRecommendations = result;
    selectedRecommendation = null;
    renderRecommendationResults(result);
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Generate Rekomendasi';
  }
}

function renderRecommendationResults(result) {
  const panel = document.getElementById('rec-results');

  if (result.recommendations.length === 0) {
    panel.innerHTML = `<div class="card"><div class="card-body">
      ${alert$('danger', 'Tidak ada kombinasi yang valid. Semua ruangan mungkin sudah penuh atau kapasitas tidak mencukupi.')}
    </div></div>`;
    return;
  }

  const top10 = result.recommendations.slice(0, 10);

  panel.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>🏆 Rekomendasi untuk ${escHtml(result.courseCode)} – ${escHtml(result.courseName)}</h3>
        <span class="badge badge-blue">${result.recommendations.length} kombinasi ditemukan</span>
      </div>
      <div class="card-body" style="padding:0">
        <div style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid var(--border);font-size:13px">
          👨‍🏫 <strong>${escHtml(result.professorName)}</strong> &nbsp;|&nbsp;
          👥 ${result.enrolledCount} mahasiswa &nbsp;|&nbsp;
          Bobot: Dosen ${(result.weights.professor*100).toFixed(0)}% · Mahasiswa ${(result.weights.student*100).toFixed(0)}% · Ruangan ${(result.weights.room*100).toFixed(0)}%
        </div>
        <div style="padding:16px">
          ${top10.map(r => `
            <div class="rec-card ${r.rank === 1 ? 'rank-1' : ''}" id="rec-${r.rank}" onclick="selectRecommendation(${r.rank})">
              <div class="rec-header">
                <div>
                  <div class="rec-rank ${r.rank === 1 ? 'gold' : ''}">#${r.rank}</div>
                  <div class="rec-info">
                    <h4>📅 ${escHtml(r.day)}, ${escHtml(r.timeSlot)}</h4>
                    <p>🏛️ ${escHtml(r.room.name)} (Kapasitas: ${r.room.capacity}, Tipe: ${escHtml(r.room.type)})</p>
                  </div>
                </div>
                <div style="text-align:right">
                  <div class="rec-total" style="color:${scoreColor(r.scores.total)}">${(r.scores.total*100).toFixed(1)}%</div>
                  <div class="text-muted">Total Skor</div>
                </div>
              </div>
              ${scoreBar('Dosen', r.scores.professor, 'prof')}
              ${scoreBar('Mahasiswa', r.scores.student, 'stu')}
              ${scoreBar('Ruangan', r.scores.room, 'room')}
            </div>`).join('')}

          ${result.recommendations.length > 10 ? `<p class="text-muted text-center" style="margin-top:8px">Menampilkan 10 dari ${result.recommendations.length} rekomendasi</p>` : ''}

          <div id="confirm-btn-wrap" class="hidden mt-4">
            <button class="btn btn-success w-full" onclick="confirmSchedule()">✅ Konfirmasi Jadwal Terpilih</button>
          </div>
        </div>
      </div>
    </div>`;
}

function selectRecommendation(rank) {
  selectedRecommendation = currentRecommendations.recommendations.find(r => r.rank === rank);
  document.querySelectorAll('.rec-card').forEach(el => el.classList.remove('selected'));
  document.getElementById(`rec-${rank}`).classList.add('selected');
  document.getElementById('confirm-btn-wrap').classList.remove('hidden');

  // Update summary card
  const card = document.getElementById('rec-summary-card');
  const body = document.getElementById('rec-summary-body');
  card.style.display = '';
  const r = selectedRecommendation;
  body.innerHTML = `
    <p><strong>Hari:</strong> ${escHtml(r.day)}</p>
    <p><strong>Sesi:</strong> ${escHtml(r.timeSlot)}</p>
    <p><strong>Ruangan:</strong> ${escHtml(r.room.name)}</p>
    <p><strong>Skor:</strong> ${(r.scores.total*100).toFixed(1)}%</p>
    <button class="btn btn-success w-full mt-4" onclick="confirmSchedule()">✅ Konfirmasi</button>
  `;
}

async function confirmSchedule() {
  if (!selectedRecommendation || !currentRecommendations) return;
  try {
    await api.post('/api/schedule/confirm', {
      courseId: currentRecommendations.courseId,
      day: selectedRecommendation.day,
      timeSlot: selectedRecommendation.timeSlot,
      roomId: selectedRecommendation.room.id,
    });
    showToast('Jadwal berhasil dikonfirmasi!', 'success');
    navigate('schedule');
  } catch (err) { showToast(err.message, 'danger'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────
async function renderSchedule() {
  const [schedules, courses] = await Promise.all([api.get('/api/schedule'), api.get('/api/courses')]);

  // Build grid data
  const gridCells = {};
  DAYS.forEach(day => { TIME_SLOTS.forEach(ts => { gridCells[`${day}|${ts}`] = []; }); });
  schedules.forEach(s => {
    const key = `${s.day}|${s.timeSlot}`;
    if (gridCells[key]) gridCells[key].push(s);
  });

  content.innerHTML = `
    <!-- List view -->
    <div class="card mb-4">
      <div class="card-header">
        <h3>📋 Jadwal Terkonfirmasi</h3>
        <span class="badge badge-blue">${schedules.length} jadwal</span>
      </div>
      <div class="card-body" style="padding:0">
        ${schedules.length === 0
          ? '<div class="empty-state"><div class="icon">📭</div><p>Belum ada jadwal yang dikonfirmasi.<br><a href="#" onclick="navigate(\'recommend\')">Buat rekomendasi</a> untuk mulai.</p></div>'
          : `<div class="table-wrap"><table>
            <thead><tr>
              <th>Kode</th><th>Mata Kuliah</th><th>Dosen</th><th>Hari</th><th>Sesi</th><th>Ruangan</th><th>Peserta</th><th>Aksi</th>
            </tr></thead>
            <tbody>
              ${schedules.map(s => `<tr>
                <td><span class="badge badge-gray">${escHtml(s.courseCode)}</span></td>
                <td><strong>${escHtml(s.courseName)}</strong></td>
                <td>${escHtml(s.professorName)}</td>
                <td>${escHtml(s.day)}</td>
                <td>${escHtml(s.timeSlot)}</td>
                <td>🏛️ ${escHtml(s.roomName)} <span class="text-muted">(${s.roomCapacity})</span></td>
                <td>${s.enrolledCount} mhs</td>
                <td>
                  <button class="btn btn-sm btn-danger" onclick="removeSchedule('${s.id}')">🗑️ Hapus</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}
      </div>
    </div>

    <!-- Unscheduled -->
    ${courses.filter(c => !schedules.find(s => s.courseId === c.id)).length > 0 ? `
    <div class="card mb-4">
      <div class="card-header"><h3>⚠️ Mata Kuliah Belum Dijadwalkan</h3></div>
      <div class="card-body">
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${courses.filter(c => !schedules.find(s => s.courseId === c.id)).map(c => `
            <div style="display:flex;align-items:center;gap:8px;background:#fff8e7;border:1px solid #fde68a;border-radius:8px;padding:8px 12px">
              <span class="badge badge-orange">${escHtml(c.code)}</span>
              <span style="font-size:13px">${escHtml(c.name)}</span>
              <button class="btn btn-sm btn-primary" onclick="navigate('recommend')">Rekomendasikan</button>
            </div>`).join('')}
        </div>
      </div>
    </div>` : ''}

    <!-- Timetable grid -->
    ${schedules.length > 0 ? `
    <div class="card">
      <div class="card-header"><h3>📅 Tabel Jadwal</h3></div>
      <div class="card-body" style="overflow-x:auto">
        <div class="schedule-grid">
          <div class="sg-header">Sesi / Hari</div>
          ${DAYS.map(d => `<div class="sg-header">${d}</div>`).join('')}
          ${TIME_SLOTS.map(ts => `
            <div class="sg-time">${ts}</div>
            ${DAYS.map(day => {
              const cell = gridCells[`${day}|${ts}`];
              return cell.length > 0
                ? `<div class="sg-cell occupied">
                    ${cell.map(s => `
                      <div class="sg-course-name">${escHtml(s.courseCode)}</div>
                      <div class="sg-meta">${escHtml(s.courseName)}</div>
                      <div class="sg-meta">🏛️ ${escHtml(s.roomName)}</div>`).join('')}
                   </div>`
                : '<div class="sg-cell"></div>';
            }).join('')}`).join('')}
        </div>
      </div>
    </div>` : ''}
  `;
}

async function removeSchedule(id) {
  if (!confirm('Hapus jadwal ini?')) return;
  try {
    await api.del(`/api/schedule/${id}`);
    showToast('Jadwal dihapus', 'success');
    renderSchedule();
  } catch (err) { showToast(err.message, 'danger'); }
}

// ─── Toast notification ────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;
    box-shadow:0 4px 20px rgba(0,0,0,.2);
    animation:slideUp .2s ease;
    background:${type === 'success' ? '#16a34a' : type === 'danger' ? '#dc2626' : '#2563eb'};
    color:#fff;max-width:360px;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ─── Expose to onclick attributes ────────────────────────────────────────────
window.editProfessor    = editProfessor;
window.deleteProfessor  = deleteProfessor;
window.editStudent      = editStudent;
window.deleteStudent    = deleteStudent;
window.editRoom         = editRoom;
window.deleteRoom       = deleteRoom;
window.editCourse       = editCourse;
window.deleteCourse     = deleteCourse;
window.selectRecommendation = selectRecommendation;
window.confirmSchedule  = confirmSchedule;
window.removeSchedule   = removeSchedule;
window.navigate         = navigate;

// ─── Init ─────────────────────────────────────────────────────────────────────
navigate('dashboard');
