const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.User;

// REGISTRO
exports.register = async (req, res) => {
  try {
    const { nombre, email, contraseña, telefono } = req.body;

    // Validaciones básicas
    if (!nombre || !email || !contraseña) {
      return res.status(400).json({ 
        error: 'Nombre, email y contraseña son requeridos' 
      });
    }

    // Verifica si email ya existe
    const usuarioExistente = await User.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ 
        error: 'El email ya está registrado' 
      });
    }

    // Encripta contraseña
    const salt = await bcrypt.genSalt(10);
    const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);

    // Crea usuario en BD
    const usuario = await User.create({
      nombre,
      email,
      contraseña: contraseñaEncriptada,
      telefono,
      rol: 'cliente', // Por defecto, nuevos usuarios son clientes
    });

    // Crea JWT token
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Token válido por 7 días
    );

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, contraseña } = req.body;

    // Validaciones
    if (!email || !contraseña) {
      return res.status(400).json({ 
        error: 'Email y contraseña son requeridos' 
      });
    }

    // Busca usuario por email
    const usuario = await User.findOne({ where: { email } });
    if (!usuario) {
      return res.status(401).json({ 
        error: 'Email o contraseña incorrectos' 
      });
    }

    // Compara contraseña
    const contraseñaValida = await bcrypt.compare(contraseña, usuario.contraseña);
    if (!contraseñaValida) {
      return res.status(401).json({ 
        error: 'Email o contraseña incorrectos' 
      });
    }

    // Crea JWT token
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// OBTENER USUARIO ACTUAL (protegido)
exports.obtenerUsuarioActual = async (req, res) => {
  try {
    const usuario = await User.findByPk(req.userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
