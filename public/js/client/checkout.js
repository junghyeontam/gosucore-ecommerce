if (!isLoggedIn()) window.location.href = 'login.html';

    const items          = cart.get();
    const appliedVoucher = JSON.parse(sessionStorage.getItem('applied_voucher') || 'null');
    const voucherCode    = sessionStorage.getItem('voucher_code') || null;

    if (items.length === 0) window.location.href = 'cart.html';

    // ── DOM Ready ─────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
      const user = getUser();
      if (user) {
        document.getElementById('shipping_name').value  = user.full_name || '';
        document.getElementById('shipping_phone').value = user.phone || '';
        document.getElementById('shipping_email').value = user.email || '';
      }
      renderItems();
      renderSummary();
      bindPaymentMethods();
    });

    const bindPaymentMethods = () => {
      document.querySelectorAll('.payment-method-box').forEach(box => {
        const input = box.querySelector('input[name="payment_method"]');
        box.addEventListener('click', () => {
          input.checked = true;
          document.querySelectorAll('.payment-method-box').forEach(item => {
            item.classList.toggle('selected', item === box);
          });
        });
      });
    };

    const renderItems = () => {
      document.getElementById('item-count').textContent = cart.count();
      document.getElementById('order-items').innerHTML = items.map(item => `
        <div class="order-item-mini">
          <img src="${item.image_url || 'https://placehold.co/50x50/f5f5f7/999?text=IMG'}"
               alt="${item.name}"
               onerror="this.src='https://placehold.co/50x50/f5f5f7/999?text=IMG'">
          <div class="order-item-mini-info">
            <div class="order-item-mini-name">${item.name}</div>
            <div class="order-item-mini-qty">x${item.quantity}</div>
          </div>
          <div class="order-item-mini-price">${formatPrice(item.price * item.quantity)}</div>
        </div>`).join('');
    };

    const renderSummary = () => {
      const subtotal = cart.total();
      let discount   = 0;

      if (appliedVoucher) {
        discount = Math.round(subtotal * appliedVoucher.discount_percent / 100);
        document.getElementById('s-discount-row').style.display = 'flex';
        document.getElementById('s-discount').textContent       = `-${formatPrice(discount)}`;
        document.getElementById('voucher-info').style.display   = 'block';
        document.getElementById('voucher-info').textContent     =
          `Mã "${voucherCode}" giảm ${appliedVoucher.discount_percent}%`;
      }

      document.getElementById('s-subtotal').textContent = formatPrice(subtotal);
      document.getElementById('s-total').textContent    = formatPrice(subtotal - discount);
    };

    // ── Đặt hàng ─────────────────────────────────────────
    const placeOrder = async () => {
      const shipping_name    = document.getElementById('shipping_name').value.trim();
      const shipping_phone   = document.getElementById('shipping_phone').value.trim();
      const shipping_address = document.getElementById('shipping_address').value.trim();
      const note             = document.getElementById('note').value.trim();
      const payment_method   = document.querySelector('input[name="payment_method"]:checked')?.value || 'cod';
      const btn              = document.getElementById('place-btn');

      if (!shipping_name || !shipping_phone || !shipping_address) {
        toast.error('Vui lòng điền đầy đủ thông tin nhận hàng!');
        return;
      }

      btn.textContent = 'Đang xử lý...';
      btn.disabled    = true;

      try {
        await api.post('/orders', {
          items: items.map(i => ({
            product_id: i.product_id,
            quantity:   i.quantity,
          })),
          voucher_code:     voucherCode || undefined,
          shipping_name,
          shipping_phone,
          shipping_address,
          note:             note || undefined,
          payment_method,
        });

        // Xóa giỏ hàng & voucher
        cart.clear();
        sessionStorage.removeItem('applied_voucher');
        sessionStorage.removeItem('voucher_code');

        // Hiện thành công
        document.getElementById('success-overlay').style.display = 'flex';

      } catch(e) {
        toast.error(e.message || 'Đặt hàng thất bại. Vui lòng thử lại!');
        btn.textContent = 'Đặt hàng ngay';
        btn.disabled    = false;
      }
    };
