const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ============ VALIDACIONES DE SEGURIDAD ============
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET no configurado o demasiado corto (min 32 caracteres).');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '30m';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

// ============ SANITIZACION DE INPUTS ============
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    clean[key] = typeof val === 'string' ? sanitize(val) : val;
  }
  return clean;
}

// ============ VALIDACION DE CONTRASENA ============
function validatePassword(pw) {
  if (!pw || typeof pw !== 'string') return 'La contraseña es obligatoria';
  if (pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(pw)) return 'La contraseña debe tener al menos una mayúscula';
  if (!/[a-z]/.test(pw)) return 'La contraseña debe tener al menos una minúscula';
  if (!/[0-9]/.test(pw)) return 'La contraseña debe tener al menos un número';
  return null;
}

// ============ VALIDACION DE ROLES ============
const ROLES_VALIDOS = ['cliente', 'admin'];
function validateRole(rol) {
  return ROLES_VALIDOS.includes(rol) ? rol : 'cliente';
}

// ============ CONFIGURACION DE MULTER (MEMORY STORAGE) ============
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: function (req, file, cb) {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se aceptan: JPG, PNG, WebP, GIF'));
    }
  }
});

// ============ SUPABASE STORAGE ============
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'productos';

async function subirASupabase(file) {
  if (!supabase) throw new Error('Supabase no configurado');

  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

async function eliminarDeSupabase(url) {
  if (!supabase || !url) return;
  try {
    const nombre = url.split('/').pop();
    await supabase.storage.from(BUCKET_NAME).remove([nombre]);
  } catch (e) { /* ignorar errores de borrado */ }
}

const app = express();
app.set('trust proxy', 1);

// ============ SEGURIDAD: HELMET ============
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// ============ SEGURIDAD: HPP ============
app.use(hpp());

// ============ SEGURIDAD: RATE LIMITING ============
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);

// ============ CORS CONFIGURADO ============
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || ALLOWED_ORIGINS.length === 0) {
      callback(null, true);
    } else if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(bodyParser.json({ limit: '1mb' }));
app.use(express.static('www'));

// ============ DIAGNOSTICO DATABASE ============
console.log("=== DIAGNOSTICO DATABASE ===");
console.log("DATABASE_URL RAW:", JSON.stringify(process.env.DATABASE_URL));
console.log("PGHOST:", process.env.PGHOST);
console.log("PGUSER:", process.env.PGUSER);
console.log("PGDATABASE:", process.env.PGDATABASE);
console.log("PGPORT:", process.env.PGPORT);

if (process.env.DATABASE_URL) {
  const { URL } = require("url");
  const parsed = new URL(process.env.DATABASE_URL);
  console.log("PARSED URL:", {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    username: parsed.username,
    port: parsed.port,
    pathname: parsed.pathname
  });

  const dns = require("dns").promises;
  dns.lookup(parsed.hostname)
    .then(r => console.log("DNS OK:", r))
    .catch(e => console.error("DNS FAIL:", e.message));
}
console.log("=== FIN DIAGNOSTICO ===");

// ============ CONEXION POSTGRESQL ============
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL !== 'false' ? {
    rejectUnauthorized: false
  } : false
});

db.on('error', (err) => {
  console.error('ERROR DB Pool:', err.message);
  console.error(err.stack);
});

db.getConnection = async () => {
  try {
    console.log("Intentando conectar...");

    const client = await db.connect();

    console.log("Conectado correctamente");

    const r = await client.query("SELECT current_user, version();");

    console.log(r.rows);

    return client;

  } catch (err) {

    console.error("========== PG ERROR ==========");
    console.error("MESSAGE:", err.message);
    console.error("CODE:", err.code);
    console.error("DETAIL:", err.detail);
    console.error("HINT:", err.hint);
    console.error("SEVERITY:", err.severity);
    console.error("STACK:", err.stack);
    console.error("FULL ERROR:", err);

    throw err;
  }
};

// ============ MIDDLEWARE AUTH (UNIFICADO) ============
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// ============ LOGIN ============
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { email, password, contraseña } = req.body;
    const passInput = password || contraseña;

    if (!email || !passInput) {
      return res.status(400).json({ error: 'Faltan email o contraseña' });
    }

    const connection = await db.getConnection();
    const { rows } = await connection.query('SELECT * FROM users WHERE email = $1', [email]);
    connection.release();

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const user = rows[0];
    const passHash = user.password || '';
    const esValida = await bcrypt.compare(passInput, passHash);

    if (!esValida) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      token,
      rol: user.rol,
      nombre: user.nombre,
      success: true
    });
  } catch (error) {
    console.error("ERROR POST /api/login:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

// ============ REGISTER ============
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const {
      email, password, nombre, apellidos,
      telefono, telefonoFijo, dni, fechaNacimiento, genero, empresa,
      pais, departamento, ciudad, direccion, direccion2, codigoPostal, referencia
    } = sanitizeObject(req.body);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const pwError = validatePassword(password);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    const connection = await db.getConnection();

    try {
      const result = await connection.query(
        `INSERT INTO users (
          email, password, nombre, apellidos,
          telefono, "telefonoFijo", dni, "fechaNacimiento", genero, empresa,
          pais, departamento, ciudad, direccion, "direccion2", "codigoPostal", referencia,
          rol, "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'cliente', NOW(), NOW()) RETURNING id`,
        [
          email, hash, nombre || 'Cliente', apellidos || '',
          telefono || null, telefonoFijo || null, dni || null, fechaNacimiento || null, genero || null, empresa || null,
          pais || null, departamento || null, ciudad || null, direccion || null, direccion2 || null, codigoPostal || null, referencia || null
        ]
      );

      const token = jwt.sign(
        { id: result.rows[0].id, rol: 'cliente' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      res.json({ success: true, token, nombre: nombre || 'Cliente', rol: 'cliente' });
    } catch (dbError) {
      if (dbError.code === '23505') {
        res.status(400).json({ error: 'El email ya está registrado' });
      } else {
        res.status(500).json({ error: 'Error al registrar usuario' });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("ERROR POST /api/register:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

// ============ PERFIL DE USUARIO ============
app.put('/api/users/profile', auth, async (req, res) => {
  try {
    const { nombre, apellidos, telefono } = sanitizeObject(req.body);
    const connection = await db.getConnection();
    await connection.query(
      'UPDATE users SET nombre=$1, apellidos=$2, telefono=$3, "updatedAt"=NOW() WHERE id=$4',
      [nombre, apellidos || '', telefono || '', req.user.id]
    );
    connection.release();
    res.json({ success: true, msg: 'Perfil actualizado' });
  } catch (error) {
    console.error("ERROR PUT /api/users/profile:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

// ============ PRODUCTOS PUBLICOS ============
app.get('/api/products', async (req, res) => {
  try {
    const connection = await db.getConnection();
    const { rows } = await connection.query(
      'SELECT * FROM products WHERE activo = true ORDER BY "createdAt" DESC'
    );
    connection.release();
    res.json({ productos: rows });
  } catch (error) {
    console.error("ERROR GET /api/products:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

// ============ INVENTARIO (SOLO ADMIN) ============
app.get('/api/inventario', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const connection = await db.getConnection();
    const { rows } = await connection.query('SELECT * FROM products ORDER BY "createdAt" DESC');
    connection.release();

    res.json({ productos: rows });
  } catch (error) {
    console.error("ERROR GET /api/inventario:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

app.post('/api/inventario', auth, upload.single('imagen'), async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const { nombre, precio, stock, descripcion, categoria } = sanitizeObject(req.body);
    let imagenUrl = null;

    if (req.file) {
      imagenUrl = await subirASupabase(req.file);
    }

    const connection = await db.getConnection();
    await connection.query(
      'INSERT INTO products (nombre, precio, stock, descripcion, categoria, imagen, activo, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())',
      [nombre, precio, stock, descripcion, categoria || 'General', imagenUrl]
    );
    connection.release();

    res.json({ success: true, msg: 'Producto agregado', imagen: imagenUrl });
  } catch (error) {
    console.error("ERROR POST /api/inventario:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

app.put('/api/inventario/:id', auth, upload.single('imagen'), async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const { nombre, precio, stock, descripcion, categoria } = sanitizeObject(req.body);
    const connection = await db.getConnection();

    const { rows: existing } = await connection.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const p = existing[0];

    const newNombre = nombre !== undefined ? nombre : p.nombre;
    const newPrecio = precio !== undefined ? precio : p.precio;
    const newStock = stock !== undefined ? stock : p.stock;
    const newDesc = descripcion !== undefined ? descripcion : p.descripcion;
    const newCat = categoria !== undefined ? categoria : p.categoria;

    let newImg = p.imagen;
    if (req.file) {
      if (p.imagen && p.imagen.includes('supabase')) {
        await eliminarDeSupabase(p.imagen);
      }
      newImg = await subirASupabase(req.file);
    }

    await connection.query(
      'UPDATE products SET nombre=$1, precio=$2, stock=$3, descripcion=$4, categoria=$5, imagen=$6, "updatedAt"=NOW() WHERE id=$7',
      [newNombre, newPrecio, newStock, newDesc, newCat, newImg, req.params.id]
    );

    connection.release();
    res.json({ success: true, msg: 'Producto actualizado' });
  } catch (error) {
    console.error("ERROR PUT /api/inventario/:id:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

app.delete('/api/inventario/:id', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const connection = await db.getConnection();
    await connection.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    connection.release();

    res.json({ success: true, msg: 'Producto eliminado' });
  } catch (error) {
    console.error("ERROR DELETE /api/inventario/:id:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

// ============ HISTORIAL VENTAS (SOLO ADMIN) ============
app.get('/api/historial', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const connection = await db.getConnection();
    const { rows } = await connection.query(`
      SELECT o.id, o.numeroorden, o."totalPrecio", o.estado, o."createdAt",
             u.nombre as userName, u.email as userEmail
      FROM orders o
      LEFT JOIN users u ON o."userId" = u.id
      ORDER BY o."createdAt" DESC
    `);
    connection.release();

    res.json({ ordenes: rows });
  } catch (error) {
    console.error("ERROR GET /api/historial:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

app.put('/api/historial/:id/status', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const { estado } = req.body;
    if (!['pendiente', 'procesando', 'enviada', 'entregada', 'cancelada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const connection = await db.getConnection();
    await connection.query(
      'UPDATE orders SET estado=$1, "updatedAt"=NOW() WHERE id=$2',
      [estado, req.params.id]
    );
    connection.release();

    res.json({ success: true, msg: 'Estado actualizado' });
  } catch (error) {
    console.error("ERROR PUT /api/historial/:id/status:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

// ============ ADMINISTRACION ============

app.post('/api/admin/users', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const { nombre, apellidos, email, password, telefono, rol } = sanitizeObject(req.body);
    if (!password) return res.status(400).json({ error: 'La contraseña es obligatoria' });

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    const connection = await db.getConnection();

    try {
      await connection.query(
        `INSERT INTO users (nombre, apellidos, email, password, telefono, rol, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [nombre, apellidos || '', email, hash, telefono || null, validateRole(rol)]
      );
      res.json({ success: true, msg: 'Usuario creado exitosamente' });
    } catch (dbError) {
      if (dbError.code === '23505') res.status(400).json({ error: 'El email ya está registrado' });
      else res.status(500).json({ error: 'Error al crear usuario' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("ERROR POST /api/admin/users:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

app.get('/api/admin/users', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const connection = await db.getConnection();
    const { rows } = await connection.query(
      `SELECT id, nombre, apellidos, email, telefono, rol, "createdAt"
       FROM users ORDER BY "createdAt" DESC`
    );
    connection.release();

    res.json({ users: rows });
  } catch (error) {
    console.error("ERROR GET /api/admin/users:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

app.put('/api/admin/users/:id/role', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const { rol } = req.body;
    const validatedRol = validateRole(rol);
    const connection = await db.getConnection();
    await connection.query('UPDATE users SET rol=$1, "updatedAt"=NOW() WHERE id=$2', [validatedRol, req.params.id]);
    connection.release();

    res.json({ success: true, msg: 'Rol actualizado' });
  } catch (error) {
    console.error("ERROR PUT /api/admin/users/:id/role:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

app.delete('/api/admin/users/:id', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });
    if (String(req.user.id) === String(req.params.id)) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    const connection = await db.getConnection();
    await connection.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    connection.release();
    res.json({ success: true, msg: 'Usuario eliminado' });
  } catch (error) {
    console.error("ERROR DELETE /api/admin/users/:id:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

app.put('/api/admin/users/:id', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const {
      nombre, apellidos, email, telefono, telefonoFijo, dni, fechaNacimiento, genero, empresa,
      pais, departamento, ciudad, direccion, direccion2, codigoPostal, referencia, rol
    } = sanitizeObject(req.body);
    const connection = await db.getConnection();

    await connection.query(
      `UPDATE users SET
        nombre=$1, apellidos=$2, email=$3, telefono=$4, "telefonoFijo"=$5,
        dni=$6, "fechaNacimiento"=$7, genero=$8, empresa=$9,
        pais=$10, departamento=$11, ciudad=$12, direccion=$13, "direccion2"=$14, "codigoPostal"=$15, referencia=$16,
        rol=$17, "updatedAt"=NOW() WHERE id=$18`,
      [
        nombre, apellidos, email, telefono || null, telefonoFijo || null,
        dni || null, fechaNacimiento || null, genero || null, empresa || null,
        pais || null, departamento || null, ciudad || null, direccion || null, direccion2 || null, codigoPostal || null, referencia || null,
        validateRole(rol), req.params.id
      ]
    );
    connection.release();

    res.json({ success: true, msg: 'Usuario actualizado' });
  } catch (error) {
    console.error("ERROR PUT /api/admin/users/:id:", error.message);
    console.error(error.stack);
    if (error.code === '23505') {
      res.status(400).json({ error: 'El email ya está en uso' });
    } else {
      res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
    }
  }
});

app.get('/api/admin/stats', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const connection = await db.getConnection();

    const usersResult = await connection.query('SELECT COUNT(*) as total_users FROM users');
    const productsResult = await connection.query('SELECT COUNT(*) as total_products FROM products WHERE activo = true');
    const ordersResult = await connection.query('SELECT COUNT(*) as total_orders FROM orders');
    const revenueResult = await connection.query("SELECT COALESCE(SUM(\"totalPrecio\"), 0) as total_revenue FROM orders WHERE estado != 'cancelada'");

    connection.release();

    res.json({
      stats: {
        users: usersResult.rows[0].total_users,
        products: productsResult.rows[0].total_products,
        orders: ordersResult.rows[0].total_orders,
        revenue: revenueResult.rows[0].total_revenue
      }
    });
  } catch (error) {
    console.error("ERROR GET /api/admin/stats:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

// ============ TEST-DB (PROTEGIDO) ============
const DB_TEST_SECRET = process.env.DB_TEST_SECRET || 'cambiar-en-produccion';
app.get('/api/test-db', (req, res) => {
  if (req.headers['x-test-secret'] !== DB_TEST_SECRET) {
    return res.status(404).json({ error: 'Not found' });
  }
  (async () => {
    try {
      const connection = await db.getConnection();
      const { rows } = await connection.query('SELECT 1 as test');
      connection.release();
      res.json({ success: true });
    } catch (error) {
      console.error("ERROR GET /api/test-db:", error.message);
      console.error(error.stack);
      res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
    }
  })();
});

// ============ MANEJO DE ERRORES ============
app.use((err, req, res, next) => {
  console.error("ERROR MIDDLEWARE:", err.message);
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo excede el limite de 5MB' });
    }
    return res.status(400).json({ error: 'Error al subir archivo' });
  }
  if (err.message && err.message.includes('Tipo de archivo')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ success: false, message: error.message || 'Error interno del servidor', stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
});

// ============ ENDPOINT PARA INSERTAR PRODUCTOS DE PRUEBA ============
app.post('/api/seed-products', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const connection = await db.getConnection();

    const productos = [
      {
        nombre: 'Anillo Solitario Oro 18k con Esmeralda',
        precio: 2850000,
        stock: 5,
        descripcion: 'Anillo de oro 18k con esmeralda colombiana de Muzo de 1.2 quilates. Diseño solitario clásico, elaborado completamente a mano por maestros joyeros.',
        categoria: 'Anillos',
        imagen: 'https://picsum.photos/seed/anillo-esmeralda/600/400',
        destacado: true
      },
      {
        nombre: 'Collar Cadena Oro 18k con Colgante Esmeralda',
        precio: 4200000,
        stock: 3,
        descripcion: 'Collar de cadena de oro 18k de 45cm con colgante de esmeralda colombiana ovalada de 2.1 quilates. Cierre de seguridad tipo lobster.',
        categoria: 'Collares',
        imagen: 'https://picsum.photos/seed/collar-esmeralda/600/400',
        destacado: true
      },
      {
        nombre: 'Aretes Cascada Oro con Esmeraldas',
        precio: 1950000,
        stock: 8,
        descripcion: 'Aretes tipo cascada en oro 18k con tres esmeraldas colombianas en escalera. Caída de 3.5cm, cierre de tornillo.',
        categoria: 'Aretes',
        imagen: 'https://picsum.photos/seed/aretes-cascada/600/400',
        destacado: false
      },
      {
        nombre: 'Pulsera Tennis Oro 18k con Esmeraldas',
        precio: 6500000,
        stock: 2,
        descripcion: 'Pulsera tennis en oro 18k con 28 esmeraldas colombianas calibradas, total 8.4 quilates. Cierre de seguridad con doble seguro.',
        categoria: 'Pulseras',
        imagen: 'https://picsum.photos/seed/pulsera-tennis/600/400',
        destacado: true
      },
      {
        nombre: 'Esmeralda Suelta Muzo - Rectangular',
        precio: 3800000,
        stock: 4,
        descripcion: 'Esmeralda colombiana de la mina de Muzo, corte rectangular (emerald cut), 3.2 quilates. Color verde intenso, claridad excellent. Incluye certificado de origen.',
        categoria: 'Esmeraldas',
        imagen: 'https://picsum.photos/seed/esmeralda-muzo/600/400',
        destacado: true
      },
      {
        nombre: 'Esmeralda Suelta Chivor - Oval',
        precio: 2400000,
        stock: 6,
        descripcion: 'Esmeralda colombiana de la mina de Chivor, corte oval, 1.8 quilates. Tono verde azulado característico de Chivor. Certificado de autenticidad incluido.',
        categoria: 'Esmeraldas',
        imagen: 'https://picsum.photos/seed/esmeralda-chivor/600/400',
        destacado: false
      },
      {
        nombre: 'Alianza Matrimonial Oro 18k - Pareja',
        precio: 1200000,
        stock: 12,
        descripcion: 'Par de alianzas matrimoniales en oro 18k, acabado mate cepillado. Disponibles en tallas 8 al 22. Grabado personalizado incluido.',
        categoria: 'Anillos',
        imagen: 'https://picsum.photos/seed/alianza-pareja/600/400',
        destacado: false
      },
      {
        nombre: 'Collar Plata 925 con Esmeralda',
        precio: 890000,
        stock: 7,
        descripcion: 'Collar de plata sterling 925 con esmeralda colombiana cabujón de 0.8 quilates. Cadena de eslabón saltador de 50cm con cierre tipo cangrejo.',
        categoria: 'Collares',
        imagen: 'https://picsum.photos/seed/collar-plata/600/400',
        destacado: false
      },
      {
        nombre: 'Broche Flor de Oro con Esmeraldas',
        precio: 1650000,
        stock: 4,
        descripcion: 'Broche flor en oro 18k con 5 esmeraldas colombianas como pétalos y un diamante central. Diámetro de 3.2cm, cierre de gancho.',
        categoria: 'Broches',
        imagen: 'https://picsum.photos/seed/broche-flor/600/400',
        destacado: false
      },
      {
        nombre: 'Conjunto Esmeralda: Aretes + Collar',
        precio: 5800000,
        stock: 2,
        descripcion: 'Set de joyería en oro 18k con esmeraldas colombianas. Collar con esmeralda princess de 2.5ct y aretes a juego con esmeraldas de 0.8ct cada uno. Pieza única.',
        categoria: 'Conjuntos',
        imagen: 'https://picsum.photos/seed/conjunto-esmeralda/600/400',
        destacado: true
      }
    ];

    let insertados = 0;
    for (const p of productos) {
      await connection.query(
        `INSERT INTO products (nombre, precio, stock, descripcion, categoria, imagen, destacado, activo, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())`,
        [p.nombre, p.precio, p.stock, p.descripcion, p.categoria, p.imagen, p.destacado || false]
      );
      insertados++;
    }

    connection.release();
    res.json({ success: true, msg: `${insertados} productos insertados` });
  } catch (error) {
    console.error("ERROR POST /api/seed-products:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

const PORT = process.env.PORT || 5000;

// Solo escuchar en local (en Vercel, la funcion serverless maneja las requests)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

module.exports = app;
