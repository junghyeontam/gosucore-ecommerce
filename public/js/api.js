const API_BASE = 'http://localhost:3000/api';

const getToken = () => localStorage.getItem('gosucore_token');

const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw { status: response.status, message: data.message || 'Lỗi server' };
  }

  return data;
};

const api = {
  get:    (url)       => apiFetch(url),
  post:   (url, body) => apiFetch(url, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (url, body) => apiFetch(url, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (url, body) => apiFetch(url, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (url)       => apiFetch(url, { method: 'DELETE' }),
};

// ============================================================
// FORMAT HELPERS — dùng đồng nhất toàn bộ project
// ============================================================

// Số tiền VNĐ: 25.990.000 ₫
const formatPrice = (price) => {
  if (price === null || price === undefined || isNaN(price)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style:                 'currency',
    currency:              'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(price));
};

// Số nguyên có dấu chấm ngăn cách: 1.234
const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Number(num));
};

// Ngày giờ: 10/05/26 08:20
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    year:   '2-digit',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// ============================================================

const renderStars = (rating) => {
  const full  = Math.floor(rating);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
};

const toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3000) {
    this.init();
    const el = document.createElement('div');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    this.container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  },

  success: (msg) => toast.show(msg, 'success'),
  error:   (msg) => toast.show(msg, 'error'),
  info:    (msg) => toast.show(msg, 'info'),
};

const cart = {
  get() {
    return JSON.parse(localStorage.getItem('gosucore_cart') || '[]');
  },
  save(items) {
    localStorage.setItem('gosucore_cart', JSON.stringify(items));
    this.updateCount();
  },
  add(product, quantity = 1) {
    const items = this.get();
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({
        product_id: product.id,
        name:       product.name,
        price:      product.price,
        brand:      product.brand,
        image_url:  product.image_url,
        quantity,
      });
    }
    this.save(items);
    toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
  },
  remove(product_id) {
    const items = this.get().filter(i => i.product_id !== product_id);
    this.save(items);
  },
  clear() {
    localStorage.removeItem('gosucore_cart');
    this.updateCount();
  },
  total() {
    return this.get().reduce((sum, i) => sum + i.price * i.quantity, 0);
  },
  count() {
    return this.get().reduce((sum, i) => sum + i.quantity, 0);
  },
  updateCount() {
    const el = document.querySelector('.cart-count');
    if (el) el.textContent = this.count();
  },
};

const isLoggedIn    = () => !!getToken();
const getUser       = () => { const u = localStorage.getItem('gosucore_user'); return u ? JSON.parse(u) : null; };
const requireLogin  = () => { if (!isLoggedIn()) { window.location.href = '/client/login.html'; return false; } return true; };
const requireAdminRole = () => {
  const user = getUser();
  if (!user || !['manager', 'staff'].includes(user.role)) {
    window.location.href = '/client/login.html';
    return false;
  }
  return true;
};