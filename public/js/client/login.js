// Nếu đã đăng nhập rồi thì redirect
    if (isLoggedIn()) window.location.href = 'index.html';

    // Enter để đăng nhập
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });

    const handleLogin = async () => {
      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn      = document.getElementById('login-btn');
      const errorEl  = document.getElementById('error-msg');

      if (!email || !password) {
        showError('Vui lòng nhập email và mật khẩu.');
        return;
      }

      btn.textContent = 'Đang đăng nhập...';
      btn.disabled = true;
      errorEl.classList.remove('show');

      try {
        const data = await api.post('/auth/login', { email, password });

        // Lưu token và user info
        localStorage.setItem('gosucore_token', data.token);
        localStorage.setItem('gosucore_user', JSON.stringify(data.user));

        // Redirect theo role
        if (data.user.role === 'manager' || data.user.role === 'staff') {
          window.location.href = '../admin/index.html';
        } else {
          window.location.href = 'index.html';
        }

      } catch (err) {
        showError(err.message || 'Đăng nhập thất bại.');
        btn.textContent = 'Đăng nhập';
        btn.disabled = false;
      }
    };

    const showError = (msg) => {
      const el = document.getElementById('error-msg');
      el.textContent = msg;
      el.classList.add('show');
    };
