const db = require('../models');
const Product = db.Product;

// OBTENER TODOS LOS PRODUCTOS (público)
exports.obtenerTodos = async (req, res) => {
  try {
    const productos = await Product.findAll({
      where: { activo: true },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: productos.length,
      productos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// OBTENER UN PRODUCTO POR ID (público)
exports.obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await Product.findByPk(id);

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ producto });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// OBTENER PRODUCTOS POR CATEGORÍA (público)
exports.obtenerPorCategoria = async (req, res) => {
  try {
    const { categoria } = req.params;
    const productos = await Product.findAll({
      where: { categoria, activo: true },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: productos.length,
      productos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREAR PRODUCTO (solo admin)
exports.crear = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, categoria, imagen } = req.body;

    // Validaciones
    if (!nombre || !precio || stock === undefined) {
      return res.status(400).json({
        error: 'Nombre, precio y stock son requeridos',
      });
    }

    if (parseFloat(precio) <= 0) {
      return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    }

    if (parseInt(stock) < 0) {
      return res.status(400).json({ error: 'El stock no puede ser negativo' });
    }

    const producto = await Product.create({
      nombre,
      descripcion,
      precio,
      stock,
      categoria,
      imagen,
      activo: true,
    });

    res.status(201).json({
      mensaje: 'Producto creado exitosamente',
      producto,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ACTUALIZAR PRODUCTO (solo admin)
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, categoria, imagen, activo } = req.body;

    const producto = await Product.findByPk(id);

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Validaciones
    if (precio !== undefined && parseFloat(precio) <= 0) {
      return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    }

    if (stock !== undefined && parseInt(stock) < 0) {
      return res.status(400).json({ error: 'El stock no puede ser negativo' });
    }

    // Actualiza solo los campos proporcionados
    await producto.update({
      nombre: nombre !== undefined ? nombre : producto.nombre,
      descripcion: descripcion !== undefined ? descripcion : producto.descripcion,
      precio: precio !== undefined ? precio : producto.precio,
      stock: stock !== undefined ? stock : producto.stock,
      categoria: categoria !== undefined ? categoria : producto.categoria,
      imagen: imagen !== undefined ? imagen : producto.imagen,
      activo: activo !== undefined ? activo : producto.activo,
    });

    res.json({
      mensaje: 'Producto actualizado exitosamente',
      producto,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ELIMINAR PRODUCTO (solo admin - soft delete)
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Product.findByPk(id);

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Soft delete: marcar como inactivo en lugar de borrar
    await producto.update({ activo: false });

    res.json({
      mensaje: 'Producto eliminado exitosamente',
      producto,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DESCONTAR STOCK (usado cuando se completa una orden)
exports.descontarStock = async (productId, cantidad) => {
  try {
    const producto = await Product.findByPk(productId);

    if (!producto) {
      throw new Error('Producto no encontrado');
    }

    if (producto.stock < cantidad) {
      throw new Error('Stock insuficiente');
    }

    await producto.update({
      stock: producto.stock - cantidad,
    });

    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};
