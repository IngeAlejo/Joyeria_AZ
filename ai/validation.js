// validation.js — Validación y saneamiento del JSON devuelto por la IA.
// Garantiza que los datos sean compatibles con la tabla products y el POST /api/inventario.

const { CATEGORIAS_DEFAULT } = require('./prompt');

function texto(v, max) {
  if (v == null) return null;
  const s = String(v).replace(/[\r\n]+/g, ' ').trim();
  if (!s) return null;
  return max && s.length > max ? s.slice(0, max).trim() : s;
}

function numero(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function slugLimpiar(s, fallback) {
  const base = (String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || '')
    .slice(0, 80);
  if (base) return base;
  return slugLimpiar2(fallback || 'producto');
}
function slugLimpiar2(s) {
  return String(s || 'producto').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'producto';
}

// Valida y normaliza el JSON crudo de la IA hacia el formato de products.
function validarProductoAI(raw, { categorias = CATEGORIAS_DEFAULT, indice = 0 } = {}) {
  const errores = [];
  const avisos = [];
  const catValidas = Array.isArray(categorias) && categorias.length ? categorias : CATEGORIAS_DEFAULT;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errores: ['La IA no devolvió un objeto JSON válido'] };
  }

  const conf = (raw.confidence && typeof raw.confidence === 'object') ? raw.confidence : {};
  const c = (campo) => {
    const v = Number(conf[campo]);
    return Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : null;
  };

  const nombre = texto(raw.nombre, 90);
  if (!nombre) errores.push('Falta el nombre del producto');

  const categoriaRaw = texto(raw.categoria, 40) || 'General';
  let categoria = 'General';
  const categoriaExacta = catValidas.find(x => x.toLowerCase() === categoriaRaw.toLowerCase());
  if (categoriaExacta) {
    categoria = categoriaExacta;
  } else {
    avisos.push(`Categoría "${categoriaRaw}" no existe en la aplicación. Se asignó "General".`);
  }

  const metaTitle = texto(raw.meta_title, 65);
  const metaDescripcion = texto(raw.meta_descripcion, 160);
  const slug = slugLimpiar(slugProvisto(raw.slug), nombre || 'producto');

  const producto = {
    nombre,
    precio: null, // la IA NUNCA inventa precio
    stock: 1,     // sugerido por defecto
    descripcion: texto(raw.descripcion, 500),
    descripcion_corta: texto(raw.descripcion_corta, 160) || texto(raw.descripcion, 160),
    descripcion_completa: texto(raw.descripcion_completa, 2000) || texto(raw.descripcion, 2000),
    categoria,
    materiales: texto(raw.materiales, 80),
    tipo_piedra: texto(raw.tipo_piedra, 60),
    color: texto(raw.color, 40),
    peso: texto(raw.peso, 30),
    medidas: texto(raw.medidas, 60),
    estado: ['disponible', 'nuevo', 'pedido', 'agotado'].includes(raw.estado) ? raw.estado : 'disponible',
    meta_title: metaTitle,
    meta_descripcion: metaDescripcion,
    slug,
    alt_text: texto(raw.alt_text, 120) || (nombre ? nombre : null),
    confidence: {
      nombre: c('nombre'),
      categoria: c('categoria'),
      materiales: c('materiales'),
      tipo_piedra: c('tipo_piedra'),
      color: c('color'),
      descripcion: c('descripcion')
    }
  };

  return { ok: errores.length === 0, producto, errores, avisos, indice };
}

// campos: raw.slug puede venir con espacios/acentos; reusar slugify del server.
function slugProvisto(s) {
  return String(s || '');
}

module.exports = { validarProductoAI, CATEGORIAS_DEFAULT };