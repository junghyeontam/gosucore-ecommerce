if (!isLoggedIn() || !['manager','staff'].includes(getUser()?.role)) {
    window.location.href = '../client/login.html';
  }

  const user      = getUser();
  const isManager = user?.role === 'manager';

  if (user) {
    document.getElementById('admin-name').textContent   = user.full_name || user.username;
    document.getElementById('admin-role').textContent   = user.role === 'manager' ? 'Quản lý' : 'Nhân viên';
    document.getElementById('admin-avatar').textContent = (user.full_name || user.username)[0].toUpperCase();
    if (isManager) document.getElementById('btn-add-user').style.display = 'inline-flex';
  }

  let searchTimer = null;
  document.addEventListener('DOMContentLoaded', () => { loadUsers(); });

  const loadUsers = async () => {
    const tbody = document.getElementById('users-table');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-3)">Đang tải...</td></tr>';

    const search = document.getElementById('search').value;
    const role   = document.getElementById('filter-role').value;
    let url = '/admin/users?limit=50';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (role)   url += `&role=${role}`;

    try {
      const data  = await api.get(url);
      const users = data.data;

      if (!users?.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-3)">Không tìm thấy tài khoản</td></tr>';
        return;
      }

      const roleLabel = { manager: 'Quản lý', staff: 'Nhân viên', customer: 'Khách hàng' };
      const roleCls   = { manager: 'role-manager', staff: 'role-staff', customer: 'role-customer' };

      tbody.innerHTML = users.map(u => `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="user-avatar">${(u.full_name || u.username)[0].toUpperCase()}</div>
              <div>
                <div style="font-weight:600;font-size:13px">${u.full_name || u.username}</div>
                <div style="font-size:11px;color:var(--text-3)">@${u.username}</div>
              </div>
            </div>
          </td>
          <td style="font-size:13px">${u.email}</td>
          <td style="font-size:13px;color:var(--text-2)">${u.phone || '—'}</td>
          <td><span class="role-badge ${roleCls[u.role] || 'role-customer'}">${roleLabel[u.role] || u.role}</span></td>
          <td>
            <span class="badge ${u.is_active ? 'badge-done' : 'badge-cancelled'}">
              ${u.is_active ? 'Hoạt động' : 'Bị khóa'}
            </span>
          </td>
          <td style="font-size:12px;color:var(--text-2)">${formatDate(u.created_at)}</td>
          <td>
            <div class="action-btns">
              ${isManager ? `
              <button class="action-btn action-btn-edit"
                      data-tooltip="Chỉnh sửa"
                      onclick="openEditModal(${u.id},'${(u.full_name||'').replace(/'/g,"\\'")}','${(u.phone||'').replace(/'/g,"\\'")}','${u.role}',${u.is_active?1:0})">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>` : ''}
              ${isManager && u.id !== user.id ? `
              <button class="action-btn action-btn-delete"
                      data-tooltip="Xóa tài khoản"
                      onclick="confirmDelete(${u.id},'${u.username}')">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>` : ''}
            </div>
          </td>
        </tr>`).join('');

    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--red)">${e.message}</td></tr>`;
    }
  };

  const debounceSearch = () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadUsers, 500); };

  const openAddUserModal = () => {
    ['nu-username','nu-fullname','nu-email','nu-phone','nu-password'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('nu-role').value = 'customer';
    document.getElementById('add-user-modal').classList.add('active');
  };

  const closeAddUserModal = () => document.getElementById('add-user-modal').classList.remove('active');

  const addNewUser = async () => {
    const username  = document.getElementById('nu-username').value.trim();
    const full_name = document.getElementById('nu-fullname').value.trim();
    const email     = document.getElementById('nu-email').value.trim();
    const phone     = document.getElementById('nu-phone').value.trim();
    const password  = document.getElementById('nu-password').value;
    const role      = document.getElementById('nu-role').value;
    const btn       = document.getElementById('add-user-btn');

    if (!username || !email || !password) { toast.error('Vui lòng điền username, email và mật khẩu!'); return; }
    if (password.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự!'); return; }

    btn.textContent = 'Đang tạo...'; btn.disabled = true;
    try {
      await api.post('/admin/users', { username, full_name, email, phone, password, role });
      toast.success('Tạo tài khoản thành công!');
      closeAddUserModal(); loadUsers();
    } catch(e) { toast.error(e.message); }
    finally { btn.textContent = 'Tạo tài khoản'; btn.disabled = false; }
  };

  const openEditModal = (id, fullname, phone, role, isActive) => {
    document.getElementById('edit-user-id').value = id;
    document.getElementById('u-fullname').value   = fullname;
    document.getElementById('u-phone').value      = phone;
    document.getElementById('u-role').value       = role;
    document.getElementById('u-active').value     = isActive ? '1' : '0';
    document.getElementById('user-modal').classList.add('active');
  };

  const closeModal = () => document.getElementById('user-modal').classList.remove('active');

  const saveUser = async () => {
    const id = document.getElementById('edit-user-id').value;
    try {
      await api.put(`/admin/users/${id}`, {
        full_name: document.getElementById('u-fullname').value,
        phone:     document.getElementById('u-phone').value,
        role:      document.getElementById('u-role').value,
        is_active: document.getElementById('u-active').value === '1',
      });
      toast.success('Cập nhật tài khoản thành công!');
      closeModal(); loadUsers();
    } catch(e) { toast.error(e.message); }
  };

  // ── Confirm lock ──────────────────────────────────────────
  let _statusUserId = null;
  let _nextActive = true;

  const confirmStatusChange = (id, username, nextActive) => {
    _statusUserId = id;
    _nextActive = Boolean(nextActive);
    const statusMessage = _nextActive
      ? `Tài khoản <strong>@${username}</strong> sẽ được mở khóa và có thể đăng nhập lại.`
      : `Tài khoản <strong>@${username}</strong> sẽ bị khóa và không thể đăng nhập.`;
    document.getElementById('confirm-desc').innerHTML =
      `Tài khoản <strong>@${username}</strong> sẽ bị vô hiệu hóa và không thể đăng nhập.`;
    document.getElementById('confirm-ok-btn').textContent = _nextActive ? 'Mở khóa' : 'Khóa';
    document.getElementById('confirm-ok-btn').onclick = doStatusChange;
    document.getElementById('confirm-desc').innerHTML = statusMessage;
    document.getElementById('confirm-modal').classList.add('active');
  };

  const closeConfirm = () => {
    document.getElementById('confirm-modal').classList.remove('active');
    _statusUserId = null;
    _deleteId = null;
  };

  const doStatusChange = async () => {
    if (!_statusUserId) return;
    try {
      await api.put(`/admin/users/${_statusUserId}`, { is_active: _nextActive });
      toast.success(_nextActive ? 'Đã mở khóa tài khoản!' : 'Đã khóa tài khoản!');
      closeConfirm(); loadUsers();
    } catch(e) { toast.error(e.message); closeConfirm(); }
  };

  let _deleteId = null;

  const confirmDelete = (id, username) => {
    _deleteId = id;
    const title = document.querySelector('#confirm-modal .confirm-modal-title');
    if (title) title.textContent = 'Xóa tài khoản?';
    document.getElementById('confirm-desc').innerHTML =
      `Tài khoản <strong>@${username}</strong> sẽ bị xóa khỏi danh sách quản lý.`;
    document.getElementById('confirm-ok-btn').textContent = 'Xóa';
    document.getElementById('confirm-ok-btn').onclick = doDelete;
    document.getElementById('confirm-modal').classList.add('active');
  };

  const doDelete = async () => {
    if (!_deleteId) return;
    try {
      await api.delete(`/admin/users/${_deleteId}`);
      toast.success('Đã xóa tài khoản!');
      closeConfirm();
      loadUsers();
    } catch(e) {
      toast.error(e.message);
      closeConfirm();
    }
  };
