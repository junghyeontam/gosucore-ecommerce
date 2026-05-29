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
              <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--text-2);font-size:12px">
                #${o.id}
              </span>
            </td>
            <td>
              <div style="font-weight:600;font-size:13px">${o.shipping_name}</div>
              <div style="font-size:11px;color:var(--text-3)">${o.email}</div>
            </td>
            <td style="font-weight:700;font-size:13px;font-family:'JetBrains Mono',monospace">
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
            <div style="font-weight:700;font-size:13px;font-family:'JetBrains Mono',monospace">
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
            <span class="value" style="font-size:16px;color:var(--accent);font-family:'JetBrains Mono',monospace">
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

  const closeModal = () => document.getElementById('order-modal').classList.remove('active');
