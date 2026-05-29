if (!isLoggedIn() || !['manager','staff'].includes(getUser()?.role)) {
    window.location.href = '../client/login.html';
  }

  const user = getUser();
  if (user) {
    document.getElementById('admin-name').textContent   = user.full_name || user.username;
    document.getElementById('admin-role').textContent   = user.role === 'manager' ? 'Quản lý' : 'Nhân viên';
    document.getElementById('admin-avatar').textContent = (user.full_name || user.username)[0].toUpperCase();
  }

  let currentPage = 1;
  let searchTimer = null;
  let categories  = [];

  document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    applyCategoryFromUrl();
    await loadProducts();
  });

  const loadCategories = async () => {
    try {
      const data = await api.get('/products/categories');
      categories = data.data;
      const sel1 = document.getElementById('filter-category');
      const sel2 = document.getElementById('f-category');
      categories.forEach(c => {
        sel1.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        sel2.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    } catch(e) {}
  };

  const applyCategoryFromUrl = () => {
    const category = new URLSearchParams(window.location.search).get('category');
    if (!category) return;

    const sel = document.getElementById('filter-category');
    const exists = Array.from(sel.options).some(option => option.value === category);
    if (exists) sel.value = category;
  };

  const changeProductFilters = () => {
    currentPage = 1;

    const category = document.getElementById('filter-category').value;
    const url = new URL(window.location.href);
    if (category) url.searchParams.set('category', category);
    else url.searchParams.delete('category');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);

    loadProducts();
  };

  const loadProducts = async () => {
    const tbody = document.getElementById('products-table');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-3)">Đang tải...</td></tr>';

    const search   = document.getElementById('search').value;
    const category = document.getElementById('filter-category').value;
    const sort     = document.getElementById('filter-sort').value;

    let url = `/products?page=${currentPage}&limit=15&sort=${sort}`;
    if (search)   url += `&search=${encodeURIComponent(search)}`;
    if (category) url += `&category=${category}`;

    try {
      const data     = await api.get(url);
      const products = data.data;
      const pag      = data.pagination;
      const isMgr    = user?.role === 'manager';

      if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-3)">Không tìm thấy sản phẩm</td></tr>';
        renderPagination(null); return;
      }

      tbody.innerHTML = products.map(p => `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:12px">
              <img class="product-img-thumb"
                   src="${p.image_url || 'https://placehold.co/48x48/f5f5f7/999?text=IMG'}"
                   alt="${p.name}"
                   onerror="this.src='https://placehold.co/48x48/f5f5f7/999?text=IMG'">
              <div>
                <div style="font-weight:600;font-size:13px">${p.name}</div>
                <div style="font-size:11px;color:var(--text-3)">${p.brand || ''}</div>
              </div>
            </div>
          </td>
          <td style="font-size:13px;color:var(--text-2)">${p.category_name}</td>
          <td style="font-weight:600;font-size:13px">${formatPrice(p.price)}</td>
          <td>
            <span class="stock-badge ${p.stock <= 5 ? 'stock-low' : 'stock-ok'}">
              ${p.stock}
            </span>
          </td>
          <td>
            <div class="action-btns">
              <button class="action-btn action-btn-edit"
                      data-tooltip="Chỉnh sửa"
                      onclick="openEditModal(${p.id})">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              ${isMgr ? `
              <button class="action-btn action-btn-delete"
                      data-tooltip="Xóa sản phẩm"
                      onclick="confirmDelete(${p.id}, '${p.name.replace(/'/g,"\\'")}')">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>` : ''}
            </div>
          </td>
        </tr>`).join('');

      renderPagination(pag);
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red)">${e.message}</td></tr>`;
    }
  };

  const renderPagination = (pag) => {
    const el = document.getElementById('pagination');
    if (!pag || pag.total_pages <= 1) { el.innerHTML = ''; return; }
    let h = '';
    if (pag.page > 1) h += `<button class="btn btn-light btn-sm" onclick="changePage(${pag.page-1})">Trước</button>`;
    for (let i = 1; i <= pag.total_pages; i++) {
      if (Math.abs(i - pag.page) <= 2)
        h += `<button class="btn btn-sm ${i === pag.page ? 'btn-primary' : 'btn-light'}" onclick="changePage(${i})">${i}</button>`;
    }
    if (pag.page < pag.total_pages) h += `<button class="btn btn-light btn-sm" onclick="changePage(${pag.page+1})">Tiếp</button>`;
    el.innerHTML = h;
  };

  const changePage = (p) => { currentPage = p; loadProducts(); };
  const debounceSearch = () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { currentPage = 1; loadProducts(); }, 500); };

  const openAddModal = () => {
    document.getElementById('modal-title').textContent = 'Thêm sản phẩm mới';
    document.getElementById('save-btn').textContent    = 'Lưu sản phẩm';
    document.getElementById('edit-id').value = '';
    ['name','brand','price','stock','description','image','specs'].forEach(f => document.getElementById(`f-${f}`).value = '');
    document.getElementById('f-category').value = '';
    document.getElementById('product-modal').classList.add('active');
  };

  const openEditModal = async (id) => {
    try {
      const data = await api.get(`/products/${id}`);
      const p    = data.data;
      document.getElementById('modal-title').textContent = 'Chỉnh sửa sản phẩm';
      document.getElementById('save-btn').textContent    = 'Lưu thay đổi';
      document.getElementById('edit-id').value           = p.id;
      document.getElementById('f-name').value            = p.name || '';
      document.getElementById('f-brand').value           = p.brand || '';
      document.getElementById('f-price').value           = p.price || '';
      document.getElementById('f-stock').value           = p.stock || '';
      document.getElementById('f-category').value        = p.category_id || '';
      document.getElementById('f-description').value     = p.description || '';
      document.getElementById('f-image').value           = p.image_url || '';
      document.getElementById('f-specs').value           = p.specs || '';
      document.getElementById('product-modal').classList.add('active');
    } catch(e) { toast.error('Lỗi tải thông tin sản phẩm!'); }
  };

  const closeModal = () => document.getElementById('product-modal').classList.remove('active');

  const saveProduct = async () => {
    const id    = document.getElementById('edit-id').value;
    const name  = document.getElementById('f-name').value.trim();
    const price = document.getElementById('f-price').value;
    const cat   = document.getElementById('f-category').value;
    const btn   = document.getElementById('save-btn');

    if (!name || !price || !cat) { toast.error('Vui lòng điền đủ tên, giá và danh mục!'); return; }

    const body = {
      name, price: parseFloat(price),
      brand:       document.getElementById('f-brand').value.trim(),
      stock:       parseInt(document.getElementById('f-stock').value) || 0,
      category_id: parseInt(cat),
      description: document.getElementById('f-description').value.trim(),
      image_url:   document.getElementById('f-image').value.trim(),
      specs:       document.getElementById('f-specs').value.trim(),
    };

    btn.textContent = 'Đang lưu...'; btn.disabled = true;
    try {
      if (id) { await api.put(`/products/${id}`, body); toast.success('Cập nhật thành công!'); }
      else    { await api.post('/products', body);       toast.success('Thêm sản phẩm thành công!'); }
      closeModal(); loadProducts();
    } catch(e) { toast.error(e.message); }
    finally { btn.textContent = id ? 'Lưu thay đổi' : 'Lưu sản phẩm'; btn.disabled = false; }
  };

  // ── Confirm delete ────────────────────────────────────────
  let _deleteId = null;

  const confirmDelete = (id, name) => {
    _deleteId = id;
    document.getElementById('confirm-desc').innerHTML =
      `Sản phẩm <strong>${name}</strong> sẽ bị ẩn khỏi cửa hàng. Hành động này có thể hoàn tác.`;
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
      await api.delete(`/products/${_deleteId}`);
      toast.success('Đã xóa sản phẩm!');
      closeConfirm(); loadProducts();
    } catch(e) { toast.error(e.message); closeConfirm(); }
  };
