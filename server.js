const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// ============ CONFIGURACIÓN DE MULTER ============
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/') // Asegúrate de crear esta carpeta
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

const app = express();

// ============ CONEXIÓN POSTGRESQL (SUPABASE) ============
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Polyfill for mysql2-like getConnection
db.getConnection = async () => {
  const client = await db.connect();
  return client;
};

// Middlewares
app.use(cors());
app.use(bodyParser.json());
// Servir archivos estáticos incluyendo la carpeta de subidas
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ============ LOGIN ============
app.post('/api/login', async (req, res) => {
  try {
    console.log('🔑 Login intentado:', req.body.email);
    // Acepta 'password' (frontend) o 'contraseña' (legacy)
    const { email, password, contraseña } = req.body;
    const passInput = password || contraseña;

    if (!email || !passInput) {
      return res.status(400).json({ error: 'Faltan email o contraseña' });
    }

    const connection = await db.getConnection();
    const { rows } = await connection.query('SELECT * FROM users WHERE email = $1', [email]);
    connection.release();

    if (rows.length === 0) {
      console.log('❌ Usuario no encontrado:', email);
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const user = rows[0];
    const passHash = user.password || '';
    const esValida = bcrypt.compareSync(passInput, passHash);

    if (!esValida) {
      console.log('❌ Contraseña incorrecta');
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      'tu-secret-key-super-secreta',
      { expiresIn: '7d' }
    );

    console.log('✅ Login exitoso:', email);
    res.json({
      token,
      rol: user.rol,
      nombre: user.nombre,
      success: true
    });
  } catch (error) {
    console.error('❌ Error login completo:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});


// ============ REGISTER ============
app.post('/api/register', async (req, res) => {
  try {
    console.log('📝 Registro intentado:', req.body.email);
    const {
      email, password, nombre, apellidos,
      telefono, telefonoFijo, dni, fechaNacimiento, genero, empresa,
      pais, departamento, ciudad, direccion, direccion2, codigoPostal, referencia
    } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'La contraseña es obligatoria' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const connection = await db.getConnection();

    try {
      const result = await connection.query(
        `INSERT INTO users (
          email, password, nombre, apellidos,
          telefono, telefonoFijo, dni, fechaNacimiento, genero, empresa,
          pais, departamento, ciudad, direccion, direccion2, codigoPostal, referencia,
          rol, createdAt, updatedAt
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'cliente', NOW(), NOW()) RETURNING id`,
        [
          email, hash, nombre || 'Cliente', apellidos || '',
          telefono || null, telefonoFijo || null, dni || null, fechaNacimiento || null, genero || null, empresa || null,
          pais || null, departamento || null, ciudad || null, direccion || null, direccion2 || null, codigoPostal || null, referencia || null
        ]
      );
      console.log('✅ Usuario registrado:', email);
      res.json({
        success: true,
        token: jwt.sign(
          { id: result.rows[0].id, rol: 'cliente' },
          'tu-secret-key-super-secreta',
          { expiresIn: '7d' }
        ),
        nombre: nombre,
        rol: 'cliente'
      });
    } catch (dbError) {
      if (dbError.code === '23505') {
        res.status(400).json({ error: 'El email ya está registrado' });
      } else {
        throw dbError;
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error register:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// ============ MIDDLEWARE AUTH ============
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Sin token' });
  }

  try {
    const decoded = jwt.verify(token, 'tu-secret-key-super-secreta');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ============ PERFIL DE USUARIO ============
app.put('/api/users/profile', auth, async (req, res) => {
  try {
    const { nombre, apellidos, telefono } = req.body;
    const connection = await db.getConnection();
    await connection.query(
      'UPDATE users SET nombre=$1, apellidos=$2, telefono=$3, updatedAt=NOW() WHERE id=$4',
      [nombre, apellidos || '', telefono || '', req.user.id]
    );
    connection.release();
    res.json({ success: true, msg: 'Perfil actualizado' });
  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// ============ PRODUCTOS PÚBLICOS (sin auth) ============
app.get('/api/products', async (req, res) => {
  try {
    const connection = await db.getConnection();
    const { rows } = await connection.query(
      'SELECT * FROM products WHERE activo = 1 ORDER BY createdAt DESC'
    );
    connection.release();
    res.json({ productos: rows });
  } catch (error) {
    console.error('❌ Error /api/products:', error);
    res.status(500).json({ error: error.message || 'Error al cargar productos' });
  }
});

// ============ INVENTARIO (solo admin) ============
app.get('/api/inventario', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const connection = await db.getConnection();
    const { rows } = await connection.query('SELECT * FROM products ORDER BY createdAt DESC');
    connection.release();

    res.json({ productos: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventario', auth, upload.single('imagen'), async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const { nombre, precio, stock, descripcion, categoria } = req.body;
    const imagenPath = req.file ? `/uploads/${req.file.filename}` : null;
    const connection = await db.getConnection();

    await connection.query(
      'INSERT INTO products (nombre, precio, stock, descripcion, categoria, imagen, activo, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $6, 1, NOW(), NOW())',
      [nombre, precio, stock, descripcion, categoria || 'General', imagenPath]
    );
    connection.release();

    res.json({ success: true, msg: 'Producto agregado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inventario/:id', auth, upload.single('imagen'), async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const { nombre, precio, stock, descripcion, categoria } = req.body;
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
    const newImg = req.file ? `/uploads/${req.file.filename}` : p.imagen;

    await connection.query(
      'UPDATE products SET nombre=$1, precio=$2, stock=$3, descripcion=$4, categoria=$5, imagen=$6, updatedAt=NOW() WHERE id=$7',
      [newNombre, newPrecio, newStock, newDesc, newCat, newImg, req.params.id]
    );

    connection.release();

    res.json({ success: true, msg: 'Producto actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// ============ HISTORIAL VENTAS (solo admin) ============
app.get('/api/historial', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const connection = await db.getConnection();
    const { rows } = await connection.query(`
      SELECT o.*, u.nombre as userName, u.email as userEmail 
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      ORDER BY o.createdAt DESC
    `);
    connection.release();

    res.json({ ordenes: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/historial/:id/status', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const { estado } = req.body;
    const connection = await db.getConnection();

    await connection.query(
      'UPDATE orders SET estado=$1, updatedAt=NOW() WHERE id=$2',
      [estado, req.params.id]
    );
    connection.release();

    res.json({ success: true, msg: 'Estado actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PRODUCTOS ============
app.get('/api/products', async (req, res) => {
  try {
    const connection = await db.getConnection();
    const { rows } = await connection.query('SELECT * FROM products WHERE activo = 1 ORDER BY createdAt DESC');
    connection.release();

    res.json({ productos: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ADMINISTRACIÓN EXTRA ============

// Crear Usuario (Admin)
app.post('/api/admin/users', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const { nombre, apellidos, email, password, telefono, rol } = req.body;
    if (!password) return res.status(400).json({ error: 'La contraseña es obligatoria' });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const connection = await db.getConnection();

    try {
      await connection.query(
        `INSERT INTO users (nombre, apellidos, email, password, telefono, rol, createdAt, updatedAt) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [nombre, apellidos || '', email, hash, telefono || null, rol || 'cliente']
      );
      res.json({ success: true, msg: 'Usuario creado exitosamente' });
    } catch (dbError) {
      if (dbError.code === '23505') res.status(400).json({ error: 'El email ya está registrado' });
      else throw dbError;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener Usuarios
app.get('/api/admin/users', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const connection = await db.getConnection();
    const { rows } = await connection.query('SELECT id, nombre, apellidos, email, telefono, telefonoFijo, dni, fechaNacimiento, genero, empresa, pais, departamento, ciudad, direccion, direccion2, codigoPostal, referencia, rol, createdAt FROM users ORDER BY createdAt DESC');
    connection.release();

    res.json({ users: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cambiar Rol
app.put('/api/admin/users/:id/role', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const { rol } = req.body;
    const connection = await db.getConnection();
    await connection.query('UPDATE users SET rol=$1, updatedAt=NOW() WHERE id=$2', [rol, req.params.id]);
    connection.release();

    res.json({ success: true, msg: 'Rol actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar Usuario
app.delete('/api/admin/users/:id', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });
    const connection = await db.getConnection();
    await connection.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    connection.release();
    res.json({ success: true, msg: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Editar Usuario Completamente
app.put('/api/admin/users/:id', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const {
      nombre, apellidos, email, telefono, telefonoFijo, dni, fechaNacimiento, genero, empresa,
      pais, departamento, ciudad, direccion, direccion2, codigoPostal, referencia, rol
    } = req.body;
    const connection = await db.getConnection();

    await connection.query(
      `UPDATE users SET 
        nombre=$1, apellidos=$2, email=$3, telefono=$4, telefonoFijo=$5,
        dni=$6, fechaNacimiento=$7, genero=$8, empresa=$9,
        pais=$10, departamento=$11, ciudad=$12, direccion=$13, direccion2=$14, codigoPostal=$15, referencia=$16,
        rol=$17, updatedAt=NOW() WHERE id=$18`,
      [
        nombre, apellidos, email, telefono || null, telefonoFijo || null,
        dni || null, fechaNacimiento || null, genero || null, empresa || null,
        pais || null, departamento || null, ciudad || null, direccion || null, direccion2 || null, codigoPostal || null, referencia || null,
        rol, req.params.id
      ]
    );
    connection.release();

    res.json({ success: true, msg: 'Usuario actualizado completamente' });
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ error: 'El email ya está en uso' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Estadísticas para Dashboard
app.get('/api/admin/stats', auth, async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });

    const connection = await db.getConnection();

    const usersResult = await connection.query('SELECT COUNT(*) as total_users FROM users');
    const productsResult = await connection.query('SELECT COUNT(*) as total_products FROM products WHERE activo=1');
    const ordersResult = await connection.query('SELECT COUNT(*) as total_orders FROM orders');
    const revenueResult = await connection.query("SELECT COALESCE(SUM(totalPrecio), 0) as total_revenue FROM orders WHERE estado != 'cancelada'");

    const totalUsers = usersResult.rows[0].total_users;
    const totalProducts = productsResult.rows[0].total_products;
    const totalOrders = ordersResult.rows[0].total_orders;
    const totalRevenue = revenueResult.rows[0].total_revenue;

    connection.release();

    res.json({
      stats: {
        users: totalUsers,
        products: totalProducts,
        orders: totalOrders,
        revenue: totalRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Al FINAL de server.js, ANTES de app.listen()

app.get('/api/test-db', async (req, res) => {
  try {
    const connection = await db.getConnection();
    const { rows } = await connection.query('SELECT 1 as test');
    connection.release();
    res.json({
      success: true,
      msg: '✅ Conexión BD funcionando perfectamente',
      resultado: rows
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      msg: '❌ Error de conexión'
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
