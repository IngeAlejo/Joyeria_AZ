const jwt = require('jsonwebtoken');

// Middleware para verificar JWT
exports.verificarToken = (req, res, next) => {
  try {
    // Obtiene token del header: "Authorization: Bearer TOKEN"
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    // Verifica y decodifica token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRol = decoded.rol;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para verificar si es admin
exports.esAdmin = (req, res, next) => {
  if (req.userRol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Solo admins.' });
  }
  next();
};
