// image-process.js — Validación de imágenes en el servidor antes de enviarlas a la IA.
// La compresión/redimensionado se hace en el CLIENTE (canvas, ver inventario.html),
// aquí solo validamos tipo/tamaño y codificamos a base64 para Gemini.

const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const PESO_MAXIMO = 5 * 1024 * 1024; // 5 MB (igual que multer del inventario)

function prepararImagen(buffer, originalMime) {
  if (!MIME_PERMITIDOS.has(originalMime)) {
    return { ok: false, error: 'Tipo de imagen no permitido: ' + originalMime };
  }
  if (!buffer || buffer.length > PESO_MAXIMO) {
    return { ok: false, error: 'La imagen supera el límite de 5MB' };
  }
  return {
    ok: true,
    base64: buffer.toString('base64'),
    mimeType: originalMime
  };
}

module.exports = { prepararImagen, MIME_PERMITIDOS, PESO_MAXIMO };