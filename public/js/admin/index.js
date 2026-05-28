if (!isLoggedIn() || !['manager','staff'].includes(getUser()?.role)) {
    window.location.href = '../client/login.html';
  }

  const user = getUser();
  if (user) {
    document.getElementById('admin-name').textContent   = user.full_name || user.username;
    document.getElementById('admin-role').textContent   = user.role === 'manager' ? 'Quản lý' : 'Nhân viên';
    document.getElementById('admin-avatar').textContent = (user.full_name || user.username)[0].toUpperCase();
  }

  document.getElementById('current-date').textContent =
    new Date().toLocaleDateString('vi-VN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const STATUS = {
    pending:   { label:'Chờ xác nhận', cls:'dot-pending' },
    confirmed: { label:'Đã xác nhận',  cls:'dot-confirmed' },
    shipping:  { label:'Đang giao',    cls:'dot-shipping' },
    done:      { label:'Hoàn thành',   cls:'dot-done' },
    cancelled: { label:'Đã hủy',       cls:'dot-cancelled' },
  };

  document.addEventListener('DOMContentLoaded', async () => {
    loadNotifications();
    setInterval(loadNotifications, 60000);

    try {
      const { data: d } = await api.get('/admin/dashboard');
      const ov = d.overview;

      // ── Stats — dùng formatPrice cho tiền, formatNumber cho số nguyên
      document.getElementById('s-revenue').textContent   = formatPrice(ov.total_revenue   || 0);
      document.getElementById('s-orders').textContent    = formatNumber(ov.total_orders    || 0);
      document.getElementById('s-customers').textContent = formatNumber(ov.total_customers || 0);
      document.getElementById('s-products').textContent  = formatNumber(ov.total_products  || 0);

      // ── Order status — formatNumber
      document.getElementById('os-pending').textContent   = formatNumber(ov.pending_orders   || 0);
      document.getElementById('os-confirmed').textContent = formatNumber(ov.confirmed_orders  || 0);
      document.getElementById('os-shipping').textContent  = formatNumber(ov.shipping_orders   || 0);
      document.getElementById('os-done').textContent      = formatNumber(ov.done_orders       || 0);
      document.getElementById('os-cancelled').textContent = formatNumber(ov.cancelled_orders  || 0);

      renderRevenueChart(d.revenue_by_month    || []);
      renderCategoryChart(d.revenue_by_category || []);
      renderTopProducts(d.top_products          || []);
      renderRecentOrders(d.recent_orders        || []);
      renderLowStock(d.low_stock_products       || []);

    } catch(e) { console.error(e); }
  });

  document.addEventListener('click', e => {
    const panel = document.getElementById('notif-panel');
    const btn   = document.getElementById('notif-btn');
    if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  const toggleNotif = () => document.getElementById('notif-panel').classList.toggle('open');

  const renderRevenueChart = (data) => {
    if (!data.length) return;
    const months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
    new Chart(document.getElementById('revenueChart'), {
      type: 'bar',
      data: {
        labels:   data.map(d => `${months[d.month-1]}/${String(d.year).slice(-2)}`),
        datasets: [{
          data:            data.map(d => d.revenue || 0),
          backgroundColor: 'rgba(37,99,235,0.1)',
          borderColor:     '#2563eb',
          borderWidth:     1.5,
          borderRadius:    4,
          borderSkipped:   false,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => '  ' + formatPrice(ctx.raw) } },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#9ca3af', font: { size: 11 },
              callback: v => {
                if (v >= 1000000) return (v/1000000).toFixed(0) + 'M';
                if (v >= 1000)    return (v/1000).toFixed(0) + 'K';
                return v;
              },
            },
            grid: { color: 'rgba(0,0,0,0.04)' },
            border: { display: false },
          },
          x: {
            ticks: { color: '#9ca3af', font: { size: 11 } },
            grid:  { display: false },
            border: { display: false },
          },
        },
      },
    });
  };

  const renderCategoryChart = (data) => {
    if (!data.length) return;
    const colors = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2'];
    new Chart(document.getElementById('categoryChart'), {
      type: 'doughnut',
      data: {
        labels:   data.map(d => d.category_name),
        datasets: [{
          data:            data.map(d => d.total_revenue || 0),
          backgroundColor: colors.slice(0, data.length),
          borderWidth:     3,
          borderColor:     '#fff',
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position:'bottom', labels: { font:{ size:11 }, padding:12, color:'#6b7280' } },
          tooltip: { callbacks: { label: ctx => `  ${ctx.label}: ${formatPrice(ctx.raw)}` } },
        },
        cutout: '65%',
      },
    });
  };

  const renderTopProducts = (products) => {
    const tb = document.getElementById('top-products-table');
    if (!products.length) {
      tb.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-3);font-size:13px">Chưa có dữ liệu</td></tr>';
      return;
    }
    tb.innerHTML = products.map((p, i) => `
      <tr>
        <td><span class="rank-num">${i + 1}</span></td>
        <td>
          <div class="product-name-cell">
            <div class="name">${p.name}</div>
            <div class="brand">${p.brand || ''}</div>
          </div>
        </td>
        <td><span class="mono">${formatNumber(p.total_sold || 0)}</span></td>
        <td><span class="mono mono-bold">${formatPrice(p.total_revenue || 0)}</span></td>
      </tr>`).join('');
  };

  const renderRecentOrders = (orders) => {
    const tb = document.getElementById('recent-orders-table');
    if (!orders.length) {
      tb.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-3);font-size:13px">Chưa có đơn hàng</td></tr>';
      return;
    }
    tb.innerHTML = orders.map(o => {
      const s = STATUS[o.status] || { label: o.status, cls: '' };
      return `
        <tr style="cursor:pointer" onclick="location.href='orders.html'">
          <td><span class="mono mono-bold">#${o.id}</span></td>
          <td>
            <div style="font-weight:600;font-size:13px">${o.shipping_name}</div>
            <div style="font-size:11px;color:var(--text-3)">${o.email}</div>
          </td>
          <td><span class="mono">${formatPrice(o.final_price)}</span></td>
          <td><span class="status-dot ${s.cls}">${s.label}</span></td>
        </tr>`;
    }).join('');
  };

  const renderLowStock = (products) => {
    const tb = document.getElementById('low-stock-table');
    if (!products.length) {
      tb.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--green);font-size:13px">Tất cả sản phẩm còn hàng đầy đủ</td></tr>';
      return;
    }
    tb.innerHTML = products.map(p => `
      <tr>
        <td>
          <div style="font-weight:600;font-size:13px">${p.name}</div>
          <div style="font-size:11px;color:var(--text-3)">${p.brand || ''}</div>
        </td>
        <td style="font-size:13px;color:var(--text-2)">${p.category_name}</td>
        <td><span class="mono">${formatPrice(p.price)}</span></td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:var(--red)">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            ${formatNumber(p.stock)} còn lại
          </span>
        </td>
      </tr>`).join('');
  };

  // ── Notifications ─────────────────────────────────────────
  let notifications = [];
  let readIds = JSON.parse(localStorage.getItem('gosucore_read_notifs') || '[]');

  const loadNotifications = async () => {
    try {
      const { data: d } = await api.get('/admin/dashboard');
      notifications = [];

      const pending = d.overview.pending_orders || 0;
      if (pending > 0) notifications.push({
        id: 'pending_orders', type: 'order',
        title: `${formatNumber(pending)} đơn hàng chờ xác nhận`,
        desc:  'Cần xử lý ngay để đảm bảo trải nghiệm khách hàng',
        link:  'orders.html?status=pending',
      });

      const shipping = d.overview.shipping_orders || 0;
      if (shipping > 0) notifications.push({
        id: 'shipping_orders', type: 'order',
        title: `${formatNumber(shipping)} đơn đang được giao`,
        desc:  'Theo dõi và cập nhật trạng thái vận chuyển',
        link:  'orders.html?status=shipping',
      });

      const lowStock = d.low_stock_products || [];
      if (lowStock.length > 0) notifications.push({
        id: 'low_stock', type: 'stock',
        title: `${formatNumber(lowStock.length)} sản phẩm sắp hết hàng`,
        desc:  lowStock.slice(0,2).map(p => `${p.name} — còn ${formatNumber(p.stock)}`).join(' · '),
        link:  'products.html',
      });

      renderNotifications();
      const dot = document.getElementById('notif-dot');
      const unread = notifications.filter(n => !readIds.includes(n.id)).length;
      if (dot) dot.style.display = unread > 0 ? 'block' : 'none';

    } catch(e) {}
  };

  const renderNotifications = () => {
    const list = document.getElementById('notif-list');
    if (!notifications.length) {
      list.innerHTML = '<div class="notif-empty">Không có thông báo mới</div>';
      return;
    }
    list.innerHTML = notifications.map(n => {
      const isRead = readIds.includes(n.id);
      const icon = n.type === 'order'
        ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>`
        : `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      return `
        <div class="notif-item ${isRead ? '' : 'unread'}" onclick="goToNotif('${n.id}','${n.link}')">
          <div class="notif-icon ${n.type}">${icon}</div>
          <div class="notif-content">
            <div class="notif-title">${n.title}</div>
            <div class="notif-desc">${n.desc}</div>
          </div>
          ${!isRead ? '<div class="notif-unread-dot"></div>' : ''}
        </div>`;
    }).join('');
  };

  const goToNotif = (id, link) => {
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('gosucore_read_notifs', JSON.stringify(readIds));
    }
    location.href = link;
  };

  const markAllRead = () => {
    readIds = notifications.map(n => n.id);
    localStorage.setItem('gosucore_read_notifs', JSON.stringify(readIds));
    renderNotifications();
    document.getElementById('notif-dot').style.display = 'none';
  };
