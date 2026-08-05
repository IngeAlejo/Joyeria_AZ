// productos.js — usado sólo como fallback si la home no tiene su propio loader
// La home usa cargarProductosHome() definida en index.html
// Este archivo queda como utilidad compartida si otra página lo necesita

async function cargarProductos() {
  const grid = document.getElementById('productos-grid');
  if (!grid) return;

  // Skeletons
  grid.innerHTML = [1,2,3,4].map(() =>
    `<div class="col-lg-3 col-md-6"><div class="skeleton skeleton-card"></div></div>`
  ).join('');

  try {
    const res = await fetch(`${window.API_BASE_URL}/api/productos`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const lista = (data.productos || data || []).slice(0, 8);

    // Quitar skeletons
    grid.querySelectorAll('.skeleton').forEach(s => s.parentElement?.remove());

    if (!lista.length) {
      grid.innerHTML = '<div class="col-12 text-center py-5"><p style="color:var(--az-text-muted);">No hay productos disponibles.</p></div>';
      return;
    }

    const API = window.API_BASE_URL;
    grid.innerHTML = lista.map((p, i) => {
      const precio  = Number(p.precio || 0);
      const stock   = p.stock != null ? Number(p.stock) : 1;
      const nombre  = p.nombre || p.name || 'Joya';
      const desc    = p.descripcion || p.description || '';
      const cat     = p.categoria || p.category || '';
      const img     = p.imagen || p.image || '';
      const imgSrc  = img
        ? (img.startsWith('http') ? img : `${API}${img}`)
        : `https://picsum.photos/seed/${encodeURIComponent(nombre)}/600/400`;
      const featured = p.destacado || p.featured;
      const catIsEsmeralda = cat.toLowerCase().includes('esmeralda');
      const pSlug = (p.slug || '').toString().trim();
      const detalleUrl = pSlug ? `/p/${encodeURIComponent(pSlug)}` : '';
      const itemJson = JSON.stringify({ id: p.id, nombre, precio, imagen: imgSrc }).replace(/'/g, "\\'").replace(/"/g, '&quot;');

      return `<div class="col-lg-3 col-md-6" data-reveal data-delay="${(i % 4) + 1}">
        <article class="product-card">
          <div class="product-img-wrap">
            ${detalleUrl ? `<a href="${detalleUrl}" class="product-img-link" aria-label="Ver ${nombre}"><i class="fas fa-expand"></i></a>` : ''}
            <img src="${imgSrc}" alt="${nombre}" loading="lazy"
                 onerror="this.src='https://picsum.photos/seed/${encodeURIComponent(nombre)}/600/400'">
            ${featured ? `<span class="product-badge badge-featured">Destacado</span>` : ''}
            ${stock <= 0 ? `<div class="badge-no-stock">Sin Stock</div>` : ''}
          </div>
          <div class="product-body">
            ${cat ? `<span class="badge-category ${catIsEsmeralda ? 'badge-emerald-cat' : ''}">${cat}</span>` : ''}
            <h3 class="product-name">${detalleUrl ? `<a href="${detalleUrl}" class="product-name-link">${nombre}</a>` : nombre}</h3>
            ${desc ? `<p class="product-desc">${desc}</p>` : ''}
            <div class="product-footer">
              <div>
                <div class="product-price">$${precio.toLocaleString('es-CO')}</div>
                <span class="product-price-label">COP</span>
              </div>
              <button class="btn-add-cart"
                      onclick="agregarCarrito('${itemJson}')"
                      ${stock <= 0 ? 'disabled aria-disabled="true"' : ''}
                      aria-label="Agregar ${nombre} al carrito">
                <i class="fas fa-shopping-bag"></i>
                ${stock > 0 ? 'Agregar' : 'Agotado'}
              </button>
            </div>
          </div>
        </article>
      </div>`;
    }).join('');

    if (window.initReveal) window.initReveal();

  } catch (error) {
    console.error('Error cargando productos:', error);
    grid.querySelectorAll('.skeleton').forEach(s => s.parentElement?.remove());
    grid.innerHTML = `<div class="col-12 text-center py-5">
      <i class="fas fa-exclamation-triangle fa-2x mb-3" style="color:#f59e0b;display:block;"></i>
      <p style="color:var(--az-text-muted);">Error de conexión al servidor.</p>
      <button class="btn-primary-az mt-2" onclick="cargarProductos()">
        <i class="fas fa-refresh"></i>Reintentar
      </button>
    </div>`;
  }
}
