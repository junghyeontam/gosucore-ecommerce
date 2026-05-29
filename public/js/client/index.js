let currentPage     = 1;
    let currentCategory = null;
    let currentCatName  = 'Tất cả sản phẩm';
    let searchTimer     = null;
    let isLoading       = false;

    const catIcons = {
      'Chuột Gaming': `<svg viewBox="0 0 24 24" class="icon"><rect x="8" y="2" width="8" height="20" rx="4"/><path d="M12 6v3"/></svg>`,
      'Bàn phím Gaming': `<svg viewBox="0 0 24 24" class="icon"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 11h.01M10 11h.01M13 11h.01M16 11h.01"/></svg>`,
      'Tai nghe Gaming': `<svg viewBox="0 0 24 24" class="icon"><path d="M4 13a8 8 0 0 1 16 0"/><rect x="4" y="13" width="3" height="6" rx="1.5"/><rect x="17" y="13" width="3" height="6" rx="1.5"/></svg>`,
      'Màn hình Gaming': `<svg viewBox="0 0 24 24" class="icon"><rect x="4" y="5" width="16" height="10" rx="2"/><path d="M10 19h4"/></svg>`,
      'Lót chuột': `<svg viewBox="0 0 24 24" class="icon"><rect x="4" y="6" width="16" height="12" rx="2"/></svg>`,
      'Ghế Gaming': `<svg viewBox="0 0 24 24" class="icon"><rect x="9" y="3" width="6" height="8" rx="2"/><path d="M7 11h10M10 11v6M14 11v6"/></svg>`,
    };

    const openSearch = () => { document.getElementById('navbar-search').classList.add('open'); setTimeout(() => document.getElementById('navbar-search-input').focus(), 250); };
    const closeSearch = () => { document.getElementById('navbar-search').classList.remove('open'); document.getElementById('navbar-search-input').value = ''; document.getElementById('search').value = ''; };
    const navbarSearch = (val) => {
      document.getElementById('search').value = val;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { currentPage = 1; loadProducts(); const s = document.getElementById('products-section'); window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 120, behavior:'smooth' }); }, 450);
    };
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSearch();
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); openSearch(); }
    });

    document.addEventListener('DOMContentLoaded', async () => {
      document.getElementById('cat-all').onclick = () => selectAll();
      await loadCategories();
      await loadBrands();
      const params = new URLSearchParams(window.location.search);
      if (params.get('category')) currentCategory = params.get('category');
      await loadProducts();
      loadBestSellers();
    });

    const selectAll = () => {
      if (isLoading) return;
      currentCategory = null; currentCatName = 'Tất cả sản phẩm'; currentPage = 1;
      window.history.pushState({}, '', window.location.pathname);
      setActiveNav(document.getElementById('cat-all'));
      document.getElementById('section-title').textContent = 'Tất cả sản phẩm';
      scrollAndLoad();
    };

    const loadCategories = async () => {
      try {
        const data = await api.get('/products/categories');
        const nav  = document.getElementById('category-nav');
        data.data.forEach(cat => {
          const item = document.createElement('div');
          item.className  = 'category-nav-item'; item.dataset.id = cat.id;
          item.innerHTML  = `<div class="cat-icon">${catIcons[cat.name] || '<svg viewBox="0 0 24 24" class="icon"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>'}</div><span>${cat.name}</span>`;
          item.onclick = () => filterCategory(cat.id, cat.name, item);
          nav.appendChild(item);
          if (String(cat.id) === String(currentCategory)) { currentCatName = cat.name; setTimeout(() => setActiveNav(item), 50); }
        });
      } catch(e) { console.error(e); }
    };

    const loadBrands = async () => {
      try {
        const data = await api.get('/products/brands');
        const sel  = document.getElementById('brand');
        data.data.forEach(b => {
          const option = document.createElement('option');
          option.value = b.brand;
          option.textContent = b.brand;
          sel.appendChild(option);
        });
      } catch(e) {}
    };

    const setActiveNav = (el) => { document.querySelectorAll('.category-nav-item').forEach(i => i.classList.remove('active')); el.classList.add('active'); };

    const filterCategory = (id, name, el) => {
      if (isLoading) return;
      currentCategory = id; currentCatName = name; currentPage = 1;
      window.history.pushState({}, '', `${window.location.pathname}?category=${id}`);
      // highlight matching category nav item (el may be null when called from footer)
      document.querySelectorAll('.category-nav-item').forEach(item => {
        if (String(item.dataset.id) === String(id)) { setActiveNav(item); }
      });
      document.getElementById('section-title').textContent = name;
      // always scroll to products section (important when called from footer)
      const s = document.getElementById('products-section');
      const top = s.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: 'smooth' });
      setTimeout(loadProducts, 480);
    };

    const clickNavCategory = (id, name) => {
      if (isLoading) return;
      currentCategory = id; currentCatName = name; currentPage = 1;
      window.history.pushState({}, '', `${window.location.pathname}?category=${id}`);
      document.querySelectorAll('.category-nav-item').forEach(item => { if (String(item.dataset.id) === String(id)) { setActiveNav(item); item.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' }); } });
      document.getElementById('section-title').textContent = name;
      scrollAndLoad();
    };

    const filterByBrand = (brandName) => {
      document.getElementById('brand').value = brandName; currentPage = 1; scrollAndLoad();
    };

    const scrollAndLoad = () => {
      const s = document.getElementById('products-section');
      const top = s.getBoundingClientRect().top + window.scrollY - 120;
      if (window.scrollY < top - 10) { window.scrollTo({ top, behavior:'smooth' }); setTimeout(loadProducts, 480); }
      else loadProducts();
    };

    const debounceSearch = () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { currentPage = 1; loadProducts(); }, 450); };

    const renderSkeleton = () => `<div class="products-grid">${Array(8).fill('').map(() => `<div style="border-radius:var(--radius-lg);overflow:hidden;background:var(--bg-secondary)"><div class="skeleton" style="height:200px"></div><div style="padding:1.25rem"><div class="skeleton" style="height:9px;width:38%;margin-bottom:0.6rem"></div><div class="skeleton" style="height:13px;width:85%;margin-bottom:0.6rem"></div><div class="skeleton" style="height:9px;width:52%;margin-bottom:1rem"></div><div class="skeleton" style="height:16px;width:44%"></div></div></div>`).join('')}</div>`;

    const loadProducts = async () => {
      if (isLoading) return; isLoading = true;
      const container = document.getElementById('products-container'); container.innerHTML = renderSkeleton();
      const search = document.getElementById('search').value, brand = document.getElementById('brand').value,
            min_price = document.getElementById('min_price').value, max_price = document.getElementById('max_price').value,
            sort = document.getElementById('sort').value;
      let url = `/products?page=${currentPage}&limit=12&sort=${sort}`;
      if (currentCategory) url += `&category=${currentCategory}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (brand) url += `&brand=${encodeURIComponent(brand)}`;
      if (min_price) url += `&min_price=${min_price}`;
      if (max_price) url += `&max_price=${max_price}`;
      try {
        const data = await api.get(url);
        const { data: products, pagination } = data;
        document.getElementById('section-title').textContent = currentCatName;
        document.getElementById('product-count').textContent = `${pagination.total} sản phẩm`;
        if (!products.length) { container.innerHTML = `<div class="empty-state"><div class="icon"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div><h3>Không tìm thấy sản phẩm</h3><p>Thử thay đổi bộ lọc hoặc từ khóa khác.</p><button class="btn btn-primary" style="margin-top:1rem" onclick="selectAll()">Xem tất cả</button></div>`; document.getElementById('pagination').innerHTML = ''; return; }
        await new Promise(r => setTimeout(r, 120));
        container.innerHTML = `<div class="products-grid">${products.map(renderProductCard).join('')}</div>`;
        renderPagination(pagination);
      } catch(e) { container.innerHTML = `<div class="empty-state"><div class="icon"><svg viewBox="0 0 24 24"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg></div><h3>Lỗi tải sản phẩm</h3><p>${e.message}</p></div>`; }
      finally { isLoading = false; }
    };

    const renderProductCard = (p, index) => {
      const stars = renderStars(p.avg_rating || 0), price = formatPrice(p.price), lowStock = p.stock <= 5;
      return `<div class="product-card" style="animation-delay:${(index||0)*0.04}s" onclick="window.location.href='product.html?id=${p.id}'">
        <div class="product-card-img-wrap"><img class="product-card-img" src="${p.image_url || 'https://placehold.co/300x200/f5f5f7/999?text=No+Image'}" alt="${p.name}" onerror="this.src='https://placehold.co/300x200/f5f5f7/999?text=No+Image'" loading="lazy"></div>
        <div class="product-card-body">
          <div class="product-card-brand">${p.brand || ''}</div>
          <div class="product-card-name">${p.name}</div>
          <div class="product-card-rating"><span class="stars">${stars}</span><span class="rating-count">(${p.review_count})</span></div>
          <div class="product-card-footer"><div class="product-price">${price}</div><div class="product-stock ${lowStock?'low':''}">${lowStock ? `Còn ${p.stock}` : 'Còn hàng'}</div></div>
          <button class="btn btn-dark btn-full btn-sm" style="margin-top:0.75rem" onclick="event.stopPropagation();addToCartFromList(${JSON.stringify(p).replace(/"/g,'&quot;')})">Thêm vào giỏ</button>
        </div></div>`;
    };

    const addToCartFromList = (p) => { cart.add(p,1); cart.updateCount(); };

    const renderPagination = ({ page, total_pages }) => {
      const el = document.getElementById('pagination');
      if (total_pages <= 1) { el.innerHTML = ''; return; }
      let h = '';
      if (page > 1) h += `<button class="btn btn-light btn-sm" onclick="changePage(${page-1})">Trước</button>`;
      for (let i = 1; i <= total_pages; i++) {
        if (i === page) h += `<button class="btn btn-primary btn-sm">${i}</button>`;
        else if (Math.abs(i-page) <= 2) h += `<button class="btn btn-light btn-sm" onclick="changePage(${i})">${i}</button>`;
      }
      if (page < total_pages) h += `<button class="btn btn-light btn-sm" onclick="changePage(${page+1})">Tiếp</button>`;
      el.innerHTML = h;
    };

    const changePage = (p) => { currentPage = p; const s = document.getElementById('products-section'); window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 120, behavior:'smooth' }); setTimeout(loadProducts, 400); };
    const scrollToProducts = () => {
      const s = document.getElementById('products-section');
      if (!s) return;
      const top = s.offsetTop - 120;
      window.scrollTo({ top, behavior: 'smooth' });
    };
    const goToProduct = (id) => {
      window.location.href = `product.html?id=${id}`;
    };


    /* ═══ BEST SELLERS ═══ */
    const loadBestSellers = async () => {
  try {
    const data     = await api.get('/products?limit=10&sort=best_selling');
    const products = data.data || [];
    if (!products.length) return;

    const rankBadgeClass = ['r1','r2','r3'];

    // ── Top 3 podium ──
    const podium = document.getElementById('bs-podium');
    podium.innerHTML = products.slice(0, 3).map((p, i) => {
      const sold  = p.total_sold || 0;
      const stars = renderStars(p.avg_rating || 0);
      return `
        <div class="bs-podium-card bs-rank-${i+1}" onclick="window.location.href='product.html?id=${p.id}'">
          <span class="bs-rank-badge ${rankBadgeClass[i]}">${i + 1}</span>
          ${i===0 ? '<span class="bs-hot-tag">HOT</span>' : ''}
          <div class="bs-podium-img-wrap">
            <img class="bs-podium-img"
                 src="${p.image_url || 'https://placehold.co/300x200/f5f5f7/999?text=No+Image'}"
                 alt="${p.name}"
                 onerror="this.src='https://placehold.co/300x200/f5f5f7/999?text=No+Image'"
                 loading="lazy">
          </div>
          <div class="bs-podium-body">
            <div class="bs-podium-brand">${p.brand || ''}</div>
            <div class="bs-podium-name">${p.name}</div>
            <div class="bs-podium-stars">
              <span class="bs-stars">${stars}</span>
              <span class="bs-review">(${p.review_count || 0})</span>
            </div>
            <div class="bs-podium-footer">
              <div class="bs-podium-price">${formatPrice(p.price)}</div>
              <div class="bs-podium-sold">
                ${sold > 0 ? `Đã bán ${sold.toLocaleString()}` : 'Chưa có lượt bán'}
              </div>
            </div>
            <button class="bs-add-btn"
              onclick="event.stopPropagation();addToCartFromList(${JSON.stringify(p).replace(/"/g,'&quot;')})">
              Thêm vào giỏ hàng
            </button>
          </div>
        </div>`;
    }).join('');

    // ── Ranks 4–10 scroll row ──
    const row = document.getElementById('bs-scroll-row');
    if (products.length > 3) {
      row.innerHTML = products.slice(3).map((p, i) => {
        const rank = i + 4;
        const sold = p.total_sold || 0;
        return `
          <div class="bs-row-card" onclick="window.location.href='product.html?id=${p.id}'">
            <span class="bs-row-rank">${rank}</span>
            <div class="bs-row-img-wrap">
              <img class="bs-row-img"
                   src="${p.image_url || 'https://placehold.co/200x130/f5f5f7/999?text=No+Image'}"
                   alt="${p.name}"
                   onerror="this.src='https://placehold.co/200x130/f5f5f7/999?text=No+Image'"
                   loading="lazy">
            </div>
            <div class="bs-row-body">
              <div class="bs-row-brand">${p.brand || ''}</div>
              <div class="bs-row-name">${p.name}</div>
              <div class="bs-row-price">${formatPrice(p.price)}</div>
              ${sold > 0 ? `<div style="font-size:0.65rem;color:var(--text-muted);margin-top:3px">Đã bán ${sold.toLocaleString()}</div>` : ''}
            </div>
          </div>`;
      }).join('');
    }

  } catch(e) {
    console.error('Best sellers load error:', e);
  }
};

    /* ═══ HERO SLIDESHOW ═══ */
    let currentSlide = 0, slideInterval = null;
    const totalSlides = 4;
    const goToSlide = (n) => {
      document.querySelectorAll('.hero-main-banner .hero-slide').forEach((s, i) => s.classList.toggle('active', i === n));
      document.querySelectorAll('.hero-main-banner .hero-dot').forEach((d, i) => d.classList.toggle('active', i === n));
      currentSlide = n;
    };
    const nextSlide = () => goToSlide((currentSlide + 1) % totalSlides);
    const prevSlide = () => goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
    const startSlideshow = () => { slideInterval = setInterval(nextSlide, 3000); };
    const stopSlideshow  = () => clearInterval(slideInterval);
    const heroBanner = document.querySelector('.hero-main-banner');
    if (heroBanner) {
      heroBanner.addEventListener('mouseenter', stopSlideshow);
      heroBanner.addEventListener('mouseleave', startSlideshow);
      let _tx = 0;
      heroBanner.addEventListener('touchstart', e => { _tx = e.changedTouches[0].clientX; stopSlideshow(); }, { passive: true });
      heroBanner.addEventListener('touchend', e => { const d = _tx - e.changedTouches[0].clientX; if (Math.abs(d) > 50) d > 0 ? nextSlide() : prevSlide(); startSlideshow(); }, { passive: true });
    }
    startSlideshow();
