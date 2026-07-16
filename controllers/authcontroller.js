const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.User;

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '30m';

function validatePassword(pw) {
  if (!pw || typeof pw !== 'string') return 'La contraseña es obligatoria';
  if (pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(pw)) return 'Debe tener al menos una mayúscula';
  if (!/[a-z]/.test(pw)) return 'Debe tener al menos una minúscula';
  if (!/[0-9]/.test(pw)) return 'Debe tener al menos un número';
  return null;
}

exports.register = async (req, res) => {
  try {
    const { nombre, email, contraseña, telefono } = req.body;

    if (!nombre || !email || !contraseña) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }

    const pwError = validatePassword(contraseña);
    if (pwError) return res.status(400).json({ error: pwError });

    const usuarioExistente = await User.findOne({ where: { email } });
    if (usuarioExistente) return res.status(400).json({ error: 'El email ya está registrado' });

    const salt = await bcrypt.genSalt(12);
    const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);

    const usuario = await User.create({
      nombre, email, contraseña: contraseñaEncriptada, telefono, rol: 'cliente',
    });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, contraseña } = req.body;

    if (!email || !contraseña) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const usuario = await User.findOne({ where: { email } });
    if (!usuario) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

    const contraseñaValida = await bcrypt.compare(contraseña, usuario.contraseña);
    if (!contraseñaValida) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.obtenerUsuarioActual = async (req, res) => {
  try {
    const usuario = await User.findByPk(req.userId);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, telefono: usuario.telefono },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
