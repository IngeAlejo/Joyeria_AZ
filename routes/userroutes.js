const express = require('express');
const userController = require('../controllers/usercontroller');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// SOLO ADMIN puede ver lista de usuarios
router.get(
  '/',
  authMiddleware.verificarToken,
  authMiddleware.esAdmin,
  userController.obtenerTodos
);

module.exports = router;
