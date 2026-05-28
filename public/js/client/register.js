if (isLoggedIn()) window.location.href = 'index.html';

    const handleRegister = async () => {
      const username         = document.getElementById('username').value.trim();
      const full_name        = document.getElementById('full_name').value.trim();
      const email            = document.getElementById('email').value.trim();
      const phone            = document.getElementById('phone').value.trim();
      const password         = document.getElementById('password').value;
      const confirm_password = document.getElementById('confirm_password').value;
      const btn              = document.getElementById('register-btn');

      if (!username || !email || !password) {
        showError('Vui lòng điền đủ username, email và mật khẩu.');
        return;
      }
      if (password.length < 6) {
        showError('Mật khẩu phải có ít nhất 6 ký tự.');
        return;
      }
      if (password !== confirm_password) {
        showError('Mật khẩu xác nhận không khớp.');
        return;
      }

      btn.textContent = 'Đang tạo tài khoản...';
      btn.disabled    = true;

      try {
        const data = await api.post('/auth/register', {
          username, full_name, email, phone, password,
        });

        localStorage.setItem('gosucore_token', data.token);
        localStorage.setItem('gosucore_user',  JSON.stringify(data.user));

        showSuccess('Đăng ký thành công! Đang chuyển hướng...');
        setTimeout(() => window.location.href = 'index.html', 1500);

      } catch (err) {
        showError(err.message || 'Đăng ký thất bại.');
        btn.textContent = 'Tạo tài khoản';
        btn.disabled    = false;
      }
    };

    // Enter để submit
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleRegister();
    });

    const showError = (msg) => {
      const el = document.getElementById('error-msg');
      el.textContent = msg;
      el.classList.add('show');
      document.getElementById('success-msg').classList.remove('show');
    };

    const showSuccess = (msg) => {
      const el = document.getElementById('success-msg');
      el.textContent = msg;
      el.classList.add('show');
      document.getElementById('error-msg').classList.remove('show');
    };
