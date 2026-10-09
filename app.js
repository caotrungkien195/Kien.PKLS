/* ====================================================
   MedSchedule – Application Logic (app.js)
   LocalStorage-based, no backend required
   ==================================================== */

// ============================================================
//  DATA LAYER – LocalStorage helpers
// ============================================================
const DB = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  getObj: (key, def = {}) => { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } },
  setObj: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

// ============================================================
//  INITIAL SEED DATA
// ============================================================
function seedData() {
  if (localStorage.getItem('med_seeded')) return;

  // Departments
  const depts = [
    { id: 'd1', name: 'Phòng Xquang', icon: '🔬', color: '#1a56db', desc: 'Chẩn đoán hình ảnh X-quang' },
    { id: 'd2', name: 'Phòng Xét nghiệm', icon: '🧪', color: '#10b981', desc: 'Xét nghiệm máu, nước tiểu' },
    { id: 'd3', name: 'Phòng Nội soi', icon: '🔭', color: '#f59e0b', desc: 'Nội soi dạ dày, đại tràng' },
    { id: 'd4', name: 'Phòng Cấp cứu', icon: '🚨', color: '#ef4444', desc: 'Xử lý cấp cứu 24/7' },
    { id: 'd5', name: 'Phòng Siêu âm', icon: '📡', color: '#8b5cf6', desc: 'Siêu âm bụng, tim mạch' },
  ];
  DB.set('med_depts', depts);

  // Employees
  const employees = [
    { id: 'e1', name: 'BS. Nguyễn Văn Tuấn', position: 'Bác sĩ', deptId: 'd1', phone: '0901111222', note: 'Trưởng phòng', createdAt: '2024-01-01' },
    { id: 'e2', name: 'CN. Lê Thị Mai', position: 'Điều dưỡng', deptId: 'd1', phone: '0902222333', note: '', createdAt: '2024-01-01' },
    { id: 'e3', name: 'KTV. Trần Minh Khoa', position: 'Kỹ thuật viên', deptId: 'd2', phone: '0903333444', note: '', createdAt: '2024-01-01' },
    { id: 'e4', name: 'BS. Phạm Thị Hương', position: 'Bác sĩ', deptId: 'd3', phone: '0904444555', note: '', createdAt: '2024-01-01' },
    { id: 'e5', name: 'CN. Đặng Quốc Hùng', position: 'Điều dưỡng', deptId: 'd4', phone: '0905555666', note: '', createdAt: '2024-01-01' },
    { id: 'e6', name: 'BS. Vũ Thị Lan', position: 'Bác sĩ', deptId: 'd5', phone: '0906666777', note: 'Siêu âm tim mạch', createdAt: '2024-01-01' },
  ];
  DB.set('med_employees', employees);

  // Admin account
  const users = [
    {
      id: 'u0',
      username: 'admin',
      password: 'admin123',
      fullname: 'Quản trị viên',
      role: 'admin',
      deptId: '',
      position: 'Quản trị',
      status: 'active',
      createdAt: new Date().toISOString(),
    }
  ];
  DB.set('med_users', users);

  // Leave requests (sample)
  const today = new Date();
  const leaves = [
    {
      id: 'l1',
      userId: 'u0',
      employeeId: 'e1',
      employeeName: 'BS. Nguyễn Văn Tuấn',
      deptId: 'd1',
      fromDate: fmtDate(new Date(today.getFullYear(), today.getMonth(), 10)),
      toDate: fmtDate(new Date(today.getFullYear(), today.getMonth(), 11)),
      type: 'Phép năm',
      reason: 'Nghỉ phép thường niên',
      status: 'approved',
      note: '',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'l2',
      userId: 'u0',
      employeeId: 'e2',
      employeeName: 'CN. Lê Thị Mai',
      deptId: 'd1',
      fromDate: fmtDate(new Date(today.getFullYear(), today.getMonth(), 15)),
      toDate: fmtDate(new Date(today.getFullYear(), today.getMonth(), 16)),
      type: 'Phép ốm',
      reason: 'Bị cảm cúm, cần nghỉ ngơi',
      status: 'pending',
      note: '',
      createdAt: new Date().toISOString(),
    },
  ];
  DB.set('med_leaves', leaves);

  localStorage.setItem('med_seeded', '1');
}

function fmtDate(d) {
  // Dùng local date (tránh lệch timezone UTC)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function genId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/** Escape HTML để chống XSS khi render dữ liệu người dùng */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
//  CURRENT STATE
// ============================================================
let currentUser = null;
let currentPage = 'schedule';
let calendarMonth = new Date();
let approvalFilter = 'all';
let userFilter = 'all';

// ============================================================
//  INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  seedData();
  const savedUser = DB.getObj('med_current_user', null);
  if (savedUser && savedUser.id) {
    // Re-validate from DB
    const users = DB.get('med_users');
    const user = users.find(u => u.id === savedUser.id && u.status === 'active');
    if (user) {
      loginSuccess(user);
    } else {
      showAuth('login-view');
    }
  } else {
    showAuth('login-view');
  }
  populateDeptSelects();
});

// ============================================================
//  AUTH
// ============================================================
function showAuth(view) {
  document.querySelectorAll('.auth-card').forEach(c => c.classList.remove('active'));
  document.getElementById(view).classList.add('active');
  populateDeptSelects();
}

function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}

document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  btn.disabled = true; btn.textContent = 'Đang đăng nhập...';

  setTimeout(() => {
    const users = DB.get('med_users');
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      errEl.textContent = 'Tên đăng nhập hoặc mật khẩu không đúng.';
      errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Đăng nhập';
      return;
    }
    if (user.status === 'pending') {
      errEl.textContent = 'Tài khoản đang chờ admin phê duyệt. Vui lòng chờ.';
      errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Đăng nhập';
      return;
    }
    if (user.status === 'rejected') {
      errEl.textContent = 'Tài khoản đã bị từ chối. Vui lòng liên hệ quản trị viên.';
      errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Đăng nhập';
      return;
    }
    errEl.classList.add('hidden');
    loginSuccess(user);
    btn.disabled = false; btn.textContent = 'Đăng nhập';
  }, 500);
});

document.getElementById('register-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const fullname = document.getElementById('reg-fullname').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const deptId = document.getElementById('reg-department').value;
  const position = document.getElementById('reg-role').value;
  const errEl = document.getElementById('reg-error');

  if (password.length < 6) {
    errEl.textContent = 'Mật khẩu phải có ít nhất 6 ký tự.'; errEl.classList.remove('hidden'); return;
  }
  if (!deptId) {
    errEl.textContent = 'Vui lòng chọn phòng ban.'; errEl.classList.remove('hidden'); return;
  }

  const users = DB.get('med_users');
  if (users.find(u => u.username === username)) {
    errEl.textContent = 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.'; errEl.classList.remove('hidden'); return;
  }

  const newUser = {
    id: genId(),
    username, password, fullname,
    role: 'staff',
    deptId, position,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  DB.set('med_users', users);

  errEl.classList.add('hidden');
  this.reset();
  showToast('Đăng ký thành công! Vui lòng chờ admin phê duyệt.', 'success');
  setTimeout(() => showAuth('login-view'), 1800);
});

function loginSuccess(user) {
  currentUser = user;
  DB.setObj('med_current_user', user);

  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // Set user info
  const initials = user.fullname.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('sidebar-name').textContent = user.fullname;
  document.getElementById('topbar-user').textContent = user.fullname;

  const depts = DB.get('med_depts');
  const dept = depts.find(d => d.id === user.deptId);
  document.getElementById('sidebar-dept').textContent = dept ? dept.name : (user.role === 'admin' ? 'Quản trị hệ thống' : '--');
  document.getElementById('sidebar-role-badge').textContent = user.role === 'admin' ? '👑 Admin' : user.position || 'Nhân viên';

  // Show/hide admin menu items (sidebar)
  document.querySelectorAll('.admin-only').forEach(el => {
    el.classList.toggle('hidden', user.role !== 'admin');
  });

  // Bottom nav: hiện khi đăng nhập, ẩn mục admin nếu không phải admin
  const bn = document.getElementById('bottom-nav');
  if (bn) bn.style.display = 'block';
  ['bn-employees', 'bn-departments', 'bn-users'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = user.role === 'admin' ? '' : 'none';
  });
  // Staff: hiện "Nghỉ phép"; Admin cũng hiện
  const bnLeave = document.getElementById('bn-leaves');
  if (bnLeave) bnLeave.style.display = '';

  navigate('schedule');
  updateBadges();
}

function logout() {
  currentUser = null;
  DB.setObj('med_current_user', {});
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');
  const bn = document.getElementById('bottom-nav');
  if (bn) bn.style.display = 'none';
  showAuth('login-view');
  closeSidebarIfMobile();
}

// ============================================================
//  NAVIGATION
// ============================================================
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  // Sync bottom nav active state
  const bnMap = {
    schedule: 'bn-schedule',
    leave: 'bn-leaves',
    employees: 'bn-employees',
    departments: 'bn-departments',
    users: 'bn-users',
  };
  document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
  const bnEl = document.getElementById(bnMap[page]);
  if (bnEl) bnEl.classList.add('active');

  const titles = {
    schedule: '📅 Lịch làm việc',
    leave: '✉️ Đơn nghỉ phép',
    approvals: '✅ Phê duyệt',
    employees: '👥 Nhân viên',
    departments: '🏥 Phòng ban',
    users: '🔑 Tài khoản',
  };
  document.getElementById('topbar-title').textContent = titles[page] || '';
  closeSidebarIfMobile();

  // Render page
  switch (page) {
    case 'schedule': renderSchedule(); break;
    case 'leave': renderLeaveList(); break;
    case 'approvals': renderApprovals(); break;
    case 'employees': renderEmployees(); break;
    case 'departments': renderDepartments(); break;
    case 'users': renderUsers(); break;
  }
}

function toggleSidebar() {
  const s = document.getElementById('sidebar');
  const o = document.getElementById('sidebar-overlay');
  s.classList.toggle('open');
  o.classList.toggle('hidden', !s.classList.contains('open'));
}

function closeSidebarIfMobile() {
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.add('hidden');
  }
}

// ============================================================
//  BADGES
// ============================================================
function updateBadges() {
  const leaves = DB.get('med_leaves');
  const users = DB.get('med_users');

  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const pendingUsers = users.filter(u => u.status === 'pending').length;

  setBadge('nav-approval-badge', pendingLeaves);
  setBadge('nav-users-badge', pendingUsers);

  // My pending leaves (sidebar + bottom nav)
  if (currentUser) {
    const myPending = leaves.filter(l => l.userId === currentUser.id && l.status === 'pending').length;
    setBadge('nav-leave-badge', myPending);
    // Bottom nav badge
    const bnBadge = document.getElementById('bn-leave-badge');
    if (bnBadge) {
      if (myPending > 0) {
        bnBadge.textContent = myPending;
        bnBadge.style.display = 'inline-flex';
      } else {
        bnBadge.style.display = 'none';
      }
    }
  }
}

function setBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  if (count > 0) { el.textContent = count; el.classList.remove('hidden'); }
  else { el.classList.add('hidden'); }
}

// ============================================================
//  POPULATE DEPT SELECTS
// ============================================================
function populateDeptSelects() {
  const depts = DB.get('med_depts');

  const selects = ['reg-department', 'emp-dept', 'schedule-dept-filter', 'emp-dept-filter'];
  selects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const isFilter = id.includes('filter');
    const placeholder = isFilter ? '' : '';
    const currentVal = sel.value;

    // Keep only first option
    while (sel.options.length > 1) sel.remove(1);

    depts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.icon + ' ' + d.name;
      sel.appendChild(opt);
    });
    if (currentVal) sel.value = currentVal;
  });
}

// ============================================================
//  SCHEDULE PAGE
// ============================================================
function changeMonth(dir) {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + dir, 1);
  renderSchedule();
}

function renderSchedule() {
  const depts = DB.get('med_depts');
  const employees = DB.get('med_employees');
  const leaves = DB.get('med_leaves');
  const filterDept = document.getElementById('schedule-dept-filter')?.value || '';

  const y = calendarMonth.getFullYear();
  const m = calendarMonth.getMonth();
  const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                      'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  document.getElementById('current-month-label').textContent = `${monthNames[m]} ${y}`;

  const cal = document.getElementById('schedule-calendar');
  cal.innerHTML = '';

  // Day headers
  const dayNames = ['CN','T2','T3','T4','T5','T6','T7'];
  dayNames.forEach(d => {
    const h = document.createElement('div');
    h.className = 'cal-header'; h.textContent = d;
    cal.appendChild(h);
  });

  const firstDay = new Date(y, m, 1).getDay();
  const totalDays = new Date(y, m + 1, 0).getDate();
  const today = new Date();

  // Prev month padding
  const prevMonthDays = new Date(y, m, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const cell = createDayCell(new Date(y, m - 1, prevMonthDays - i), employees, leaves, depts, filterDept, true);
    cal.appendChild(cell);
  }

  // Current month
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(y, m, d);
    const cell = createDayCell(date, employees, leaves, depts, filterDept, false);
    // Mark today
    if (date.toDateString() === today.toDateString()) cell.classList.add('today');
    // Mark weekend
    const dow = date.getDay();
    if (dow === 0 || dow === 6) cell.classList.add('weekend');
    cal.appendChild(cell);
  }

  // Next month padding to fill grid
  const total = firstDay + totalDays;
  const remaining = 7 - (total % 7 === 0 ? 7 : total % 7);
  for (let d = 1; d <= remaining && remaining < 7; d++) {
    const cell = createDayCell(new Date(y, m + 1, d), employees, leaves, depts, filterDept, true);
    cal.appendChild(cell);
  }
}

function createDayCell(date, employees, leaves, depts, filterDept, isOtherMonth) {
  const dateStr = fmtDate(date);
  const cell = document.createElement('div');
  cell.className = 'cal-day' + (isOtherMonth ? ' other-month' : '');

  const dayLeaves = leaves.filter(l => {
    const from = l.fromDate; const to = l.toDate;
    return l.status === 'approved' && dateStr >= from && dateStr <= to &&
      (!filterDept || l.deptId === filterDept);
  });

  if (dayLeaves.length > 0) cell.classList.add('has-leave');

  // Day number
  const numEl = document.createElement('div');
  numEl.className = 'day-num';
  const inner = document.createElement('span');
  inner.textContent = date.getDate();
  numEl.appendChild(inner);
  cell.appendChild(numEl);

  // Chips
  const chips = document.createElement('div');
  chips.className = 'cal-chips';
  dayLeaves.slice(0, 2).forEach(l => {
    const dept = depts.find(d => d.id === l.deptId);
    const chip = document.createElement('div');
    chip.className = 'cal-chip';
    chip.style.background = (dept?.color || '#1a56db') + '22';
    chip.style.color = dept?.color || '#1a56db';
    chip.textContent = l.employeeName.split('.').pop()?.trim().split(' ').slice(-1)[0] || l.employeeName;
    chips.appendChild(chip);
  });
  if (dayLeaves.length > 2) {
    const more = document.createElement('div');
    more.className = 'cal-chip';
    more.style.background = '#f1f5f9';
    more.style.color = '#64748b';
    more.textContent = `+${dayLeaves.length - 2} nữa`;
    chips.appendChild(more);
  }
  cell.appendChild(chips);

  cell.onclick = () => openDayDetail(date, employees, leaves, depts, filterDept);
  return cell;
}

function openDayDetail(date, employees, leaves, depts, filterDept) {
  const dateStr = fmtDate(date);
  const dayNames = ['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'];

  document.getElementById('day-detail-title').textContent =
    `${dayNames[date.getDay()]}, ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;

  const filteredEmps = filterDept ? employees.filter(e => e.deptId === filterDept) : employees;
  const dayLeaves = leaves.filter(l => l.status === 'approved' && dateStr >= l.fromDate && dateStr <= l.toDate);
  const leaveEmpIds = dayLeaves.map(l => l.employeeId);

  let html = '';

  // Staff on leave
  dayLeaves.forEach(l => {
    const dept = depts.find(d => d.id === l.deptId);
    if (filterDept && l.deptId !== filterDept) return;
    html += `
      <div class="day-staff-item">
        <div class="staff-avatar" style="background:${esc(dept?.color||'#f59e0b')}">
          ${esc(l.employeeName.charAt(0))}
        </div>
        <div class="staff-info">
          <div class="staff-name">${esc(l.employeeName)}</div>
          <div class="staff-dept">${esc(dept?.name || '')} · ${esc(l.type)}</div>
        </div>
        <span class="staff-status status-leave">Nghỉ phép</span>
      </div>`;
  });

  // Staff working
  filteredEmps.filter(e => !leaveEmpIds.includes(e.id)).forEach(e => {
    const dept = depts.find(d => d.id === e.deptId);
    html += `
      <div class="day-staff-item">
        <div class="staff-avatar" style="background:${esc(dept?.color||'#1a56db')}">
          ${esc(e.name.charAt(0))}
        </div>
        <div class="staff-info">
          <div class="staff-name">${esc(e.name)}</div>
          <div class="staff-dept">${esc(dept?.name || '')} · ${esc(e.position)}</div>
        </div>
        <span class="staff-status status-working">Làm việc</span>
      </div>`;
  });

  if (!html) html = '<div class="empty-state"><span class="empty-icon">📭</span><h3>Không có dữ liệu</h3></div>';

  document.getElementById('day-detail-content').innerHTML = html;
  document.getElementById('day-detail-modal').classList.remove('hidden');
}

function closeDayDetail() {
  document.getElementById('day-detail-modal').classList.add('hidden');
}

// ============================================================
//  LEAVE PAGE
// ============================================================
function renderLeaveList() {
  const leaves = DB.get('med_leaves');
  const depts = DB.get('med_depts');
  const container = document.getElementById('leave-list');

  let myLeaves = currentUser.role === 'admin'
    ? leaves
    : leaves.filter(l => l.userId === currentUser.id);

  myLeaves = myLeaves.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!myLeaves.length) {
    container.innerHTML = emptyState('✉️', 'Chưa có đơn nghỉ phép', 'Nhấn "+ Tạo đơn" để tạo đơn nghỉ mới.');
    return;
  }
  container.innerHTML = myLeaves.map(l => leaveCardHTML(l, depts, false)).join('');
}

function leaveCardHTML(l, depts, isApproval) {
  const dept = depts.find(d => d.id === l.deptId);
  const color = dept?.color || '#1a56db';
  const badgeClass = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' }[l.status];
  const badgeText = { pending: '⏳ Chờ duyệt', approved: '✅ Đã duyệt', rejected: '❌ Từ chối' }[l.status];

  const days = Math.ceil((new Date(l.toDate) - new Date(l.fromDate)) / 86400000) + 1;

  let actions = '';
  if (isApproval && l.status === 'pending') {
    actions = `
      <button class="btn-success btn-sm" onclick="approveLeave('${esc(l.id)}')">✅ Duyệt</button>
      <button class="btn-danger btn-sm" onclick="rejectLeave('${esc(l.id)}')">❌ Từ chối</button>`;
  }
  if (!isApproval && l.status === 'pending') {
    actions = `<button class="btn-outline btn-sm" onclick="cancelLeave('${esc(l.id)}')">🗑 Hủy đơn</button>`;
  }
  if (l.note) {
    actions += `<span style="font-size:12px;color:var(--text-muted);align-self:center;">💬 ${esc(l.note)}</span>`;
  }

  return `
    <div class="leave-card" id="lc-${esc(l.id)}">
      <div class="leave-card-header">
        <div class="leave-person">
          <div class="leave-avatar" style="background:${esc(color)}">${esc(l.employeeName.charAt(0))}</div>
          <div class="leave-person-info">
            <div class="person-name">${esc(l.employeeName)}</div>
            <div class="person-dept">${esc(dept?.name || '')}</div>
          </div>
        </div>
        <span class="leave-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="leave-card-body">
        <div class="leave-date-range">📅 ${formatDateVN(l.fromDate)} → ${formatDateVN(l.toDate)} (${days} ngày)</div>
        <span class="leave-type-tag">${esc(l.type)}</span>
        <div class="leave-reason">💬 ${esc(l.reason)}</div>
      </div>
      ${actions ? `<div class="leave-card-footer">${actions}</div>` : ''}
    </div>`;
}

function openLeaveModal() {
  const today = fmtDate(new Date());
  document.getElementById('leave-from').value = today;
  document.getElementById('leave-to').value = today;
  document.getElementById('leave-reason').value = '';
  document.getElementById('leave-form-error').classList.add('hidden');
  document.getElementById('leave-modal').classList.remove('hidden');
}
function closeLeaveModal() { document.getElementById('leave-modal').classList.add('hidden'); }

function submitLeave(e) {
  e.preventDefault();
  const fromDate = document.getElementById('leave-from').value;
  const toDate = document.getElementById('leave-to').value;
  const type = document.getElementById('leave-type').value;
  const reason = document.getElementById('leave-reason').value.trim();
  const errEl = document.getElementById('leave-form-error');

  if (fromDate > toDate) {
    errEl.textContent = 'Ngày bắt đầu không được sau ngày kết thúc.';
    errEl.classList.remove('hidden'); return;
  }

  const employees = DB.get('med_employees');

  // Ưu tiên tìm employee theo userId (đồng bộ), sau đó theo tên
  let emp = employees.find(em => em.userId === currentUser.id)
    || employees.find(em => em.name === currentUser.fullname);
  let empName = emp?.name || currentUser.fullname;
  let deptId = emp?.deptId || currentUser.deptId || '';

  const leave = {
    id: genId(),
    userId: currentUser.id,
    employeeId: emp?.id || currentUser.id,
    employeeName: empName,
    deptId,
    fromDate, toDate, type, reason,
    status: 'pending',
    note: '',
    createdAt: new Date().toISOString(),
  };
  const leaves = DB.get('med_leaves');
  leaves.push(leave);
  DB.set('med_leaves', leaves);

  closeLeaveModal();
  renderLeaveList();
  updateBadges();
  showToast('Đơn nghỉ đã được gửi! Chờ admin phê duyệt.', 'success');
}

function cancelLeave(id) {
  confirmDialog('Hủy đơn nghỉ?', 'Đơn này sẽ bị xóa và không thể khôi phục.', () => {
    const leaves = DB.get('med_leaves').filter(l => l.id !== id);
    DB.set('med_leaves', leaves);
    renderLeaveList();
    updateBadges();
    showToast('Đã hủy đơn nghỉ.', 'warning');
  });
}

// ============================================================
//  APPROVALS PAGE (Admin)
// ============================================================
function filterApprovals(filter, btn) {
  approvalFilter = filter;
  document.querySelectorAll('#page-approvals .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderApprovals();
}

function renderApprovals() {
  const leaves = DB.get('med_leaves');
  const depts = DB.get('med_depts');
  let filtered = approvalFilter === 'all' ? leaves : leaves.filter(l => l.status === approvalFilter);
  filtered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const container = document.getElementById('approval-list');
  if (!filtered.length) {
    container.innerHTML = emptyState('📋', 'Không có đơn nào', 'Không có đơn nghỉ phép trong mục này.');
    return;
  }
  container.innerHTML = filtered.map(l => leaveCardHTML(l, depts, true)).join('');
}

function approveLeave(id) {
  const leaves = DB.get('med_leaves');
  const l = leaves.find(x => x.id === id);
  if (!l) return;
  l.status = 'approved';
  l.note = 'Đã được quản trị viên phê duyệt';
  DB.set('med_leaves', leaves);
  renderApprovals();
  updateBadges();
  showToast('✅ Đã phê duyệt đơn nghỉ!', 'success');
}

function rejectLeave(id) {
  promptDialog('Lý do từ chối', 'Nhập lý do từ chối đơn nghỉ (tùy chọn):', (note) => {
    const leaves = DB.get('med_leaves');
    const l = leaves.find(x => x.id === id);
    if (!l) return;
    l.status = 'rejected';
    l.note = note || 'Không được phê duyệt';
    DB.set('med_leaves', leaves);
    renderApprovals();
    updateBadges();
    showToast('❌ Đã từ chối đơn nghỉ.', 'error');
  });
}

// ============================================================
//  EMPLOYEES PAGE (Admin)
// ============================================================
function renderEmployees() {
  const employees = DB.get('med_employees');
  const depts = DB.get('med_depts');
  const search = (document.getElementById('emp-search')?.value || '').toLowerCase();
  const deptFilter = document.getElementById('emp-dept-filter')?.value || '';

  let list = employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search) || e.position.toLowerCase().includes(search);
    const matchDept = !deptFilter || e.deptId === deptFilter;
    return matchSearch && matchDept;
  });

  const container = document.getElementById('employee-list');
  if (!list.length) {
    container.innerHTML = emptyState('👥', 'Không có nhân viên', 'Thêm nhân viên mới để bắt đầu.');
    return;
  }

  container.innerHTML = list.map(e => {
    const dept = depts.find(d => d.id === e.deptId);
    const color = dept?.color || '#1a56db';
    return `
      <div class="employee-card">
        <div class="emp-avatar" style="background:${esc(color)}">${esc(e.name.charAt(0))}</div>
        <div class="emp-info">
          <div class="emp-name">${esc(e.name)}</div>
          <div class="emp-position">${esc(e.position)}${e.phone ? ' · 📞 ' + esc(e.phone) : ''}</div>
          <span class="emp-dept-tag" style="background:${esc(color)}22;color:${esc(color)}">
            ${esc(dept?.icon || '🏥')} ${esc(dept?.name || 'Chưa phân phòng')}
          </span>
          ${e.note ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">📝 ${esc(e.note)}</div>` : ''}
        </div>
        <div class="emp-actions">
          <button class="btn-sm edit" onclick="openEmployeeModal('${esc(e.id)}')">✏️ Sửa</button>
          <button class="btn-sm del" onclick="deleteEmployee('${esc(e.id)}')">🗑</button>
        </div>
      </div>`;
  }).join('');
}

function openEmployeeModal(id) {
  populateDeptSelects();
  document.getElementById('emp-modal-title').textContent = id ? 'Sửa nhân viên' : 'Thêm nhân viên';
  document.getElementById('emp-id').value = id || '';

  if (id) {
    const emp = DB.get('med_employees').find(e => e.id === id);
    if (emp) {
      document.getElementById('emp-name').value = emp.name;
      document.getElementById('emp-position').value = emp.position;
      document.getElementById('emp-dept').value = emp.deptId;
      document.getElementById('emp-phone').value = emp.phone || '';
      document.getElementById('emp-note').value = emp.note || '';
    }
  } else {
    document.getElementById('employee-form').reset();
  }
  document.getElementById('employee-modal').classList.remove('hidden');
}
function closeEmployeeModal() { document.getElementById('employee-modal').classList.add('hidden'); }

function saveEmployee(e) {
  e.preventDefault();
  const id = document.getElementById('emp-id').value;
  const data = {
    name: document.getElementById('emp-name').value.trim(),
    position: document.getElementById('emp-position').value,
    deptId: document.getElementById('emp-dept').value,
    phone: document.getElementById('emp-phone').value.trim(),
    note: document.getElementById('emp-note').value.trim(),
  };
  const employees = DB.get('med_employees');
  if (id) {
    const idx = employees.findIndex(e => e.id === id);
    if (idx >= 0) employees[idx] = { ...employees[idx], ...data };
  } else {
    employees.push({ id: genId(), ...data, createdAt: new Date().toISOString() });
  }
  DB.set('med_employees', employees);
  closeEmployeeModal();
  renderEmployees();
  showToast(id ? 'Đã cập nhật nhân viên!' : 'Đã thêm nhân viên mới!', 'success');
}

function deleteEmployee(id) {
  confirmDialog('Xóa nhân viên?', 'Thao tác này không thể hoàn tác.', () => {
    const employees = DB.get('med_employees').filter(e => e.id !== id);
    DB.set('med_employees', employees);
    renderEmployees();
    showToast('Đã xóa nhân viên.', 'warning');
  });
}

// ============================================================
//  DEPARTMENTS PAGE (Admin)
// ============================================================
function renderDepartments() {
  const depts = DB.get('med_depts');
  const employees = DB.get('med_employees');
  const container = document.getElementById('dept-list');
  if (!depts.length) {
    container.innerHTML = emptyState('🏥', 'Chưa có phòng ban', 'Thêm phòng ban để bắt đầu.');
    return;
  }
  container.innerHTML = depts.map(d => {
    const count = employees.filter(e => e.deptId === d.id).length;
    return `
      <div class="dept-card">
        <div class="dept-icon-big">${esc(d.icon || '🏥')}</div>
        <div class="dept-card-name">${esc(d.name)}</div>
        <div class="dept-card-desc">${esc(d.desc || '')}</div>
        <span class="dept-count" style="background:${esc(d.color)}22;color:${esc(d.color)}">👥 ${count} nhân viên</span>
        <div class="dept-card-actions">
          <button class="btn-sm edit" onclick="openDeptModal('${esc(d.id)}')">✏️ Sửa</button>
          <button class="btn-sm del" onclick="deleteDept('${esc(d.id)}')">🗑</button>
        </div>
      </div>`;
  }).join('');
}

function openDeptModal(id) {
  document.getElementById('dept-modal-title').textContent = id ? 'Sửa phòng ban' : 'Thêm phòng ban';
  document.getElementById('dept-id').value = id || '';
  if (id) {
    const dept = DB.get('med_depts').find(d => d.id === id);
    if (dept) {
      document.getElementById('dept-name').value = dept.name;
      document.getElementById('dept-icon').value = dept.icon || '';
      document.getElementById('dept-color').value = dept.color || '#1a56db';
      document.getElementById('dept-desc').value = dept.desc || '';
    }
  } else {
    document.getElementById('dept-form').reset();
    document.getElementById('dept-color').value = '#1a56db';
  }
  document.getElementById('dept-modal').classList.remove('hidden');
}
function closeDeptModal() { document.getElementById('dept-modal').classList.add('hidden'); }

function saveDept(e) {
  e.preventDefault();
  const id = document.getElementById('dept-id').value;
  const data = {
    name: document.getElementById('dept-name').value.trim(),
    icon: document.getElementById('dept-icon').value.trim() || '🏥',
    color: document.getElementById('dept-color').value,
    desc: document.getElementById('dept-desc').value.trim(),
  };
  const depts = DB.get('med_depts');
  if (id) {
    const idx = depts.findIndex(d => d.id === id);
    if (idx >= 0) depts[idx] = { ...depts[idx], ...data };
  } else {
    depts.push({ id: genId(), ...data });
  }
  DB.set('med_depts', depts);
  closeDeptModal();
  renderDepartments();
  populateDeptSelects();
  showToast(id ? 'Đã cập nhật phòng ban!' : 'Đã thêm phòng ban mới!', 'success');
}

function deleteDept(id) {
  const employees = DB.get('med_employees');
  const empCount = employees.filter(e => e.deptId === id).length;
  if (empCount > 0) {
    showToast(`Không thể xóa! Còn ${empCount} nhân viên trong phòng này.`, 'error');
    return;
  }
  confirmDialog('Xóa phòng ban?', 'Thao tác này không thể hoàn tác.', () => {
    const depts = DB.get('med_depts').filter(d => d.id !== id);
    DB.set('med_depts', depts);
    renderDepartments();
    populateDeptSelects();
    showToast('Đã xóa phòng ban.', 'warning');
  });
}

// ============================================================
//  USERS PAGE (Admin)
// ============================================================
function filterUsers(filter, btn) {
  userFilter = filter;
  document.querySelectorAll('#page-users .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderUsers();
}

function renderUsers() {
  const users = DB.get('med_users');
  const depts = DB.get('med_depts');
  let list = userFilter === 'all' ? users : users.filter(u => u.status === userFilter);
  list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const container = document.getElementById('users-list');
  if (!list.length) {
    container.innerHTML = emptyState('🔑', 'Không có tài khoản', 'Chưa có tài khoản nào trong danh sách này.');
    return;
  }

  container.innerHTML = list.map(u => {
    const dept = depts.find(d => d.id === u.deptId);
    const statusBadge = {
      pending: '<span class="leave-badge badge-pending">⏳ Chờ duyệt</span>',
      active: '<span class="leave-badge badge-approved">✅ Hoạt động</span>',
      rejected: '<span class="leave-badge badge-rejected">❌ Từ chối</span>',
    }[u.status] || '';

    let actions = '';
    if (u.status === 'pending') {
      actions = `
        <button class="btn-success btn-sm" onclick="approveUser('${esc(u.id)}')">✅ Duyệt</button>
        <button class="btn-danger btn-sm" onclick="rejectUser('${esc(u.id)}')">❌ Từ chối</button>`;
    }
    if (u.status === 'active' && u.role !== 'admin') {
      actions = `<button class="btn-warning btn-sm" onclick="toggleUserStatus('${esc(u.id)}')">🔒 Vô hiệu</button>`;
    }
    if (u.status === 'rejected') {
      actions = `<button class="btn-success btn-sm" onclick="approveUser('${esc(u.id)}')">🔓 Kích hoạt lại</button>`;
    }
    if (u.role === 'admin') actions = '<span style="font-size:12px;color:var(--text-muted);">👑 Quản trị viên</span>';

    return `
      <div class="user-card">
        <div class="user-avatar-lg" style="width:44px;height:44px;font-size:16px;">
          ${esc(u.fullname.split(' ').pop()?.charAt(0) || 'U')}
        </div>
        <div class="user-card-info">
          <div class="user-card-name">${esc(u.fullname)}</div>
          <div class="user-card-meta">
            @${esc(u.username)} · ${esc(u.position || '')} · ${esc(dept?.name || 'Chưa phân phòng')}
          </div>
          <div style="margin-top:4px;">${statusBadge}</div>
        </div>
        <div class="user-card-actions">${actions}</div>
      </div>`;
  }).join('');
}

function approveUser(id) {
  const users = DB.get('med_users');
  const u = users.find(x => x.id === id);
  if (!u) return;
  u.status = 'active';
  DB.set('med_users', users);

  // Tự tạo bản ghi nhân viên nếu chưa có (đồng bộ User ↔ Employee)
  const employees = DB.get('med_employees');
  const exists = employees.some(e => e.userId === u.id || e.name === u.fullname);
  if (!exists && u.role !== 'admin') {
    employees.push({
      id: genId(),
      userId: u.id,
      name: u.fullname,
      position: u.position || 'Nhân viên',
      deptId: u.deptId || '',
      phone: '',
      note: 'Tự tạo khi duyệt tài khoản',
      createdAt: fmtDate(new Date()),
    });
    DB.set('med_employees', employees);
  }

  renderUsers();
  updateBadges();
  showToast('✅ Đã phê duyệt tài khoản!', 'success');
}

function rejectUser(id) {
  const users = DB.get('med_users');
  const u = users.find(x => x.id === id);
  if (!u) return;
  u.status = 'rejected';
  DB.set('med_users', users);
  renderUsers();
  updateBadges();
  showToast('❌ Đã từ chối tài khoản.', 'error');
}

function toggleUserStatus(id) {
  const users = DB.get('med_users');
  const u = users.find(x => x.id === id);
  if (!u) return;
  u.status = u.status === 'active' ? 'rejected' : 'active';
  DB.set('med_users', users);
  renderUsers();
  showToast(u.status === 'active' ? '🔓 Đã kích hoạt tài khoản.' : '🔒 Đã vô hiệu hóa tài khoản.', 'warning');
}

// ============================================================
//  UTILITY – Dialogs
// ============================================================
function confirmDialog(title, msg, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <h3>${esc(title)}</h3>
      <p>${esc(msg)}</p>
      <div class="confirm-actions">
        <button class="btn-outline" id="confirm-cancel">Hủy</button>
        <button class="btn-danger" id="confirm-ok">Xác nhận</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('confirm-cancel').onclick = () => overlay.remove();
  document.getElementById('confirm-ok').onclick = () => { overlay.remove(); onConfirm(); };
}

function promptDialog(title, msg, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <h3>${esc(title)}</h3>
      <p style="margin-bottom:10px;">${esc(msg)}</p>
      <input id="prompt-input" type="text" placeholder="Nhập lý do..." style="
        width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;
        font-family:inherit;font-size:14px;margin-bottom:16px;">
      <div class="confirm-actions">
        <button class="btn-outline" id="prompt-cancel">Hủy</button>
        <button class="btn-danger" id="prompt-ok">Xác nhận</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('prompt-cancel').onclick = () => overlay.remove();
  document.getElementById('prompt-ok').onclick = () => {
    const val = document.getElementById('prompt-input').value;
    overlay.remove();
    onConfirm(val);
  };
  setTimeout(() => document.getElementById('prompt-input')?.focus(), 100);
}

// ============================================================
//  UTILITY – Toast
// ============================================================
let toastTimer = null;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ============================================================
//  UTILITY – Helpers
// ============================================================
function formatDateVN(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function emptyState(icon, title, desc) {
  return `<div class="empty-state">
    <span class="empty-icon">${icon}</span>
    <h3>${title}</h3>
    <p>${desc}</p>
  </div>`;
}

// Close modals on overlay click
document.getElementById('day-detail-modal').addEventListener('click', function(e) {
  if (e.target === this) closeDayDetail();
});
document.getElementById('leave-modal').addEventListener('click', function(e) {
  if (e.target === this) closeLeaveModal();
});
document.getElementById('employee-modal').addEventListener('click', function(e) {
  if (e.target === this) closeEmployeeModal();
});
document.getElementById('dept-modal').addEventListener('click', function(e) {
  if (e.target === this) closeDeptModal();
});
