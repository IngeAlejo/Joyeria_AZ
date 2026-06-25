const express = require('express');
const authController = require('../controllers/authcontroller');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rutas protegidas (requieren token)
router.get('/perfil', authMiddleware.verificarToken, authController.obtenerUsuarioActual);

module.exports = router;
