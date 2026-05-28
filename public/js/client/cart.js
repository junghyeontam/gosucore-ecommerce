let appliedVoucher = null;

    document.addEventListener('DOMContentLoaded', () => {
      renderCart();
    });

    const renderCart = () => {
      const items     = cart.get();
      const container = document.getElementById('cart-items-container');

      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="icon"><svg viewBox="0 0 24 24"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h8.76a2 2 0 0 0 1.95-1.57L21 8H5.12"/></svg></div>
            <h3>Giỏ hàng trống</h3>
            <p>Hãy thêm sản phẩm vào giỏ hàng để tiếp tục.</p>
            <a href="index.html" class="btn btn-primary" style="margin-top:1.5rem">Mua sắm ngay</a>
          </div>`;
        document.getElementById('cart-summary-text').textContent = '0 sản phẩm';
        document.getElementById('checkout-btn').disabled = true;
        updateSummary();
        return;
      }

      document.getElementById('cart-summary-text').textContent = `${cart.count()} sản phẩm`;

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <span style="font-size:0.83rem;color:var(--text-secondary)">${items.length} loại sản phẩm</span>
          <button class="btn btn-sm" style="color:var(--danger);background:none;border:none;cursor:pointer;font-size:0.83rem" onclick="clearCart()">Xóa tất cả</button>
        </div>
        ${items.map(item => `
          <div class="cart-item" id="item-${item.product_id}">
            <div class="cart-item-img" onclick="window.location.href='product.html?id=${item.product_id}'">
              <img src="${item.image_url || 'https://placehold.co/90x90/f5f5f7/999?text=IMG'}"
                   alt="${item.name}"
                   onerror="this.src='https://placehold.co/90x90/f5f5f7/999?text=IMG'">
            </div>
            <div class="cart-item-info">
              <div class="cart-item-brand">${item.brand || ''}</div>
              <div class="cart-item-name" onclick="window.location.href='product.html?id=${item.product_id}'">${item.name}</div>
              <div class="cart-item-price">${formatPrice(item.price)} / cái</div>
            </div>
            <div class="cart-item-actions">
              <div class="cart-item-subtotal">${formatPrice(item.price * item.quantity)}</div>
              <div class="cart-qty-control">
                <button class="cart-qty-btn" onclick="updateQty(${item.product_id}, ${item.quantity - 1})">−</button>
                <span class="cart-qty-num">${item.quantity}</span>
                <button class="cart-qty-btn" onclick="updateQty(${item.product_id}, ${item.quantity + 1})">+</button>
              </div>
              <button class="remove-btn" onclick="removeItem(${item.product_id})">Xóa</button>
            </div>
          </div>`).join('')}`;

      updateSummary();
    };

    const updateQty = (product_id, qty) => {
      if (qty <= 0) {
        removeItem(product_id);
        return;
      }
      const items = cart.get();
      const item  = items.find(i => i.product_id === product_id);
      if (item) {
        item.quantity = qty;
        cart.save(items);
        renderCart();
      }
    };

    const removeItem = (product_id) => {
      cart.remove(product_id);
      renderCart();
      toast.info('Đã xóa sản phẩm khỏi giỏ hàng.');
    };

    const clearCart = () => {
      if (!confirm('Xóa toàn bộ giỏ hàng?')) return;
      cart.clear();
      renderCart();
    };

    const updateSummary = () => {
      const subtotal = cart.total();
      let discount   = 0;

      if (appliedVoucher) {
        discount = subtotal * appliedVoucher.discount_percent / 100;
      }

      const total = subtotal - discount;

      document.getElementById('subtotal').textContent   = formatPrice(subtotal);
      document.getElementById('total-price').textContent = formatPrice(total);

      const discountRow = document.getElementById('discount-row');
      if (discount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('discount-amount').textContent = `-${formatPrice(discount)}`;
      } else {
        discountRow.style.display = 'none';
      }
    };

    const applyVoucher = async () => {
      const code      = document.getElementById('voucher-code').value.trim();
      const resultEl  = document.getElementById('voucher-result');

      if (!code) {
        resultEl.className = 'voucher-result error';
        resultEl.textContent = 'Vui lòng nhập mã giảm giá.';
        return;
      }

      try {
        const data = await api.post('/vouchers/apply', {
          code,
          total_price: cart.total(),
        });

        appliedVoucher = data.data;
        resultEl.className = 'voucher-result success';
        resultEl.textContent = `${data.message} — Tiết kiệm ${formatPrice(data.data.discount_amount)}`;
        updateSummary();

      } catch (e) {
        appliedVoucher = null;
        resultEl.className = 'voucher-result error';
        resultEl.textContent = e.message;
        updateSummary();
      }
    };

    const goCheckout = () => {
      if (cart.count() === 0) {
        toast.error('Giỏ hàng trống!');
        return;
      }
      if (!isLoggedIn()) {
        toast.info('Vui lòng đăng nhập để thanh toán.');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
      }
      // Lưu voucher vào session
      if (appliedVoucher) {
        sessionStorage.setItem('applied_voucher', JSON.stringify(appliedVoucher));
        sessionStorage.setItem('voucher_code', document.getElementById('voucher-code').value.trim());
      } else {
        sessionStorage.removeItem('applied_voucher');
        sessionStorage.removeItem('voucher_code');
      }
      window.location.href = 'checkout.html';
    };
