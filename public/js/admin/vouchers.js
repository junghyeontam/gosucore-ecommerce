if (!isLoggedIn() || !['manager','staff'].includes(getUser()?.role)) {
    window.location.href = '../client/login.html';
  }

  const user = getUser();
  if (user) {
    document.getElementById('admin-name').textContent   = user.full_name || user.username;
    document.getElementById('admin-role').textContent   = user.role === 'manager' ? 'Quản lý' : 'Nhân viên';
    document.getElementById('admin-avatar').textContent = (user.full_name || user.username)[0].toUpperCase();
  }

  document.addEventListener('DOMContentLoaded', () => { loadVouchers(); });

  const loadVouchers = async () => {
    const tbody = document.getElementById('vouchers-table');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-3)">Đang tải...</td></tr>';

    try {
      const data     = await api.get('/vouchers');
      const vouchers = data.data;

      if (!vouchers.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-3)">Chưa có voucher nào</td></tr>';
        return;
      }

      tbody.innerHTML = vouchers.map(v => {
        const pct       = v.max_uses > 0 ? Math.round((v.used_count / v.max_uses) * 100) : 0;
        const isExpired = v.expires_at && new Date(v.expires_at) < new Date();
        const isActive  = v.is_active && !isExpired;

        return `
          <tr>
            <td><span class="voucher-code">${v.code}</span></td>
            <td>
              <span style="font-size:16px;font-weight:800;color:var(--accent)">
                ${v.discount_percent}%
              </span>
            </td>
            <td>
              <div style="font-size:13px;margin-bottom:5px">
                ${v.used_count} <span style="color:var(--text-3);font-family:inherit">/ ${v.max_uses}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${pct}%"></div>
              </div>
            </td>
            <td style="font-size:12px;color:var(--text-2)">
              ${v.expires_at
                ? (isExpired
                    ? `<span style="color:var(--red);font-weight:600">Hết hạn</span><br><span style="font-size:11px">${formatDate(v.expires_at)}</span>`
                    : formatDate(v.expires_at))
                : '<span style="color:var(--text-3)">Không giới hạn</span>'}
            </td>
            <td>
              <span class="badge ${isActive ? 'badge-done' : 'badge-cancelled'}">
                ${isActive ? 'Đang dùng' : 'Tắt'}
              </span>
            </td>
            <td>
              <div class="action-btns">
                <button class="action-btn ${v.is_active ? 'action-btn-toggle-off' : 'action-btn-toggle-on'}"
                        data-tooltip="${v.is_active ? 'Tắt voucher' : 'Bật voucher'}"
                        onclick="toggleVoucher(${v.id}, ${v.is_active ? 1 : 0})">
                  ${v.is_active
                    ? `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
                    : `<svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`
                  }
                </button>
                <button class="action-btn action-btn-delete"
                        data-tooltip="Xóa voucher"
                        onclick="confirmDelete(${v.id},'${v.code}')">
                  <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            </td>
          </tr>`;
      }).join('');

    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--red)">${e.message}</td></tr>`;
    }
  };

  const openAddModal = () => {
    document.getElementById('modal-title').textContent = 'Tạo voucher mới';
    document.getElementById('save-btn').textContent    = 'Tạo voucher';
    document.getElementById('edit-id').value    = '';
    document.getElementById('v-code').value     = '';
    document.getElementById('v-discount').value = '';
    document.getElementById('v-maxuses').value  = '100';
    document.getElementById('v-expires').value  = '';
    document.getElementById('voucher-modal').classList.add('active');
  };

  const closeModal = () => document.getElementById('voucher-modal').classList.remove('active');

  const saveVoucher = async () => {
    const code     = document.getElementById('v-code').value.trim().toUpperCase();
    const discount = document.getElementById('v-discount').value;
    const maxuses  = document.getElementById('v-maxuses').value;
    const expires  = document.getElementById('v-expires').value;
    const btn      = document.getElementById('save-btn');

    if (!code || !discount) { toast.error('Vui lòng nhập mã và % giảm giá!'); return; }

    btn.textContent = 'Đang lưu...'; btn.disabled = true;
    try {
      await api.post('/vouchers', {
        code,
        discount_percent: parseInt(discount),
        max_uses:         parseInt(maxuses) || 100,
        expires_at:       expires || undefined,
      });
      toast.success('Tạo voucher thành công!');
      closeModal(); loadVouchers();
    } catch(e) { toast.error(e.message); }
    finally { btn.textContent = 'Tạo voucher'; btn.disabled = false; }
  };

  const toggleVoucher = async (id, isActive) => {
    try {
      await api.put(`/vouchers/${id}`, { is_active: !isActive });
      toast.success(isActive ? 'Đã tắt voucher!' : 'Đã bật voucher!');
      loadVouchers();
    } catch(e) { toast.error(e.message); }
  };

  // ── Confirm delete ────────────────────────────────────────
  let _deleteId = null;

  const confirmDelete = (id, code) => {
    _deleteId = id;
    document.getElementById('confirm-desc').innerHTML =
      `Voucher <strong>${code}</strong> sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`;
    document.getElementById('confirm-ok-btn').onclick = doDelete;
    document.getElementById('confirm-modal').classList.add('active');
  };

  const closeConfirm = () => {
    document.getElementById('confirm-modal').classList.remove('active');
    _deleteId = null;
  };

  const doDelete = async () => {
    if (!_deleteId) return;
    try {
      await api.delete(`/vouchers/${_deleteId}`);
      toast.success('Đã xóa voucher!');
      closeConfirm(); loadVouchers();
    } catch(e) { toast.error(e.message); closeConfirm(); }
  };
