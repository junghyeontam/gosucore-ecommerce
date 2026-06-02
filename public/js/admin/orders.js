if (!isLoggedIn() || !['manager','staff'].includes(getUser()?.role)) {
    window.location.href = '../client/login.html';
  }

  const user = getUser();
  if (user) {
    document.getElementById('admin-name').textContent   = user.full_name || user.username;
    document.getElementById('admin-role').textContent   = user.role === 'manager' ? 'Quản lý' : 'Nhân viên';
    document.getElementById('admin-avatar').textContent = (user.full_name || user.username)[0].toUpperCase();
  }

  const statusMap = {
    pending:   { label: 'Chờ xác nhận', badge: 'badge-pending' },
    confirmed: { label: 'Đã xác nhận',  badge: 'badge-confirmed' },
    shipping:  { label: 'Đang giao',    badge: 'badge-shipping' },
    done:      { label: 'Hoàn thành',   badge: 'badge-done' },
    cancelled: { label: 'Đã hủy',       badge: 'badge-cancelled' },
  };

  let currentStatus = null;
  let currentPage   = 1;
  let orderProducts  = [];
  let orderCustomers = [];

  const params = new URLSearchParams(window.location.search);
  if (params.get('status')) currentStatus = params.get('status');

  document.addEventListener('DOMContentLoaded', () => {
    if (currentStatus) {
      document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.remove('active');
        if (t.getAttribute('onclick')?.includes(`'${currentStatus}'`)) t.classList.add('active');
      });
    }
    loadOrders();
  });

  const ensureOrderFormData = async () => {
    if (!orderCustomers.length) {
      const data = await api.get('/admin/users?role=customer&limit=50');
      orderCustomers = data.data || [];
      const userSelect = document.getElementById('ao-user');
      userSelect.innerHTML = '<option value="">Chọn khách hàng</option>' + orderCustomers.map(u =>
        `<option value="${u.id}">
          ${u.full_name || u.username} - ${u.email}
        </option>`
      ).join('');
    }

    if (!orderProducts.length) {
      const data = await api.get('/products?limit=50&sort=name_asc');
      orderProducts = data.data || [];
    }
  };

  const productOptions = () => orderProducts.map(p =>
    `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}">
      ${p.name} - ${formatPrice(p.price)} - tồn ${p.stock}
    </option>`
  ).join('');

  const openAddOrderModal = async () => {
    try {
      await ensureOrderFormData();
      document.getElementById('ao-user').value = '';
      document.getElementById('ao-payment').value = 'cod';
      document.getElementById('ao-name').value = '';
      document.getElementById('ao-phone').value = '';
      document.getElementById('ao-address').value = '';
      document.getElementById('ao-voucher').value = '';
      document.getElementById('ao-note').value = '';
      document.getElementById('ao-items').innerHTML = '';
      addOrderItemRow();
      updateAddOrderTotal();
      document.getElementById('add-order-modal').classList.add('active');
    } catch (e) {
      toast.error(e.message || 'Không tải được dữ liệu tạo đơn hàng');
    }
  };

  const closeAddOrderModal = () => document.getElementById('add-order-modal').classList.remove('active');

  const addOrderItemRow = () => {
    const wrap = document.getElementById('ao-items');
    const row = document.createElement('div');
    row.className = 'form-row add-order-item-row';
    row.style.gridTemplateColumns = '1fr 90px 34px';
    row.innerHTML = `
      <select class="ao-product" style="width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:8px 12px;font-size:13.5px" onchange="updateAddOrderTotal()">
        <option value="">Chọn sản phẩm</option>
        ${productOptions()}
      </select>
      <input type="number" class="ao-qty" min="1" value="1" style="width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:8px 10px;font-size:13.5px" onchange="updateAddOrderTotal()" oninput="updateAddOrderTotal()">
      <button class="action-btn action-btn-delete" data-tooltip="Xóa dòng" onclick="removeOrderItemRow(this)">
        <svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    `;
    wrap.appendChild(row);
  };

  const removeOrderItemRow = (btn) => {
    const rows = document.querySelectorAll('.add-order-item-row');
    if (rows.length <= 1) {
      toast.info('Đơn hàng cần ít nhất một sản phẩm');
      return;
    }
    btn.closest('.add-order-item-row').remove();
    updateAddOrderTotal();
  };

  const updateAddOrderTotal = () => {
    let total = 0;
    document.querySelectorAll('.add-order-item-row').forEach(row => {
      const select = row.querySelector('.ao-product');
      const qty = Math.max(1, parseInt(row.querySelector('.ao-qty').value, 10) || 1);
      const option = select.selectedOptions[0];
      total += Number(option?.dataset?.price || 0) * qty;
    });
    document.getElementById('ao-total').value = formatPrice(total);
  };

  document.addEventListener('change', e => {
    if (e.target?.id === 'ao-user') {
      const selectedUser = orderCustomers.find(u => String(u.id) === e.target.value);
      document.getElementById('ao-name').value = selectedUser?.full_name || selectedUser?.username || '';
      document.getElementById('ao-phone').value = selectedUser?.phone || '';
    }
  });

  const loadOrders = async () => {
    const tbody = document.getElementById('orders-table');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-3)">Đang tải...</td></tr>';

    let url = `/admin/orders?page=${currentPage}&limit=20`;
    if (currentStatus) url += `&status=${currentStatus}`;

    try {
      const data   = await api.get(url);
      const orders = data.data;

      document.getElementById('order-count').textContent = `${orders.length} đơn hàng`;

      if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-3)">Không có đơn hàng nào</td></tr>';
        return;
      }

      tbody.innerHTML = orders.map(o => {
        const s = statusMap[o.status] || { label: o.status, badge: '' };
        return `
          <tr>
            <td>
              <span style="font-weight:700;color:var(--text-2);font-size:12px">
                #${o.id}
              </span>
            </td>
            <td>
              <div style="font-weight:600;font-size:13px">${o.shipping_name}</div>
              <div style="font-size:11px;color:var(--text-3)">${o.email}</div>
            </td>
            <td style="font-weight:700;font-size:13px">
              ${formatPrice(o.final_price)}
            </td>
            <td><span class="badge ${s.badge}">${s.label}</span></td>
            <td style="font-size:12px;color:var(--text-2)">${formatDate(o.created_at)}</td>
            <td>
              <div class="action-btns">
                <button class="action-btn action-btn-view"
                        data-tooltip="Xem chi tiết"
                        onclick="viewOrder(${o.id})">
                  <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </td>
          </tr>`;
      }).join('');

    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--red)">${e.message}</td></tr>`;
    }
  };

  const filterOrders = (status, el) => {
    currentStatus = status;
    currentPage   = 1;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    loadOrders();
  };

  const viewOrder = async (id) => {
    try {
      const data  = await api.get(`/orders/${id}`);
      const order = data.data;

      document.getElementById('modal-order-title').textContent = `Đơn hàng #${order.id}`;
      document.getElementById('modal-order-content').innerHTML = `
        <div style="margin-bottom:1.25rem">
          <div class="detail-row">
            <span class="label">Trạng thái</span>
            <select class="status-select" id="status-select-${order.id}" onchange="updateStatus(${order.id})">
              <option value="pending"   ${order.status==='pending'  ?'selected':''}>Chờ xác nhận</option>
              <option value="confirmed" ${order.status==='confirmed'?'selected':''}>Đã xác nhận</option>
              <option value="shipping"  ${order.status==='shipping' ?'selected':''}>Đang giao</option>
              <option value="done"      ${order.status==='done'     ?'selected':''}>Hoàn thành</option>
              <option value="cancelled" ${order.status==='cancelled'?'selected':''}>Đã hủy</option>
            </select>
          </div>
          <div class="detail-row">
            <span class="label">Khách hàng</span>
            <span class="value">${order.shipping_name}</span>
          </div>
          <div class="detail-row">
            <span class="label">Điện thoại</span>
            <span class="value">${order.shipping_phone}</span>
          </div>
          <div class="detail-row">
            <span class="label">Địa chỉ</span>
            <span class="value" style="text-align:right;max-width:280px">${order.shipping_address}</span>
          </div>
          ${order.note ? `<div class="detail-row"><span class="label">Ghi chú</span><span class="value">${order.note}</span></div>` : ''}
          <div class="detail-row">
            <span class="label">Ngày đặt</span>
            <span class="value">${formatDate(order.created_at)}</span>
          </div>
        </div>

        <div style="font-weight:700;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:var(--text-3);margin-bottom:10px">
          Sản phẩm
        </div>

        ${order.items.map(item => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-2)">
            <img src="${item.image_url || 'https://placehold.co/48x48/f5f5f7/999?text=IMG'}"
                 alt="${item.name}"
                 onerror="this.src='https://placehold.co/48x48/f5f5f7/999?text=IMG'"
                 style="width:44px;height:44px;object-fit:contain;background:var(--surface-2);border-radius:var(--r-md);padding:4px;border:1px solid var(--border-2);flex-shrink:0">
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px">${item.name}</div>
              <div style="font-size:11px;color:var(--text-3)">x${item.quantity} - ${formatPrice(item.unit_price)}/cái</div>
            </div>
            <div style="font-weight:700;font-size:13px">
              ${formatPrice(item.unit_price * item.quantity)}
            </div>
          </div>`).join('')}

        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
          ${order.discount_amount > 0 ? `
            <div class="detail-row">
              <span class="label">Tạm tính</span>
              <span>${formatPrice(order.total_price)}</span>
            </div>
            <div class="detail-row">
              <span class="label" style="color:var(--green)">Giảm giá</span>
              <span style="color:var(--green);font-weight:600">−${formatPrice(order.discount_amount)}</span>
            </div>` : ''}
          <div class="detail-row">
            <span class="label" style="font-weight:700;font-size:14px">Tổng cộng</span>
            <span class="value" style="font-size:16px;color:var(--accent)">
              ${formatPrice(order.final_price)}
            </span>
          </div>
        </div>`;

      document.getElementById('order-modal').classList.add('active');
    } catch(e) {
      toast.error('Lỗi tải đơn hàng!');
    }
  };

  const updateStatus = async (id) => {
    const status = document.getElementById(`status-select-${id}`).value;
    try {
      await api.patch(`/orders/${id}/status`, { status });
      toast.success('Cập nhật trạng thái thành công!');
      loadOrders();
    } catch(e) { toast.error(e.message); }
  };

  const collectAddOrderItems = () => {
    const items = [];
    document.querySelectorAll('.add-order-item-row').forEach(row => {
      const product_id = parseInt(row.querySelector('.ao-product').value, 10);
      const quantity = parseInt(row.querySelector('.ao-qty').value, 10);
      if (product_id && quantity > 0) items.push({ product_id, quantity });
    });
    return items;
  };

  const saveAdminOrder = async () => {
    const btn = document.getElementById('add-order-btn');
    const body = {
      user_id: parseInt(document.getElementById('ao-user').value, 10),
      shipping_name: document.getElementById('ao-name').value.trim(),
      shipping_phone: document.getElementById('ao-phone').value.trim(),
      shipping_address: document.getElementById('ao-address').value.trim(),
      payment_method: document.getElementById('ao-payment').value,
      voucher_code: document.getElementById('ao-voucher').value.trim() || undefined,
      note: document.getElementById('ao-note').value.trim() || undefined,
      items: collectAddOrderItems(),
    };

    if (!body.user_id) {
      toast.error('Vui lòng chọn khách hàng');
      return;
    }
    if (!body.shipping_name || !body.shipping_phone || !body.shipping_address) {
      toast.error('Vui lòng nhập đầy đủ thông tin nhận hàng');
      return;
    }
    if (!body.items.length) {
      toast.error('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }

    btn.textContent = 'Đang tạo...';
    btn.disabled = true;
    try {
      await api.post('/admin/orders', body);
      toast.success('Tạo đơn hàng thành công!');
      closeAddOrderModal();
      currentStatus = null;
      currentPage = 1;
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.filter-tab').classList.add('active');
      loadOrders();
    } catch (e) {
      toast.error(e.message || 'Tạo đơn hàng thất bại');
    } finally {
      btn.textContent = 'Tạo đơn hàng';
      btn.disabled = false;
    }
  };

  const closeModal = () => document.getElementById('order-modal').classList.remove('active');
