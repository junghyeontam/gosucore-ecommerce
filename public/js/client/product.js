const params    = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    let quantity    = 1;
    let product     = null;
    const uiIcon = {
      alert: '<svg viewBox="0 0 24 24"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
      check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
      x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
      gift: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13"/><path d="M3 12h18"/><path d="M7.5 8A2.5 2.5 0 1 1 12 5.5V8"/><path d="M16.5 8A2.5 2.5 0 1 0 12 5.5V8"/></svg>',
    };
    const smallIcon = (name) => `<span class="inline-svg-icon">${uiIcon[name]}</span>`;

    if (!productId) window.location.href = 'index.html';

    document.addEventListener('DOMContentLoaded', async () => {
      await loadProduct();
      await loadReviews();
    });

    const loadProduct = async () => {
      try {
        const data = await api.get(`/products/${productId}`);
        product = data.data;

        document.title = `${product.name} - GosuCore`;
        document.getElementById('breadcrumb-name').textContent = product.name;

        renderProduct(product);
      } catch (e) {
        document.getElementById('product-detail').innerHTML = `
          <div class="empty-state">
            <div class="icon">${uiIcon.alert}</div>
            <h3>Không tìm thấy sản phẩm</h3>
            <a href="index.html" class="btn btn-primary" style="margin-top:1rem">Về trang chủ</a>
          </div>`;
      }
    };

    const renderProduct = (p) => {
      const specs = p.specs ? JSON.parse(p.specs) : {};
      const specLabels = {
        sensor: 'Cảm biến', dpi_max: 'DPI tối đa', dpi_min: 'DPI tối thiểu',
        buttons: 'Số nút', wireless: 'Không dây', battery_hours: 'Pin (giờ)',
        weight: 'Trọng lượng', rgb: 'RGB', connection: 'Kết nối',
        switch: 'Switch', layout: 'Layout', polling_rate: 'Polling Rate',
        driver: 'Driver', surround: 'Âm thanh', mic: 'Micro',
        size: 'Kích thước', resolution: 'Độ phân giải', panel: 'Tấm nền',
        refresh_rate: 'Tần số quét', response_time: 'Thời gian phản hồi',
        surface: 'Bề mặt', material: 'Chất liệu', max_load: 'Tải trọng',
        recline: 'Góc ngả', warranty: 'Bảo hành',
      };

      const specsHTML = Object.entries(specs).map(([k, v]) => `
        <div class="spec-item">
          <div class="spec-key">${specLabels[k] || k}</div>
          <div class="spec-value">${v === true ? `${smallIcon('check')}Có` : v === false ? `${smallIcon('x')}Không` : v}</div>
        </div>`).join('');

      const combosHTML = p.combos && p.combos.length > 0 ? `
        <div class="combo-section">
          <h3>${smallIcon('gift')}Mua kèm được giảm giá</h3>
          ${p.combos.map(c => `
            <div class="combo-item" onclick="window.location.href='product.html?id=${c.id}'">
              <img src="${c.image_url}" alt="${c.name}"
                   onerror="this.src='https://placehold.co/50x50/f5f5f7/999?text=IMG'">
              <div class="combo-info">
                <div class="combo-name">${c.name}</div>
                <div class="combo-discount">Giảm ${c.discount_percent}% khi mua kèm</div>
              </div>
              <div style="font-weight:700;font-size:0.875rem">${formatPrice(c.price)}</div>
            </div>`).join('')}
        </div>` : '';

      document.getElementById('product-detail').innerHTML = `
        <div class="product-img-wrap">
          <img src="${p.image_url || 'https://placehold.co/400x400/f5f5f7/999?text=No+Image'}"
               alt="${p.name}"
               onerror="this.src='https://placehold.co/400x400/f5f5f7/999?text=No+Image'">
        </div>
        <div class="product-info">
          <div class="product-brand">${p.brand || ''}</div>
          <h1 class="product-title">${p.name}</h1>
          <div class="product-rating-row">
            <span class="stars">${renderStars(p.avg_rating)}</span>
            <span class="product-avg-rating">${Number(p.avg_rating).toFixed(1)}</span>
            <span style="color:var(--text-muted);font-size:0.85rem">(${p.review_count} đánh giá)</span>
          </div>
          <div class="product-price-section">
            <div class="product-price-big">${formatPrice(p.price)}</div>
            <div class="product-stock-info ${p.stock <= 5 ? 'low' : ''}">
              ${p.stock <= 0 ? `${smallIcon('x')}Hết hàng` : p.stock <= 5 ? `${smallIcon('alert')}Chỉ còn ${p.stock} sản phẩm` : `${smallIcon('check')}Còn hàng (${p.stock} sản phẩm)`}
            </div>
          </div>

          ${p.description ? `<p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.7;margin-bottom:1.5rem">${p.description}</p>` : ''}

          <div class="quantity-control">
            <span style="font-size:0.85rem;font-weight:500;color:var(--text-secondary)">Số lượng:</span>
            <button class="qty-btn" onclick="changeQty(-1)">−</button>
            <span class="qty-value" id="qty-display">1</span>
            <button class="qty-btn" onclick="changeQty(1)">+</button>
          </div>

          <div class="product-actions">
            <button class="btn btn-dark btn-full btn-lg" onclick="addToCart()" ${p.stock <= 0 ? 'disabled' : ''}>
              ${p.stock <= 0 ? 'Hết hàng' : '<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;vertical-align:-3px;margin-right:6px"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h8.76a2 2 0 0 0 1.95-1.57L21 8H5.12"/></svg>Thêm vào giỏ hàng'}
            </button>
            <button class="btn btn-primary btn-full btn-lg" onclick="buyNow()" ${p.stock <= 0 ? 'disabled' : ''}>
              Mua ngay
            </button>
          </div>

          ${specsHTML ? `
            <div class="specs-section">
              <h3>Thông số kỹ thuật</h3>
              <div class="specs-grid">${specsHTML}</div>
            </div>` : ''}

          ${combosHTML}
        </div>`;
    };

    const changeQty = (delta) => {
      quantity = Math.max(1, Math.min(product.stock, quantity + delta));
      document.getElementById('qty-display').textContent = quantity;
    };

    const addToCart = () => {
      if (!product) return;
      cart.add(product, quantity);
      cart.updateCount();
    };

    const buyNow = () => {
      if (!product) return;
      cart.add(product, quantity);
      cart.updateCount();
      window.location.href = 'cart.html';
    };

    // Load reviews
    const loadReviews = async () => {
      try {
        const data = await api.get(`/reviews/${productId}`);
        const { stats, data: reviews } = data;

        document.getElementById('reviews-section').style.display = 'block';

        // Rating overview
        const total = stats.total_reviews;
        document.getElementById('rating-overview').innerHTML = `
          <div class="rating-big">
            <div class="num">${Number(stats.avg_rating).toFixed(1)}</div>
            <div class="stars">${renderStars(stats.avg_rating)}</div>
            <p>${total} đánh giá</p>
          </div>
          <div class="rating-bars">
            ${[5,4,3,2,1].map(star => {
              const count = stats[`star_${star}`] || 0;
              const pct   = total > 0 ? (count / total * 100) : 0;
              return `
                <div class="rating-bar-item">
                  <span>${star} ★</span>
                  <div class="bar-track">
                    <div class="bar-fill" style="width:${pct}%"></div>
                  </div>
                  <span style="font-size:0.75rem;color:var(--text-muted);width:25px">${count}</span>
                </div>`;
            }).join('')}
          </div>`;

        // Reviews list
        if (reviews.length === 0) {
          document.getElementById('reviews-list').innerHTML = `
            <div style="color:var(--text-secondary);font-size:0.875rem;padding:1rem 0">
              Chưa có đánh giá nào. Hãy là người đầu tiên!
            </div>`;
        } else {
          document.getElementById('reviews-list').innerHTML =
            reviews.map(r => `
              <div class="review-card">
                <div class="review-header">
                  <div>
                    <span class="reviewer-name">${r.full_name || r.username}</span>
                    <span class="stars" style="margin-left:0.5rem">${renderStars(r.rating)}</span>
                  </div>
                  <span class="review-date">${formatDate(r.created_at)}</span>
                </div>
                ${r.comment ? `<div class="review-comment">${r.comment}</div>` : ''}
              </div>`).join('');
        }

        // Form viết review (nếu đã đăng nhập)
        if (isLoggedIn()) {
          document.getElementById('review-form-section').innerHTML = `
            <div style="margin-top:2rem;padding-top:2rem;border-top:1px solid var(--border-light)">
              <h3 style="font-size:1rem;font-weight:700;margin-bottom:1rem">Viết đánh giá của bạn</h3>
              <div style="display:flex;gap:0.5rem;margin-bottom:1rem" id="star-select">
                ${[1,2,3,4,5].map(s => `
                  <span style="font-size:1.8rem;cursor:pointer;color:var(--border)"
                    onmouseover="hoverStar(${s})"
                    onmouseout="resetStars()"
                    onclick="selectStar(${s})"
                    data-star="${s}">★</span>`).join('')}
              </div>
              <div class="form-group">
                <textarea id="review-comment" placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..." rows="3"></textarea>
              </div>
              <button class="btn btn-primary" onclick="submitReview()">Gửi đánh giá</button>
            </div>`;
        }

      } catch (e) {
        console.error('Lỗi load reviews:', e);
      }
    };

    let selectedStar = 0;

    const hoverStar = (n) => {
      document.querySelectorAll('#star-select span').forEach((el, i) => {
        el.style.color = i < n ? 'var(--warning)' : 'var(--border)';
      });
    };

    const resetStars = () => {
      document.querySelectorAll('#star-select span').forEach((el, i) => {
        el.style.color = i < selectedStar ? 'var(--warning)' : 'var(--border)';
      });
    };

    const selectStar = (n) => {
      selectedStar = n;
      resetStars();
    };

    const submitReview = async () => {
      if (!selectedStar) {
        toast.error('Vui lòng chọn số sao!');
        return;
      }

      const comment = document.getElementById('review-comment').value;

      try {
        await api.post('/reviews', {
          product_id: parseInt(productId),
          rating: selectedStar,
          comment,
        });
        toast.success('Đánh giá của bạn đã được gửi!');
        setTimeout(() => location.reload(), 1500);
      } catch (e) {
        toast.error(e.message);
      }
    };
