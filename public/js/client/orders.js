if (!isLoggedIn()) window.location.href = 'login.html';

    let allOrders     = [];
    let currentFilter = null;
    let cancelOrderId = null;

    const statusMap = {
      pending:   { label: 'Chờ xác nhận', badge: 'badge-pending' },
      confirmed: { label: 'Đã xác nhận',  badge: 'badge-confirmed' },
      shipping:  { label: 'Đang giao',    badge: 'badge-shipping' },
      done:      { label: 'Hoàn thành',   badge: 'badge-done' },
      cancelled: { label: 'Đã hủy',       badge: 'badge-cancelled' },
    };

    const icons = {
      alert: '<svg viewBox="0 0 24 24"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
      box: '<svg viewBox="0 0 24 24"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
      check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
      clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
      truck: '<svg viewBox="0 0 24 24"><path d="M10 17h4V5H2v12h3"/><path d="M14 8h4l4 4v5h-3"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
      party: '<svg viewBox="0 0 24 24"><path d="M12 2v20"/><path d="m17 5-5-3-5 3"/><path d="M5 12h14"/><path d="m7 19 5 3 5-3"/></svg>',
      x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
      ticket: '<svg viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>',
      mapPin: '<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      note: '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>',
      star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9z"/></svg>',
    };

    const icon = (name) => icons[name] || '';
    const lineIcon = (name) => `<span class="order-line-icon">${icon(name)}</span>`;

    const timelineSteps = [
      { key: 'pending',   icon: 'clock', label: 'Chờ xác nhận' },
      { key: 'confirmed', icon: 'check', label: 'Đã xác nhận' },
      { key: 'shipping',  icon: 'truck', label: 'Đang giao' },
      { key: 'done',      icon: 'party', label: 'Hoàn thành' },
    ];

    async function loadOrders() {
      try {
        const data = await api.get('/orders/my');
        allOrders  = data.data;
        renderOrders();
      } catch(e) {
        document.getElementById('orders-container').innerHTML = `
          <div class="empty-state">
            <div class="icon">${icon('alert')}</div>
            <h3>Lỗi tải đơn hàng</h3>
            <p>${e.message}</p>
          </div>`;
      }
    }

    function filterOrders(status, el) {
      currentFilter = status;
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      renderOrders();
    }

    function renderOrders() {
      const container = document.getElementById('orders-container');
      const orders    = currentFilter
        ? allOrders.filter(o => o.status === currentFilter)
        : allOrders;

      if (!orders.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="icon">${icon('box')}</div>
            <h3>Chưa có đơn hàng nào</h3>
            <p>Hãy mua sắm để tạo đơn hàng đầu tiên!</p>
            <a href="index.html" class="btn btn-primary" style="margin-top:1.5rem">Mua sắm ngay</a>
          </div>`;
        return;
      }

      container.innerHTML = orders.map(order => {
        const status      = statusMap[order.status] || { label: order.status, badge: '' };
        const isCancelled = order.status === 'cancelled';
        const isPending   = order.status === 'pending';

        // Dùng order_number (số thứ tự riêng của user), fallback về id
        const displayNum = order.order_number || order.id;

        const stepIndex    = timelineSteps.findIndex(s => s.key === order.status);
        const timelineHTML = !isCancelled ? `
          <div class="status-timeline">
            ${timelineSteps.map((step, i) => {
              const cls = i < stepIndex ? 'done' : i === stepIndex ? 'current' : '';
              return `
                <div class="timeline-step ${cls}">
                  <div class="timeline-dot">${cls === 'done' ? icon('check') : icon(step.icon)}</div>
                  <div class="timeline-label">${step.label}</div>
                </div>`;
            }).join('')}
          </div>` : '';

        return `
          <div class="order-card" id="order-card-${order.id}">
            <div class="order-card-header" onclick="toggleOrder(${order.id})">
              <div>
                <div class="order-id">Đơn hàng #${displayNum}</div>
                <div class="order-date">${formatDate(order.created_at)}</div>
              </div>
              <div class="order-header-summary">
                <span class="badge ${status.badge}">${status.label}</span>
                <span class="order-header-price">${formatPrice(order.final_price)}</span>
                <span style="color:var(--text-muted)" id="arrow-${order.id}">▼</span>
              </div>
            </div>

            <div class="order-card-body" id="body-${order.id}">

              ${isCancelled ? `
                <div class="cancelled-banner">
                  ${lineIcon('x')} Đơn hàng này đã bị hủy
                </div>` : ''}

              ${timelineHTML}

              ${order.items.map(item => `
                <div class="order-item-row">
                  <img src="${item.image_url || 'https://placehold.co/55x55/f5f5f7/999?text=IMG'}"
                       alt="${item.name}"
                       onerror="this.src='https://placehold.co/55x55/f5f5f7/999?text=IMG'"
                       onclick="window.location.href='product.html?id=${item.product_id}'">
                  <div class="order-item-info">
                    <div class="order-item-name"
                         onclick="window.location.href='product.html?id=${item.product_id}'">
                      ${item.name}
                    </div>
                    <div class="order-item-meta">
                      ${item.brand || ''} · x${item.quantity} · ${formatPrice(item.unit_price)}/cái
                    </div>
                  </div>
                  <div class="order-item-price">${formatPrice(item.unit_price * item.quantity)}</div>
                </div>`).join('')}

              <div class="order-footer">
                <div>
                  ${order.voucher_code
                    ? `<div style="font-size:0.78rem;color:var(--success)">
                        ${lineIcon('ticket')} Mã: ${order.voucher_code} · Giảm ${formatPrice(order.discount_amount)}
                       </div>`
                    : ''}
                </div>
                <div class="order-total">Tổng: ${formatPrice(order.final_price)}</div>
              </div>

              <div class="order-shipping">
                ${lineIcon('box')}<strong>${order.shipping_name}</strong> · ${order.shipping_phone}<br>
                ${lineIcon('mapPin')}${order.shipping_address}
                ${order.note ? `<br>${lineIcon('note')}${order.note}` : ''}
              </div>

              ${order.status === 'done' ? `
                <div style="margin-top:1rem">
                  ${order.items.map(item => `
                    <button class="btn btn-outline btn-sm"
                            style="margin-right:0.5rem;margin-top:0.5rem"
                            onclick="window.location.href='product.html?id=${item.product_id}#reviews'">
                      ${lineIcon('star')}Đánh giá ${item.name}
                    </button>`).join('')}
                </div>` : ''}

              ${isPending ? `
                <div class="cancel-row">
                  <span class="cancel-row-hint">Chỉ có thể hủy khi đơn chưa được xác nhận</span>
                  <button class="btn-cancel-order" onclick="openCancelModal(${order.id}, ${displayNum})">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Hủy đơn hàng
                  </button>
                </div>` : ''}

            </div>
          </div>`;
      }).join('');
    }

    function toggleOrder(id) {
      const body  = document.getElementById(`body-${id}`);
      const arrow = document.getElementById(`arrow-${id}`);
      body.classList.toggle('open');
      arrow.textContent = body.classList.contains('open') ? '▲' : '▼';
    }

    // ── Cancel modal ──────────────────────────────────────
    function openCancelModal(orderId, displayNum) {
      cancelOrderId = orderId;
      document.getElementById('cancel-modal-desc').innerHTML =
        `Bạn có chắc muốn hủy <strong>Đơn hàng #${displayNum}</strong>?<br>
         Hành động này không thể hoàn tác.`;
      document.getElementById('cancel-overlay').classList.add('active');
    }

    function closeCancelModal() {
      document.getElementById('cancel-overlay').classList.remove('active');
      cancelOrderId = null;
    }

    document.getElementById('cancel-overlay').addEventListener('click', function(e) {
      if (e.target === this) closeCancelModal();
    });

    async function doCancel() {
      if (!cancelOrderId) return;
      const btn = document.getElementById('cancel-confirm-btn');
      btn.textContent = 'Đang hủy...';
      btn.disabled    = true;

      try {
        // Gọi đúng endpoint /cancel thay vì /status
        await api.patch(`/orders/${cancelOrderId}/cancel`, {});

        // Cập nhật state local — không reload trang
        const order = allOrders.find(o => o.id === cancelOrderId);
        if (order) order.status = 'cancelled';

        closeCancelModal();
        renderOrders();

        // Tự mở lại đơn vừa hủy
        setTimeout(() => {
          const body  = document.getElementById(`body-${cancelOrderId}`);
          const arrow = document.getElementById(`arrow-${cancelOrderId}`);
          if (body && !body.classList.contains('open')) {
            body.classList.add('open');
            if (arrow) arrow.textContent = '▲';
          }
        }, 100);

        toast.success('Đã hủy đơn hàng thành công!');

      } catch(e) {
        toast.error(e.message || 'Không thể hủy đơn hàng. Vui lòng thử lại!');
      } finally {
        btn.textContent = 'Hủy đơn hàng';
        btn.disabled    = false;
      }
    }

    document.addEventListener('DOMContentLoaded', loadOrders);
