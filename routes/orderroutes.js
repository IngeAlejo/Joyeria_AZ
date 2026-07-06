const express = require('express');
const orderController = require('../controllers/ordercontroller');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// CREAR ORDEN (cliente logueado)
router.post('/', authMiddleware.verificarToken, orderController.crearOrden);

// VER MIS ÓRDENES (cliente logueado)
router.get('/mis-ordenes', authMiddleware.verificarToken, orderController.obtenerMisOrdenes);

// VER TODAS ÓRDENES (solo admin)
router.get('/', authMiddleware.verificarToken, authMiddleware.esAdmin, orderController.obtenerTodas);

module.exports = router;
