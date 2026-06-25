const express = require('express');
const productController = require('../controllers/productcontroller');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Rutas públicas (no requieren autenticación)
router.get('/', productController.obtenerTodos);
router.get('/:id', productController.obtenerPorId);
router.get('/categoria/:categoria', productController.obtenerPorCategoria);

// Rutas protegidas (solo admin)
router.post(
  '/',
  authMiddleware.verificarToken,
  authMiddleware.esAdmin,
  productController.crear
);

router.put(
  '/:id',
  authMiddleware.verificarToken,
  authMiddleware.esAdmin,
  productController.actualizar
);

router.delete(
  '/:id',
  authMiddleware.verificarToken,
  authMiddleware.esAdmin,
  productController.eliminar
);

module.exports = router;
