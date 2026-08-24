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
const { renderProductPage, renderNotFound } = require('./product-page');
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
    clean[key] = Array.isArray(val)
      ? val.map(v => (typeof v === 'string' ? sanitize(v) : v))
      : (typeof val === 'string' ? sanitize(val) : val);
  }
  return clean;
}

// ============ SLUGS (URL amigables y únicas) ============
function slugify(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function generarSlugUnico(connection, base, exceptId) {
  let slug = slugify(base) || 'producto';
  if (!slug) slug = 'producto';
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = await connection.query(
      'SELECT id FROM products WHERE slug = $1 AND ($2::bigint IS NULL OR id <> $2)',
      [slug, exceptId || null]
    );
    if (rows.length === 0) return slug;
    slug = `${slugify(base) || 'producto'}-${n++}`;
  }
}

function normalizarArregloImagenes(val) {
  if (Array.isArray(val)) return val.filter(u => typeof u === 'string' && u.trim()).map(u => sanitize(u.trim()));
  if (typeof val === 'string' && val.trim()) {
    return val.split(',').map(s => s.trim()).filter(Boolean).map(s => sanitize(s));
  }
  return [];
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
  console.log("=== SUBIENDO A SUPABASE ===");

  console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
  console.log("SERVICE_ROLE:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log("ANON_KEY:", !!process.env.SUPABASE_ANON_KEY);
  console.log("SUPABASE_SERVICE_KEY:", !!process.env.SUPABASE_SERVICE_KEY);
  console.log("supabase client:", !!supabase);

  if (!supabase) throw new Error('Supabase no configurado');

  const ext = path.extname(file.originalname).toLowerCase();
  const nombre = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;

  console.log("Bucket:", BUCKET_NAME);
  console.log("Nombre:", nombre);
  console.log("Mime:", file.mimetype);
  console.log("Size:", file.size);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(nombre, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  console.log("SUPABASE UPLOAD RESULT:", { data, error });

  if (error) {
    console.error("SUPABASE UPLOAD ERROR:", error);
    console.error("MESSAGE:", error.message);
    console.error("statusCode:", error.statusCode);
    console.error("details:", error.details);
    console.error("hint:", error.hint);
    console.error("code:", error.code);
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(nombre);

  console.log("URL OBTENIDA:", urlData.publicUrl);
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

const dbUrl = process.env.DATABASE_URL;

console.log(
  "DATABASE_URL:",
  dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:******@")
);

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

    console.log("LOGIN DIAG: email recibido:", email);
    console.log("LOGIN DIAG: password recibida:", passInput ? `[longitud ${passInput.length}]` : "VACIA");

    if (!email || !passInput) {
      console.log("LOGIN DIAG: FALTAN CAMPOS → 400");
      return res.status(400).json({ error: 'Faltan email o contraseña' });
    }

    const connection = await db.getConnection();
    const { rows } = await connection.query('SELECT * FROM users WHERE email = $1', [email]);
    connection.release();

    console.log("LOGIN DIAG: usuarios encontrados:", rows.length);

    if (rows.length === 0) {
      console.log("LOGIN DIAG: NO EXISTE USUARIO con email:", email);
      console.log("LOGIN DIAG: SQL usada: SELECT * FROM users WHERE email = $1");
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const user = rows[0];
    const passHash = user.password || '';
    console.log("LOGIN DIAG: usuario id:", user.id, "| nombre:", user.nombre, "| rol:", user.rol);
    console.log("LOGIN DIAG: hash DB:", passHash ? passHash.substring(0, 20) + "..." : "VACIO");

    const esValida = await bcrypt.compare(passInput, passHash);
    console.log("LOGIN DIAG: bcrypt.compare:", esValida);

    if (!esValida) {
      console.log("LOGIN DIAG: PASSWORD INCORRECTA para usuario id:", user.id);
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    console.log("LOGIN DIAG: LOGIN EXITOSO para usuario id:", user.id);
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
    console.log("REGISTER DIAG: body raw:", JSON.stringify(req.body));
    const {
      email, password, nombre, apellidos,
      telefono, telefonoFijo, dni, fechaNacimiento, genero, empresa,
      pais, departamento, ciudad, direccion, direccion2, codigoPostal, referencia
    } = sanitizeObject(req.body);

    console.log("REGISTER DIAG: email:", email, "| password:", password ? `[longitud ${password.length}]` : "VACIO");

    if (!email || !password) {
      console.log("REGISTER DIAG: FALTAN CAMPOS → 400");
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const pwError = validatePassword(password);
    if (pwError) {
      console.log("REGISTER DIAG: VALIDACION PASSWORD FALLÓ:", pwError);
      return res.status(400).json({ error: pwError });
    }
    console.log("REGISTER DIAG: password OK, hasheando...");

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
      console.error("REGISTER DIAG: DB ERROR:", dbError.code, dbError.message);
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

// ============ PAGINA DE PRODUCTO (SERVER-RENDERED CON SEO/OG) ============
app.get('/p/:slug', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    if (!slug) return res.status(404).send(renderNotFound());

    const connection = await db.getConnection();
    const { rows } = await connection.query(
      'SELECT * FROM products WHERE slug = $1 AND activo = true',
      [slug]
    );

    if (rows.length === 0) {
      connection.release();
      return res.status(404).send(renderNotFound());
    }

    const product = rows[0];
    const relatedRes = await connection.query(
      `SELECT * FROM products WHERE activo = true AND id <> $1
         AND categoria = $2 ORDER BY "createdAt" DESC LIMIT 4`,
      [product.id, product.categoria || 'General']
    );
    connection.release();

    const html = renderProductPage({
      product,
      related: relatedRes.rows || []
    });
    res.send(html);
  } catch (error) {
    console.error("ERROR GET /p/:slug:", error.message);
    console.error(error.stack);
    res.status(500).send(renderNotFound());
  }
});

// ============ PROXY DE IMAGEN (para og:image / twitter:image) ============
// Sirve las imágenes de Supabase desde el dominio del sitio, evitando que los
// crawlers sociales (WhatsApp/Facebook) descarten la vista previa por las
// cabeceras no-cache + cookie de bot de Cloudflare/Supabase.
app.get('/api/img', async (req, res) => {
  const u = req.query.u;
  if (!u || !/^https?:\/\//.test(u)) return res.status(400).end('bad-url');
  if (!u.includes('supabase.co')) return res.status(403).end('forbidden-host');
  try {
    const resp = await fetch(u, { redirect: 'follow' });
    if (!resp.ok) return res.status(502).send('upstream-error');
    const buf = await resp.arrayBuffer();
    const ctype = resp.headers.get('content-type') || 'image/*';
    res.set('Content-Type', ctype);
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable');
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(Buffer.from(buf));
  } catch (e) {
    console.error("ERROR proxy de imagen:", e.message);
    res.status(502).send('proxy-error');
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

    const body = sanitizeObject(req.body);
    const {
      nombre, precio, stock, descripcion, categoria,
      descripcionCorta, descripcionCompleta, materiales, tipoPiedra,
      color, peso, medidas, estado, metaTitle, metaDescripcion, slug
    } = body;
    let imagenesSec = normalizarArregloImagenes(body.imagenes);
    let imagenCompartir = body.imagenCompartir ? sanitize(body.imagenCompartir) : null;
    let imagenUrl = null;

    if (req.file) {
      imagenUrl = await subirASupabase(req.file);
    }

    const connection = await db.getConnection();
    const slugFinal = await generarSlugUnico(connection, slug || nombre || 'producto', null);
    const precioFinal = (precio === '' || precio == null || isNaN(Number(precio))) ? 0 : Number(precio);
    const stockFinal = (stock === '' || stock == null || isNaN(parseInt(stock, 10))) ? 0 : parseInt(stock, 10);

    const result = await connection.query(
      `INSERT INTO products (nombre, precio, stock, descripcion, categoria, imagen, activo,
         slug, descripcion_corta, descripcion_completa, materiales, tipo_piedra, color, peso,
         medidas, estado, imagenes, imagen_compartir, meta_title, meta_descripcion,
         "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
       RETURNING id, slug`,
      [
        nombre, precioFinal, stockFinal, descripcion, categoria || 'General', imagenUrl,
        slugFinal, descripcionCorta || null, descripcionCompleta || null, materiales || null,
        tipoPiedra || null, color || null, peso || null, medidas || null, estado || 'disponible',
        JSON.stringify(imagenesSec), imagenCompartir,
        metaTitle || null, metaDescripcion || null
      ]
    );
    connection.release();

    res.json({ success: true, msg: 'Producto agregado', imagen: imagenUrl, slug: slugFinal, id: result.rows[0].id });
  } catch (error) {
    console.error("ERROR POST /api/inventario:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

app.put('/api/inventario/:id', auth, upload.single('imagen'), async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const body = sanitizeObject(req.body);
    const connection = await db.getConnection();

    const { rows: existing } = await connection.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const p = existing[0];

    const val = (field, current) => (body[field] !== undefined ? body[field] : current);
    const newNombre = val('nombre', p.nombre);

    let newSlug = p.slug || (await generarSlugUnico(connection, newNombre, p.id));
    if (body.slug !== undefined) {
      newSlug = slugify(body.slug) || newSlug;
    }

    const imagenesSec = body.imagenes !== undefined
      ? normalizarArregloImagenes(body.imagenes)
      : (Array.isArray(p.imagenes) ? p.imagenes : []);
    const imagenCompartir = body.imagenCompartir !== undefined ? (body.imagenCompartir ? sanitize(body.imagenCompartir) : null) : (p.imagen_compartir || null);

    let newImg = p.imagen;
    if (req.file) {
      if (p.imagen && p.imagen.includes('supabase')) {
        await eliminarDeSupabase(p.imagen);
      }
      newImg = await subirASupabase(req.file);
    }

    await connection.query(
      `UPDATE products SET nombre=$1, precio=$2, stock=$3, descripcion=$4, categoria=$5, imagen=$6,
         slug=$7, descripcion_corta=$8, descripcion_completa=$9, materiales=$10, tipo_piedra=$11,
         color=$12, peso=$13, medidas=$14, estado=$15, imagenes=$16, imagen_compartir=$17,
         meta_title=$18, meta_descripcion=$19, "updatedAt"=NOW()
       WHERE id=$20`,
      [
        newNombre, val('precio', p.precio), val('stock', p.stock), val('descripcion', p.descripcion),
        val('categoria', p.categoria), newImg, newSlug,
        val('descripcionCorta', p.descripcion_corta), val('descripcionCompleta', p.descripcion_completa || p.descripcion),
        val('materiales', p.materiales), val('tipoPiedra', p.tipo_piedra), val('color', p.color),
        val('peso', p.peso), val('medidas', p.medidas), val('estado', p.estado),
        JSON.stringify(imagenesSec), imagenCompartir,
        val('metaTitle', p.meta_title), val('metaDescripcion', p.meta_descripcion),
        req.params.id
      ]
    );

    connection.release();
    res.json({ success: true, msg: 'Producto actualizado', slug: newSlug });
  } catch (error) {
    console.error("ERROR PUT /api/inventario/:id:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

// ============ GALERIA DE IMAGENES (SECUNDARIAS + COMPARTIR) ============
app.post('/api/inventario/:id/galeria', auth, upload.fields([{ name: 'imagenes', maxCount: 6 }, { name: 'imagenCompartir', maxCount: 1 }, { name: 'imagen', maxCount: 1 }]), async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const connection = await db.getConnection();
    const { rows: existing } = await connection.query('SELECT id, imagenes, imagen_compartir, imagen FROM products WHERE id=$1', [req.params.id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const p = existing[0];
    const files = req.files || {};

    let imagenes = Array.isArray(p.imagenes) ? p.imagenes.slice() : [];
    if (files.imagenes) {
      for (const f of files.imagenes) {
        const url = await subirASupabase(f);
        imagenes.unshift(url);
      }
    }

    let imagenCompartir = p.imagen_compartir || null;
    if (files.imagenCompartir && files.imagenCompartir[0]) {
      imagenCompartir = await subirASupabase(files.imagenCompartir[0]);
    }

    let imagenMain = p.imagen;
    if (files.imagen && files.imagen[0]) {
      if (p.imagen && p.imagen.includes('supabase')) await eliminarDeSupabase(p.imagen);
      imagenMain = await subirASupabase(files.imagen[0]);
    }

    await connection.query(
      'UPDATE products SET imagenes=$1, imagen_compartir=$2, imagen=$3, "updatedAt"=NOW() WHERE id=$4',
      [JSON.stringify(imagenes), imagenCompartir, imagenMain, req.params.id]
    );
    connection.release();

    res.json({ success: true, msg: 'Galería actualizada', imagenes, imagen_compartir: imagenCompartir, imagen: imagenMain });
  } catch (error) {
    console.error("ERROR POST /api/inventario/:id/galeria:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: process.env.NODE_ENV !== "production" ? error.stack : undefined });
  }
});

// ============ ELIMINAR IMAGEN DE GALERIA ============
app.delete('/api/inventario/:id/galeria', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Falta la url de la imagen' });

    const connection = await db.getConnection();
    const { rows: existing } = await connection.query('SELECT imagenes FROM products WHERE id=$1', [req.params.id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const imagenes = (Array.isArray(existing[0].imagenes) ? existing[0].imagenes : []).filter(u => u !== url);
    await connection.query('UPDATE products SET imagenes=$1, "updatedAt"=NOW() WHERE id=$2', [JSON.stringify(imagenes), req.params.id]);
    if (url.includes('supabase')) await eliminarDeSupabase(url);
    connection.release();
    res.json({ success: true, imagenes });
  } catch (error) {
    console.error("ERROR DELETE /api/inventario/:id/galeria:", error.message);
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

// ============ SERVICIOS SEO DINÁMICOS ============

function xmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// robots.txt — dinámico (SITE_URL derivado del host en producción)
app.get('/robots.txt', (req, res) => {
  const base = req.protocol + '://' + req.get('host');
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /inventario.html
Disallow: /usuarios.html
Disallow: /cuenta.html
Disallow: /frontend/
Disallow: /seed
Disallow: /*?*

Sitemap: ${base}/sitemap.xml
`);
});

// sitemap.xml — productos públicos + páginas principales (sin panel/admin)
app.get('/sitemap.xml', async (req, res) => {
  try {
    const base = req.protocol + '://' + req.get('host');
    const connection = await db.getConnection();
    const { rows } = await connection.query(
      `SELECT slug, "updatedAt" FROM products WHERE activo = true AND slug IS NOT NULL AND slug <> '' ORDER BY "updatedAt" DESC`
    );
    connection.release();

    const paginas = [
      { loc: '/', prio: 1.0 },
      { loc: '/pages/joyeria.html', prio: 0.9 },
      { loc: '/pages/esmeraldas.html', prio: 0.9 },
      { loc: '/pages/nosotros.html', prio: 0.6 }
    ];

    const urls = paginas.map(p => {
      const fecha = rows[0] ? new Date(rows[0].updatedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      return `<url><loc>${base}${p.loc}</loc><lastmod>${fecha}</lastmod><priority>${p.prio}</priority></url>`;
    }).concat(rows.map(r => {
      const fecha = r.updatedAt ? new Date(r.updatedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      return `<url><loc>${base}/p/${xmlEscape(r.slug)}</loc><lastmod>${fecha}</lastmod><priority>0.8</priority></url>`;
    }));

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('\n')}</urlset>`);
  } catch (error) {
    console.error("ERROR sitemap:", error.message);
    res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

// feed.xml — Google Merchant Center (productos activos)
app.get('/api/feed.xml', async (req, res) => {
  try {
    const connection = await db.getConnection();
    const { rows } = await connection.query(
      `SELECT id, nombre, slug, precio, stock, descripcion, descripcion_completa, imagen, imagenes,
              categoria, materiales, estado, meta_title, "updatedAt"
         FROM products WHERE activo = true ORDER BY "updatedAt" DESC`
    );
    connection.release();
    const base = 'https://joyeria-az.vercel.app';

    const items = rows.map(p => {
      const img = p.imagen || (Array.isArray(p.imagenes) && p.imagenes[0]) || `${base}/img/ALE.png`;
      const desc = (p.descripcion_completa || p.descripcion || p.nombre || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
      const precio = Number(p.precio || 0).toFixed(2);
      const disponible = Number(p.stock || 0) > 0 && ['disponible', 'nuevo', 'pedido'].includes(p.estado);
      return `<item>
  <g:id>${xmlEscape(String(p.id))}</g:id>
  <g:title>${xmlEscape(p.nombre)}</g:title>
  <g:description>${xmlEscape(desc)}</g:description>
  <g:link>${base}/p/${xmlEscape(p.slug || '')}</g:link>
  <g:image_link>${xmlEscape(img)}</g:image_link>
  <g:price>${precio} COP</g:price>
  <g:availability>${disponible ? 'in stock' : 'out of stock'}</g:availability>
  <g:condition>new</g:condition>
  <g:brand>Joyería AZ</g:brand>
  <g:google_product_category>Apparel &amp; Accessories &gt; Jewelry</g:google_product_category>
</item>`;
    });

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
<title>Joyería AZ — Productos</title>
<link>${base}</link>
<description>Catálogo de joyería fina artesanal colombiana</description>${items.join('')}
</channel>
</rss>`);
  } catch (error) {
    console.error("ERROR feed.xml:", error.message);
    res.status(500).send('<?xml version="1.0"?><rss version="2.0"></rss>');
  }
});

// ============ IA — CREACIÓN MASIVA DE PRODUCTOS ============
const { createAiRouter } = require('./ai/routes');
app.use('/api/ai', createAiRouter({ auth }));

const PORT = process.env.PORT || 5000;

// Solo escuchar en local (en Vercel, la funcion serverless maneja las requests)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

module.exports = app;
