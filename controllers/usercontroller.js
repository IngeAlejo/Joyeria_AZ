const db = require('../models');
const User = db.User;

// SOLO ADMIN: listar todos los usuarios
exports.obtenerTodos = async (req, res) => {
  try {
    const usuarios = await User.findAll({
      attributes: ['id', 'nombre', 'email', 'rol', 'telefono', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: usuarios.length,
      usuarios,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
