// public/js/auth.js
// Xử lý đăng nhập / đăng xuất trên navbar

document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  cart.updateCount();
});

const updateNavbar = () => {
  const user = getUser();
  const authArea = document.getElementById('auth-area');
  if (!authArea) return;

  if (user) {
    authArea.innerHTML = `
      <span style="color: var(--text-secondary); font-size: 0.85rem;">
        Xin chào, <strong style="color: var(--text-primary)">${user.full_name || user.username}</strong>
      </span>
      ${user.role !== 'customer' ? `<a href="/admin/index.html" class="btn btn-outline btn-sm">Admin</a>` : ''}
      <button onclick="logout()" class="btn btn-outline btn-sm">Đăng xuất</button>
    `;
  } else {
    authArea.innerHTML = `
      <a href="/client/login.html"   class="btn btn-outline btn-sm">Đăng nhập</a>
      <a href="/client/register.html" class="btn btn-primary btn-sm">Đăng ký</a>
    `;
  }
};

const logout = () => {
  localStorage.removeItem('gosucore_token');
  localStorage.removeItem('gosucore_user');
  localStorage.removeItem('gosucore_cart');
  window.location.href = '/client/index.html';
};