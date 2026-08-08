// ai/routes.js — Rutas de IA del panel admin.
// Firma: createAiRouter({ auth, limpiarSlug, categoriasDisponibles })
// Solo accesible por administradores (auth + rol admin verificado dentro).

const express = require('express');
const multer = require('multer');
const { prepararImagen } = require('./image-process');
const { procesarLote, CATEGORIAS_DEFAULT } = require('./ai-service');

const MAX_IMAGENES = 20;

function createAiRouter({ auth }) {
  const router = express.Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: MAX_IMAGENES }
  });

  // POST /api/ai/analizar — multipart: imagenes[] (archivos) + pistas (JSON string array)
  router.post('/analizar', auth, upload.array('imagenes', MAX_IMAGENES), async (req, res) => {
    try {
      if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Selecciona al menos una imagen' });
      }
      if (req.files.length > MAX_IMAGENES) {
        return res.status(400).json({ error: `Máximo ${MAX_IMAGENES} imágenes por lote` });
      }

      let pistas = [];
      try {
        pistas = JSON.parse(req.body.pistas || '[]');
      } catch (e) {
        pistas = [];
      }
      if (!Array.isArray(pistas)) pistas = [];

      let categorias = CATEGORIAS_DEFAULT;
      try {
        const cats = JSON.parse(req.body.categorias || '[]');
        if (Array.isArray(cats) && cats.length) categorias = cats;
      } catch (e) {
        /* default */
      }

      const imagenes = req.files.map(f => ({
        base64: f.buffer.toString('base64'),
        mimeType: f.mimetype,
        nombre: f.originalname
      }));

      const resultados = await procesarLote({ imagenes, pistas, categorias });

      res.json({
        success: true,
        total: resultados.length,
        correctos: resultados.filter(r => r.ok).length,
        fallidos: resultados.filter(r => !r.ok).length,
        resultados,
        categorias
      });
    } catch (error) {
      console.error("ERROR POST /api/ai/analizar:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = { createAiRouter, MAX_IMAGENES };