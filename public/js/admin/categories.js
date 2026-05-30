if (!isLoggedIn() || !['manager','staff'].includes(getUser()?.role)) {
    window.location.href = '../client/login.html';
  }

  const user = getUser();
  if (user) {
    document.getElementById('admin-name').textContent   = user.full_name || user.username;
    document.getElementById('admin-role').textContent   = user.role === 'manager' ? 'Quản lý' : 'Nhân viên';
    document.getElementById('admin-avatar').textContent = (user.full_name || user.username)[0].toUpperCase();
  }

  const catIcons = {
    'Chuột Gaming':    '<svg viewBox="0 0 24 24"><rect x="8" y="3" width="8" height="18" rx="4"/><path d="M12 7v3"/><path d="M8 12h8"/></svg>',
    'Bàn phím Gaming': '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 11h.01M10 11h.01M13 11h.01M16 11h.01M8 14h8"/></svg>',
    'Tai nghe Gaming': '<svg viewBox="0 0 24 24"><path d="M4 13a8 8 0 0 1 16 0"/><rect x="4" y="13" width="4" height="6" rx="2"/><rect x="16" y="13" width="4" height="6" rx="2"/><path d="M18 19a4 4 0 0 1-4 3h-2"/></svg>',
    'Màn hình Gaming': '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M9 20h6"/><path d="M12 16v4"/></svg>',
    'Lót chuột':       '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="3"/><path d="M8 10h8"/><path d="M8 14h5"/></svg>',
    'Ghế Gaming':      '<svg viewBox="0 0 24 24"><path d="M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8H8z"/><path d="M7 12h10"/><path d="M9 12v6"/><path d="M15 12v6"/><path d="M6 22h12"/><path d="M12 18v4"/></svg>',
  };

  const defaultCatIcon = '<svg viewBox="0 0 24 24"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4l2 2H18.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"/></svg>';
  const categoryIcon = (name, compact = false) =>
    `<span class="${compact ? 'category-mini-icon compact' : 'category-mini-icon'}">${catIcons[name] || defaultCatIcon}</span>`;

  document.addEventListener('DOMContentLoaded', () => { loadCategories(); });

  const loadCategories = async () => {
    const tbody = document.getElementById('categories-table');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-3)">Đang tải...</td></tr>';

    try {
      const data      = await api.get('/categories');
      const cats      = data.data;
      const isMgr     = user?.role === 'manager';
      const totalProd = cats.reduce((s, c) => s + c.product_count, 0);

      // Stats row
      document.getElementById('stats-row').innerHTML = `
        <div class="stat-card">
          <div class="stat-label">Tổng danh mục</div>
          <div class="stat-value">${cats.length}</div>
          <div class="stat-sub">Đang quản lý</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tổng sản phẩm</div>
          <div class="stat-value">${totalProd}</div>
          <div class="stat-sub">Trong tất cả danh mục</div>
        </div>
        ${cats.slice(0,3).map(c => `
          <div class="stat-card">
            <div class="stat-label stat-label-with-icon">${categoryIcon(c.name, true)} <span>${c.name}</span></div>
            <div class="stat-value">${c.product_count}</div>
            <div class="stat-sub">sản phẩm</div>
          </div>`).join('')}`;

      if (!cats.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-3)">Chưa có danh mục nào</td></tr>';
        return;
      }

      tbody.innerHTML = cats.map(c => `
        <tr>
          <td style="font-size:12px;color:var(--text-3);font-weight:600">#${c.id}</td>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              ${categoryIcon(c.name)}
              <div>
                <div style="font-weight:600;font-size:13px">${c.name}</div>
                <div style="font-size:11px;color:var(--text-3)">${c.slug}</div>
              </div>
            </div>
          </td>
          <td style="font-size:13px;color:var(--text-2);max-width:200px">
            ${c.description || '<span style="color:var(--text-3);font-style:italic">Chưa có mô tả</span>'}
          </td>
          <td>
            <span style="font-weight:700;font-size:13px">${c.product_count}</span>
            <span style="font-size:11px;color:var(--text-3)"> SP</span>
          </td>
          <td style="font-size:12px;color:var(--text-2)">${formatDate(c.created_at)}</td>
          <td>
            <div class="action-btns">
              <button class="action-btn action-btn-edit"
                      data-tooltip="Chỉnh sửa"
                      onclick="openEditModal(${c.id},'${c.name.replace(/'/g,"\\'")}','${(c.description||'').replace(/'/g,"\\'")}')">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <a href="products.html?category=${c.id}" class="action-btn action-btn-link" data-tooltip="Xem sản phẩm">
                <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </a>
              ${isMgr ? `
              <button class="action-btn action-btn-delete"
                      data-tooltip="Xóa danh mục"
                      onclick="confirmDelete(${c.id},'${c.name.replace(/'/g,"\\'")}',${c.product_count})">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>` : ''}
            </div>
          </td>
        </tr>`).join('');

    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--red)">${e.message}</td></tr>`;
    }
  };

  const openAddModal = () => {
    document.getElementById('modal-title').textContent = 'Thêm danh mục mới';
    document.getElementById('save-btn').textContent    = 'Thêm danh mục';
    document.getElementById('edit-id').value = '';
    document.getElementById('f-name').value  = '';
    document.getElementById('f-desc').value  = '';
    document.getElementById('cat-modal').classList.add('active');
  };

  const openEditModal = (id, name, desc) => {
    document.getElementById('modal-title').textContent = 'Chỉnh sửa danh mục';
    document.getElementById('save-btn').textContent    = 'Lưu thay đổi';
    document.getElementById('edit-id').value = id;
    document.getElementById('f-name').value  = name;
    document.getElementById('f-desc').value  = desc;
    document.getElementById('cat-modal').classList.add('active');
  };

  const closeModal = () => document.getElementById('cat-modal').classList.remove('active');

  const saveCategory = async () => {
    const id   = document.getElementById('edit-id').value;
    const name = document.getElementById('f-name').value.trim();
    const desc = document.getElementById('f-desc').value.trim();
    const btn  = document.getElementById('save-btn');
    if (!name) { toast.error('Vui lòng nhập tên danh mục!'); return; }
    btn.textContent = 'Đang lưu...'; btn.disabled = true;
    try {
      if (id) { await api.put(`/categories/${id}`, { name, description: desc }); toast.success('Cập nhật danh mục thành công!'); }
      else    { await api.post('/categories', { name, description: desc });        toast.success('Thêm danh mục thành công!'); }
      closeModal(); loadCategories();
    } catch(e) { toast.error(e.message); }
    finally { btn.textContent = id ? 'Lưu thay đổi' : 'Thêm danh mục'; btn.disabled = false; }
  };

  // ── Confirm delete ────────────────────────────────────────
  let _deleteId = null;

  const confirmDelete = (id, name, productCount) => {
    _deleteId = id;
    const canDelete = productCount === 0;

    document.getElementById('confirm-title').textContent = canDelete ? 'Xóa danh mục?' : 'Không thể xóa';
    document.getElementById('confirm-desc').innerHTML = canDelete
      ? `Bạn có chắc muốn xóa danh mục <strong>${name}</strong>? Hành động này không thể hoàn tác.`
      : `Danh mục <strong>${name}</strong> còn <strong>${productCount} sản phẩm</strong>. Hãy chuyển hết sản phẩm sang danh mục khác trước khi xóa.`;

    const btn = document.getElementById('confirm-ok-btn');
    btn.style.display = canDelete ? 'flex' : 'none';
    if (canDelete) btn.onclick = doDelete;

    document.getElementById('confirm-modal').classList.add('active');
  };

  const closeConfirm = () => {
    document.getElementById('confirm-modal').classList.remove('active');
    _deleteId = null;
  };

  const doDelete = async () => {
    if (!_deleteId) return;
    try {
      await api.delete(`/categories/${_deleteId}`);
      toast.success('Đã xóa danh mục!');
      closeConfirm(); loadCategories();
    } catch(e) { toast.error(e.message); closeConfirm(); }
  };
