// Genera una página HTML completa (server-rendered) para un producto con SEO,
// Open Graph y Twitter Cards. Los valores del producto ya vienen HTML-escapadas
// desde la DB (revisar sanitize en server.js), así que los insertamos directo en
// el marcado (el navegador decodifica entidades al renderizar).

const SITE_URL = 'https://joyeria-az.vercel.app';
const WHATSAPP_NUMBER = '573142056065';

function decodeHtml(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

function esc(s) {
  if (s == null) return '';
  return String(s);
}

function cartear(p) {
  // formato de producto crudo (sin escapar) para embed en JS del cliente
  return {
    id: p.id,
    nombre: decodeHtml(p.nombre),
    precio: Number(p.precio || 0),
    imagen: cartImagen(p),
    slug: p.slug
  };
}

function cartImagen(p) {
  const imgs = Array.isArray(p.imagenes) ? p.imagenes : [];
  const fallback = 'https://joyeria-az.vercel.app/img/ALE.png';
  if (p.imagen && /^http/.test(p.imagen)) return p.imagen;
  if (imgs[0] && /^http/.test(imgs[0])) return imgs[0];
  return p.imagen || fallback;
}

function ogImage(p) {
  if (p.imagen_compartir && /^http/.test(p.imagen_compartir)) return p.imagen_compartir;
  return cartImagen(p);
}

function ogTitle(p) {
  const raw = decodeHtml(p.meta_title || p.nombre || 'Joyería AZ');
  return raw.slice(0, 70);
}

function ogDesc(p) {
  const raw = decodeHtml(p.meta_descripcion || p.descripcion_corta || p.descripcion || '');
  return raw.slice(0, 155);
}

function imagenesGaleria(p) {
  const arr = [];
  if (p.imagen && /^http/.test(p.imagen)) arr.push(p.imagen);
  if (Array.isArray(p.imagenes)) {
    for (const url of p.imagenes) {
      if (/^http/.test(url)) arr.push(url);
    }
  }
  if (arr.length === 0) arr.push('https://joyeria-az.vercel.app/img/ALE.png');
  return arr.slice(0, 6);
}

function specItem(label, value) {
  if (!value) return '';
  return `<div class="p-spec"><span class="p-spec-label">${label}</span><span class="p-spec-value">${esc(value)}</span></div>`;
}

function estadoBadge(p, raw) {
  const stock = p.stock != null ? Number(p.stock) : 0;
  const e = (raw.estado || 'disponible').toLowerCase();
  if (stock <= 0 || e === 'agotado' || e === 'vendido') {
    return '<span class="p-badge p-badge-no">Agotado</span>';
  }
  if (e === 'nuevo') return '<span class="p-badge p-badge-new">Nuevo</span>';
  if (e === 'pedido') return '<span class="p-badge p-badge-order">Hecho a pedido</span>';
  return stock > 0 ? '<span class="p-badge p-badge-ok">Disponible</span>' : '<span class="p-badge p-badge-no">Agotado</span>';
}

function renderProductPage({ product, related = [] }) {
  const p = product;
  const url = `${SITE_URL}/p/${esc(p.slug)}`;
  const title = ogTitle(p);
  const desc = ogDesc(p);
  const img = ogImage(p);
  const raw = decodeHtml(p.descripcion_completa || p.descripcion || '');
  const short = decodeHtml(p.descripcion_corta || p.descripcion || '');
  const imgs = imagenesGaleria(p);
  const thumbHtml = imgs.map((u, i) =>
    `<button type="button" class="p-thumb${i === 0 ? ' active' : ''}" data-i="${i}" aria-label="Imagen ${i + 1}">
       <img src="${esc(u)}" alt="Vista ${i + 1} de ${esc(p.nombre)}" loading="lazy" onerror="this.src='https://joyeria-az.vercel.app/img/ALE.png'">
     </button>`
  ).join('');
  const specs = [
    specItem('Categoría', p.categoria),
    specItem('Materiales', p.materiales),
    specItem('Tipo de piedra', p.tipo_piedra),
    specItem('Color', p.color),
    specItem('Peso', p.peso),
    specItem('Medidas', p.medidas),
    specItem('Estado', p.estado)
  ].join('');
  const prodJson = JSON.stringify(cartear(p)).replace(/</g, '\\u003c');
  const relatedCards = related.map(r => {
    const rUrl = `${SITE_URL}/p/${esc(r.slug)}`;
    const rImg = cartImagen(r);
    const rName = decodeHtml(r.nombre);
    return `<a class="p-rel-card" href="${rUrl}">
      <div><img src="${esc(rImg)}" alt="${esc(rName)}" loading="lazy" onerror="this.src='https://joyeria-az.vercel.app/img/ALE.png'"></div>
      <div class="p-rel-body">
        <span class="badge-category">${esc(r.categoria || 'General')}</span>
        <h4>${esc(rName)}</h4>
        <span class="p-rel-price">$${Number(r.precio || 0).toLocaleString('es-CO')}</span>
      </div>
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} | Joyería AZ</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Joyería AZ">
  <meta property="og:locale" content="es_CO">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${esc(img)}">
  <meta property="og:image:alt" content="${esc(title)}">
  <meta property="og:price:amount" content="${p.precio}">
  <meta property="og:price:currency" content="COP">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(img)}">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Product","name":${JSON.stringify(decodeHtml(p.nombre))},"image":${JSON.stringify(imgs)},"description":${JSON.stringify(raw)},"sku":${JSON.stringify(String(p.id))},"offers":{"@type":"Offer","priceCurrency":"COP","price":"${Number(p.precio || 0)}","availability":"${Number(p.stock || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'}","url":"${url}"},"brand":{"@type":"Brand","name":"Joyería AZ"}}
  </script>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
  <style>
    :root{
      --p-gold:#B8965A; --p-navy:#1A1A2E; --p-bg:#FAFAF8; --p-muted:#6B6B7B;
      --p-border:rgba(26,26,46,.09); --p-surface:#FFFFFF;
    }
    *{box-sizing:border-box}
    body{margin:0;background:var(--p-bg);color:var(--p-navy);font-family:var(--font-ui);-webkit-font-smoothing:antialiased}
    a{color:inherit;text-decoration:none}
    img{max-width:100%;display:block}
    .p-top{background:var(--p-navy);padding:14px 0;color:#fff}
    .p-top .container{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
    .p-brand{display:flex;align-items:center;gap:12px}
    .p-brand img{width:38px;height:38px;border-radius:50%;object-fit:cover;background:#fff}
    .p-brand b{font-family:var(--font-display);font-size:1.35rem;font-weight:600;letter-spacing:.04em;color:var(--p-gold)}
    .p-brand span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.55)}
    .p-top-links{display:flex;gap:22px;align-items:center;font-size:13px}
    .p-top-links a{color:rgba(255,255,255,.85);transition:color .2s}
    .p-top-links a:hover{color:var(--p-gold)}
    .container{max-width:1240px;margin:0 auto;padding:0 20px}
    .p-bread{font-size:12px;color:var(--p-muted);padding:18px 0 0;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
    .p-bread a:hover{color:var(--p-gold)}
    .p-bread .sep{opacity:.4}
    .p-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:40px;padding:28px 0 48px}
    @media(max-width:991px){.p-layout{grid-template-columns:1fr;gap:28px}}
    .p-gallery{position:sticky;top:20px;align-self:start}
    @media(max-width:991px){.p-gallery{position:static}}
    .p-main-img{width:100%;aspect-ratio:1/1;border-radius:var(--r-card);overflow:hidden;background:#fff;border:1px solid var(--p-border);cursor:zoom-in;position:relative}
    .p-main-img img{width:100%;height:100%;object-fit:cover}
    .p-zoom-hint{position:absolute;right:14px;bottom:14px;background:rgba(26,26,46,.7);color:#fff;font-size:11px;padding:6px 10px;border-radius:var(--r-pill)}
    .p-thumbs{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}
    .p-thumb{width:72px;height:72px;border-radius:var(--r-card);overflow:hidden;border:2px solid transparent;padding:0;background:#fff;cursor:pointer;transition:border-color .2s}
    .p-thumb img{width:100%;height:100%;object-fit:cover}
    .p-thumb.active{border-color:var(--p-gold)}
    .p-cat{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--p-muted);margin:0 0 10px}
    h1.p-name{font-family:var(--font-display);font-weight:500;font-size:clamp(1.6rem,3vw,2.2rem);line-height:1.15;margin:0 0 14px;color:var(--p-navy)}
    .p-status{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
    .p-price{font-family:var(--font-display);font-size:clamp(1.8rem,4vw,2.4rem);font-weight:500;color:var(--p-gold)}
    .p-price small{font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--p-muted);letter-spacing:.06em;margin-left:6px;text-transform:uppercase}
    .p-badge{font-size:11px;font-weight:700;padding:5px 12px;border-radius:var(--r-pill)}
    .p-badge-ok{background:rgba(45,106,79,.12);color:#1f5a41}
    .p-badge-no{background:rgba(220,53,69,.12);color:#b02a37}
    .p-badge-new{background:rgba(184,150,90,.16);color:#8a6a33}
    .p-badge-order{background:rgba(26,26,46,.10);color:#3a3a4f}
    .p-short{color:var(--p-muted);font-size:15px;line-height:1.65;margin:0 0 20px;white-space:pre-line}
    .p-cta{display:flex;gap:12px;margin:22px 0;flex-wrap:wrap}
    .p-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:none;cursor:pointer;font-family:var(--font-ui);font-size:14px;font-weight:600;padding:14px 22px;border-radius:var(--r-pill);transition:transform .15s var(--ease-out),box-shadow .2s,background .2s;flex:1;min-width:200px}
    .p-btn:hover{transform:translateY(-1px)}
    .p-btn-wa{background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;box-shadow:0 8px 20px rgba(18,140,126,.25)}
    .p-btn-cart{background:var(--p-navy);color:#fff;box-shadow:0 8px 20px rgba(26,26,46,.2)}
    .p-btn-cart:disabled{opacity:.55;cursor:not-allowed;transform:none}
    .p-specs{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--p-border);border:1px solid var(--p-border);border-radius:var(--r-card);overflow:hidden;margin:22px 0}
    .p-spec{background:var(--p-surface);padding:13px 16px;display:flex;flex-direction:column;gap:3px}
    @media(max-width:520px){.p-specs{grid-template-columns:1fr}}
    .p-spec-label{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--p-muted)}
    .p-spec-value{font-size:14px;color:var(--p-navy)}
    .p-full h3{font-family:var(--font-display);font-size:1.3rem;font-weight:500;color:var(--p-navy);margin:0 0 12px;display:flex;align-items:center;gap:10px}
    .p-full h3::after{content:"";flex:1;height:1px;background:var(--p-border)}
    .p-full p{white-space:pre-line;line-height:1.7;color:var(--p-text);color:#333;margin:0}
    .p-share{margin-top:28px;padding:20px;border:1px solid var(--p-border);border-radius:var(--r-card);background:var(--p-surface)}
    .p-share-h{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--p-muted);margin:0 0 14px}
    .p-share-btns{display:flex;flex-wrap:wrap;gap:10px}
    .p-share-btns .p-sbtn{width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:17px;transition:transform .15s;box-shadow:0 4px 12px rgba(26,26,46,.12)}
    .p-share-btns .p-sbtn:hover{transform:translateY(-3px) scale(1.05)}
    .p-sbtn-wa{background:#25D366}.p-sbtn-fb{background:#1877F2}.p-sbtn-x{background:#000}.p-sbtn-tg{background:#229ED9}.p-sbtn-em{background:#777}
    .p-sbtn-copy{background:var(--p-navy)}.p-sbtn-native{background:var(--p-gold)}
    .p-admin-only{display:none;margin-top:10px}
    .p-note{font-size:12px;color:var(--p-muted);margin-top:12px;line-height:1.6}
    .p-win{position:fixed;inset:0;background:rgba(10,10,20,.92);z-index:2000;display:none;align-items:center;justify-content:center;padding:20px;cursor:zoom-out}
    .p-win.active{display:flex}
    .p-win img{max-width:92vw;max-height:88vh;border-radius:6px;object-fit:contain}
    .p-related{margin:0 0 60px}
    .p-related h2{font-family:var(--font-display);font-size:1.6rem;font-weight:500;margin:0 0 22px;color:var(--p-navy);display:flex;align-items:center;gap:14px}
    .p-related h2::after{content:"";flex:1;height:1px;background:var(--p-border)}
    .p-rel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}
    .p-rel-card{background:var(--p-surface);border:1px solid var(--p-border);border-radius:var(--r-card);overflow:hidden;transition:transform .2s var(--ease-out),box-shadow .2s}
    .p-rel-card:hover{transform:translateY(-4px);box-shadow:0 14px 34px rgba(26,26,46,.12)}
    .p-rel-card > div:first-child{aspect-ratio:1/1;overflow:hidden}
    .p-rel-card img{width:100%;height:100%;object-fit:cover;transition:transform .4s var(--ease-out)}
    .p-rel-card:hover img{transform:scale(1.05)}
    .p-rel-body{padding:14px}
    .p-rel-body h4{font-family:var(--font-display);font-size:1.05rem;font-weight:500;margin:6px 0 4px;color:var(--p-navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .p-rel-price{font-family:var(--font-display);font-size:1.15rem;color:var(--p-gold)}
    .badge-category{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--p-muted)}
    .p-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(140%);background:var(--p-navy);color:#fff;padding:13px 22px;border-radius:var(--r-pill);font-size:14px;z-index:3000;transition:transform .4s var(--ease-out);box-shadow:0 14px 34px rgba(26,26,46,.28);display:flex;align-items:center;gap:10px}
    .p-toast.show{transform:translateX(-50%) translateY(0)}
    .p-err{max-width:600px;margin:120px auto;text-align:center;padding:0 20px}
    .p-err h1{font-family:var(--font-display);font-size:2rem;font-weight:500;color:var(--p-navy)}
    .p-err p{color:var(--p-muted);margin:14px 0 26px;line-height:1.6}
    .p-footer{border-top:1px solid var(--p-border);padding:26px 0 40px;text-align:center;color:var(--p-muted);font-size:13px}
  </style>
</head>
<body>
  <div class="p-top">
    <div class="container">
      <a class="p-brand" href="/">
        <img src="/img/ALE.png" alt="Joyería AZ">
        <div><b>AZ</b><span>Joyería Fina</span></div>
      </a>
      <div class="p-top-links">
        <a href="/">Inicio</a>
        <a href="/pages/joyeria.html">Catálogo</a>
        <a href="/pages/esmeraldas.html">Esmeraldas</a>
        <a href="/#contacto">Contacto</a>
      </div>
    </div>
  </div>

  <div class="container">
    <nav class="p-bread" aria-label="Migas de pan">
      <a href="/">Inicio</a>
      <span class="sep">/</span>
      <a href="/pages/joyeria.html">Catálogo</a>
      ${p.categoria ? `<span class="sep">/</span><span>${esc(p.categoria)}</span>` : ''}
      <span class="sep">/</span>
      <span>${esc(p.nombre)}</span>
    </nav>

    <div class="p-layout">
      <div class="p-gallery">
        <div class="p-main-img" onclick="abrirZoom()">
          <img id="pMain" src="${esc(imgs[0])}" alt="${esc(p.nombre)}" onerror="this.src='/img/ALE.png'">
          <span class="p-zoom-hint"><i class="fas fa-search-plus"></i> Ampliar</span>
        </div>
        ${imgs.length > 1 ? `<div class="p-thumbs">${thumbHtml}</div>` : ''}
      </div>

      <div>
        <p class="p-cat">${esc(p.categoria || 'Joyería AZ')}</p>
        <h1 class="p-name">${esc(p.nombre)}</h1>
        <div class="p-status">
          <span class="p-price">$${Number(p.precio || 0).toLocaleString('es-CO')}<small>COP</small></span>
          ${estadoBadge(p, p)}
        </div>
        ${short ? `<p class="p-short">${esc(short)}</p>` : ''}

        <div class="p-cta">
          <a class="p-btn p-btn-wa" target="_blank" rel="noopener" href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola Joyería AZ, me interesa este producto: ' + decodeHtml(p.nombre) + ' (' + SITE_URL + '/p/' + esc(p.slug) + ')')}">
            <i class="fab fa-whatsapp"></i> Pedir por WhatsApp
          </a>
          <button class="p-btn p-btn-cart" id="btnAddCart" ${Number(p.stock || 0) <= 0 ? 'disabled' : ''}>
            <i class="fas fa-shopping-bag"></i> ${Number(p.stock || 0) > 0 ? 'Agregar a la bolsa' : 'Agotado'}
          </button>
        </div>

        <div class="p-specs">${specs}</div>

        <div class="p-share">
          <p class="p-share-h"><i class="fas fa-share-alt me-2" style="color:var(--p-gold)"></i>Compartir este producto</p>
          <div class="p-share-btns">
            <button class="p-sbtn p-sbtn-copy" onclick="copiarEnlace()" aria-label="Copiar enlace" title="Copiar enlace"><i class="fas fa-link"></i></button>
            <button class="p-sbtn p-sbtn-native" onclick="compartirNativo()" aria-label="Compartir" title="Compartir"><i class="fas fa-share-nodes"></i></button>
          </div>
          <div class="p-admin-only" id="pAdminShare">
            <p class="p-share-h" style="margin-top:14px"><i class="fas fa-lock me-2" style="color:var(--p-gold)"></i>Compartir como administración</p>
            <div class="p-share-btns">
              <button class="p-sbtn p-sbtn-wa" onclick="compartir('wa')" title="WhatsApp" aria-label="Compartir en WhatsApp"><i class="fab fa-whatsapp"></i></button>
              <button class="p-sbtn p-sbtn-fb" onclick="compartir('fb')" title="Facebook" aria-label="Compartir en Facebook"><i class="fab fa-facebook-f"></i></button>
              <button class="p-sbtn p-sbtn-x" onclick="compartir('x')" title="X (Twitter)" aria-label="Compartir en X"><i class="fab fa-x-twitter"></i></button>
              <button class="p-sbtn p-sbtn-tg" onclick="compartir('tg')" title="Telegram" aria-label="Compartir en Telegram"><i class="fab fa-telegram-plane"></i></button>
              <button class="p-sbtn p-sbtn-em" onclick="compartir('email')" title="Correo" aria-label="Compartir por correo"><i class="fas fa-envelope"></i></button>
              <button class="p-sbtn p-sbtn-copy" onclick="copiarEnlace()" title="Copiar enlace"><i class="fas fa-link"></i></button>
            </div>
          </div>
          <p class="p-note">Si eres administrador verás aquí las opciones de difusión en redes sociales y correo.</p>
        </div>
      </div>
    </div>

    ${raw ? `
    <div class="p-full" style="margin-bottom:48px">
      <h3>Descripción</h3>
      <p>${esc(raw)}</p>
    </div>` : ''}

    ${related.length ? `
    <div class="p-related">
      <h2><i class="fas fa-rings-wedding" style="color:var(--p-gold)"></i>También te puede gustar</h2>
      <div class="p-rel-grid">${relatedCards}</div>
    </div>` : ''}
  </div>

  <div class="p-win" id="pWin" onclick="cerrarZoom()">
    <img id="pWinImg" src="${esc(imgs[0])}" alt="Ampliar imagen" onerror="this.src='/img/ALE.png'">
  </div>
  <div class="p-toast" id="pToast"><i class="fas fa-circle-check" style="color:var(--p-gold)"></i><span id="pToastTxt">Listo</span></div>

  <footer class="p-footer">
    <p style="margin:0 0 6px">Joyería AZ — Joyería fina en oro, plata y esmeraldas colombianas</p>
    <span>&copy; 2026 Joyería AZ — Todos los derechos reservados</span>
  </footer>

  <script>
    var __PRODUCT__ = ${prodJson};
    var __URL__ = ${JSON.stringify(url)};
    var __TITLE__ = ${JSON.stringify(decodeHtml(p.meta_title || p.nombre))};
    var __DESC__ = ${JSON.stringify(ogDesc(p))};
    var __IMG__ = ${JSON.stringify(img)};

    function toast(msg){
      var t=document.getElementById('pToast');
      document.getElementById('pToastTxt').textContent=msg;
      t.classList.add('show');
      clearTimeout(t.__t);
      t.__t=setTimeout(function(){t.classList.remove('show');},2600);
    }
    function abrirZoom(){var w=document.getElementById('pWin');document.getElementById('pWinImg').src=document.getElementById('pMain').src;w.classList.add('active');document.body.style.overflow='hidden';}
    function cerrarZoom(){document.getElementById('pWin').classList.remove('active');document.body.style.overflow='';}
    document.querySelectorAll('.p-thumb').forEach(function(t){
      t.addEventListener('click',function(){
        document.querySelectorAll('.p-thumb').forEach(function(x){x.classList.remove('active')});
        t.classList.add('active');
        document.getElementById('pMain').src=t.querySelector('img').src;
      });
    });

    function agregarAlBolsa(){
      if(!__PRODUCT__||__PRODUCT__.id==null)return;
      var c=JSON.parse(localStorage.getItem('carrito')||'[]');
      var idx=c.findIndex(function(i){return String(i.id)===String(__PRODUCT__.id)});
      if(idx>-1){c[idx].cantidad=(c[idx].cantidad||1)+1;}else{c.push({id:__PRODUCT__.id,nombre:__PRODUCT__.nombre,precio:__PRODUCT__.precio,imagen:__PRODUCT__.imagen,cantidad:1});}
      localStorage.setItem('carrito',JSON.stringify(c));
      toast('Agregado a la bolsa');
    }
    var b=document.getElementById('btnAddCart');
    if(b&&!b.disabled)b.addEventListener('click',agregarAlBolsa);

    function copiarEnlace(){
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(__URL__).then(function(){toast('Enlace copiado')}).catch(function(){copiarFallback()});}
      else copiarFallback();
    }
    function copiarFallback(){
      var ta=document.createElement('textarea');ta.value=__URL__;document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy');toast('Enlace copiado');}catch(e){prompt('Copia el enlace:',__URL__);}
      document.body.removeChild(ta);
    }
    function compartirNativo(){
      if(navigator.share){
        navigator.share({title:__TITLE__,text:__DESC__,url:__URL__}).catch(function(){});
      } else { copiarEnlace(); }
    }
    function compartir(red){
      var enc=encodeURIComponent(__URL__);
      var txtE=encodeURIComponent(__TITLE__+'\n'+__DESC__);
      var map={
        wa:'https://wa.me/?text='+encodeURIComponent(__TITLE__+' '+__URL__),
        fb:'https://www.facebook.com/sharer/sharer.php?u='+enc,
        x:'https://twitter.com/intent/tweet?url='+enc+'&text='+txtE,
        tg:'https://t.me/share/url?url='+enc+'&text='+txtE,
        email:'mailto:?subject='+encodeURIComponent(__TITLE__)+'&body='+txtE+'%0A'+enc
      };
      if(map[red])window.open(map[red],'_blank','noopener,width=640,height=520');
      else copiarEnlace();
    }
    if(localStorage.getItem('rol')==='admin'){
      document.getElementById('pAdminShare').style.display='block';
    }
  </script>
</body>
</html>
`;
}

function renderNotFound() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Producto no encontrado | Joyería AZ</title>
  <meta name="robots" content="noindex">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=DM+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body{margin:0;font-family:'DM Sans',sans-serif;background:#FAFAF8;color:#1A1A2E}
    .p-err{max-width:520px;margin:120px auto;text-align:center;padding:0 20px}
    .p-err h1{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:600;color:#1A1A2E}
    .p-err p{color:#6B6B7B;margin:14px 0 26px;line-height:1.6}
    .p-btn{display:inline-block;background:#1A1A2E;color:#fff;padding:14px 26px;border-radius:999px;text-decoration:none;font-size:14px}
  </style>
</head>
<body>
  <div class="p-err">
    <img src="/img/ALE.png" alt="Joyería AZ" style="width:72px;height:72px;border-radius:50%;margin:0 auto 20px">
    <h1>Producto no encontrado</h1>
    <p>La joya que buscas no está disponible o la URL es incorrecta.</p>
    <a class="p-btn" href="/pages/joyeria.html">Ver catálogo</a>
  </div>
</body>
</html>`;
}

module.exports = { renderProductPage, renderNotFound, SITE_URL };