// ai-service.js — Capa de abstracción de IA.
// La lógica de creación de productos NO depende de un proveedor específico.
// Para cambiar de proveedor (OpenAI, otro), basta con reemplazar el provider.

const provider = require('./gemini-provider'); // → futuro: elegir según process.env.AI_PROVIDER
const { validarProductoAI, CATEGORIAS_DEFAULT } = require('./validation');

const CONCURRENCIA_MAX = 3; // evita saturar la cuota gratuita (10 RPM en 2.5 Flash)

// Procesa N imágenes en paralelo con límite de concurrencia.
// Nunca detiene el lote si una falla: devuelve { ok, resultado } por ítem.
async function procesarLote({ imagenes, pistas = [], categorias = CATEGORIAS_DEFAULT, onProgreso }) {
  const resultados = new Array(imagenes.length);

  let cola = 0;
  async function trabajador(indice) {
    const item = imagenes[indice];
    const pista = pistas[indice] || '';
    try {
      if (onProgreso) onProgreso(indice + 1, imagenes.length);
      const crudo = await provider.analizarProducto({
        imagenBase64: item.base64,
        mimeType: item.mimeType,
        pista,
        categorias
      });
      const val = validarProductoAI(crudo, { categorias, indice });
      if (val.ok) {
        resultados[indice] = { ok: true, producto: val.producto, avisos: val.avisos };
      } else {
        resultados[indice] = { ok: false, error: val.errores.join('; ') };
      }
    } catch (e) {
      resultados[indice] = { ok: false, error: e.message || 'Error de IA' };
    }
  }

  // Cola con concurrencia máxima
  let cursor = 0;
  async function siguiente() {
    while (cursor < imagenes.length) {
      const idx = cursor++;
      await trabajador(idx);
    }
  }
  const trabajadores = [];
  for (let i = 0; i < Math.min(CONCURRENCIA_MAX, imagenes.length); i++) {
    trabajadores.push(siguiente());
  }
  await Promise.all(trabajadores);

  return resultados;
}

module.exports = { procesarLote, validarProductoAI, CATEGORIAS_DEFAULT };