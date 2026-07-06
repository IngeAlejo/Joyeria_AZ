// ==========================================
// CARRITO Y FUNCIONES GLOBALES
// ==========================================

let carritoAbierto = false;

// Determinar el path a las imágenes según donde estamos
const getImgPath = (img) => {
  if (!img) return 'img/ALE.png';
  if (img.startsWith('http')) return img;
  if (window.location.pathname.includes('/pages/')) {
    return '../' + img;
  }
  return img;
};

// Renderizar el badge de cantidad del carrito
function actualizarBadgeCarrito() {
  const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
  const total = carrito.reduce((s, i) => s + (i.cantidad || 1), 0);
  const badge = document.getElementById('badge-carrito');
  if (badge) badge.textContent = total;
}

// Abrir/cerrar el sidebar del carrito
function toggleCarrito() {
  carritoAbierto = !carritoAbierto;
  const sidebar = document.getElementById('carrito-flotante');
  const overlay = document.getElementById('carrito-overlay');

  if (sidebar) sidebar.classList.toggle('open', carritoAbierto);
  if (overlay) overlay.style.display = carritoAbierto ? 'block' : 'none';

  document.body.style.overflow = carritoAbierto ? 'hidden' : '';

  if (carritoAbierto) renderCarritoSidebar();
}

// Pintar el contenido del carrito
function renderCarritoSidebar() {
  const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
  const cont = document.getElementById('carrito-contenido');
  const totalWrap = document.getElementById('carrito-total-wrap');

  if (!cont) return;

  if (carrito.length === 0) {
    const linkDir = window.location.pathname.includes('/pages/') ? 'joyeria.html' : 'pages/joyeria.html';
    cont.innerHTML = `<p style="color:var(--az-text-muted);font-size:14px;text-align:center;padding:40px 0;">Tu bolsa está vacía.<br><a href="${linkDir}" style="color:var(--az-gold);">Explorar colección →</a></p>`;
    if (totalWrap) totalWrap.classList.add('d-none');
    return;
  }

  let total = 0;
  cont.innerHTML = carrito.map(item => {
    const sub = (item.precio || 0) * (item.cantidad || 1);
    total += sub;
    const imgSrc = getImgPath(item.imagen);

    return `
      <div class="carrito-item">
        <img class="carrito-item-img" src="${imgSrc}" alt="${item.nombre}" onerror="this.src='${getImgPath('img/ALE.png')}'">
        <div style="flex:1;min-width:0;">
          <div class="carrito-item-name">${item.nombre}</div>
          <div class="carrito-item-price">$${Number(item.precio).toLocaleString('es-CO')}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
            <button onclick="cambiarCantidad(${item.id},-1)" style="width:24px;height:24px;border:1px solid var(--az-border-strong);border-radius:4px;background:none;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">−</button>
            <span style="font-size:13px;font-weight:600;color:var(--az-navy);">${item.cantidad || 1}</span>
            <button onclick="cambiarCantidad(${item.id},1)" style="width:24px;height:24px;border:1px solid var(--az-border-strong);border-radius:4px;background:none;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">+</button>
            <button onclick="quitarDelCarrito(${item.id})" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:12px;color:var(--az-text-muted);">Quitar</button>
          </div>
        </div>
      </div>`;
  }).join('');

  const totalEl = document.getElementById('carrito-total');
  if (totalEl) totalEl.textContent = '$' + total.toLocaleString('es-CO');
  if (totalWrap) totalWrap.classList.remove('d-none');
}

function cambiarCantidad(id, delta) {
  let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
  const idx = carrito.findIndex(i => i.id === id);
  if (idx < 0) return;
  carrito[idx].cantidad = Math.max(1, (carrito[idx].cantidad || 1) + delta);
  localStorage.setItem('carrito', JSON.stringify(carrito));
  actualizarBadgeCarrito();
  renderCarritoSidebar();
}

function quitarDelCarrito(id) {
  let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
  carrito = carrito.filter(i => i.id !== id);
  localStorage.setItem('carrito', JSON.stringify(carrito));
  actualizarBadgeCarrito();
  renderCarritoSidebar();
}

function agregarCarrito(item) {
  // item can be a string or object depending on how it's passed
  if (typeof item === 'string') {
    try { item = JSON.parse(item); } catch (e) { }
  }

  let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
  const i = carrito.findIndex(x => x.id === item.id);
  if (i >= 0) {
    carrito[i].cantidad = (carrito[i].cantidad || 1) + 1;
  } else {
    carrito.push({ ...item, cantidad: 1 });
  }
  localStorage.setItem('carrito', JSON.stringify(carrito));
  actualizarBadgeCarrito();
  mostrarToast(item.nombre + ' añadido');
}

function mostrarToast(msg) {
  const t = document.getElementById('toast-cart');
  const s = document.getElementById('toast-text');
  if (!t || !s) return;
  s.textContent = msg;
  t.style.transform = 'translateX(0)';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.transform = 'translateX(150%)'; }, 2500);
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
  actualizarBadgeCarrito();
});

// Manejar scroll a anclas (cross-page)
window.addEventListener('load', () => {
  if (window.location.hash) {
    const el = document.querySelector(window.location.hash);
    if (el) {
      setTimeout(() => {
        const y = el.getBoundingClientRect().top + window.scrollY - 80; // 80px offset (navbar)
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 150); // delay to let layout settle
    }
  }
});