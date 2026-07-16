const db = require('../models');
const Product = db.Product;

exports.obtenerTodos = async (req, res) => {
  try {
    const productos = await Product.findAll({
      where: { activo: true },
      order: [['createdAt', 'DESC']],
    });
    res.json({ total: productos.length, productos });
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar productos' });
  }
};

exports.obtenerPorId = async (req, res) => {
  try {
    const producto = await Product.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ producto });
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar el producto' });
  }
};

exports.obtenerPorCategoria = async (req, res) => {
  try {
    const productos = await Product.findAll({
      where: { categoria: req.params.categoria, activo: true },
      order: [['createdAt', 'DESC']],
    });
    res.json({ total: productos.length, productos });
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar productos' });
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, categoria, imagen } = req.body;
    if (!nombre || !precio || stock === undefined) {
      return res.status(400).json({ error: 'Nombre, precio y stock son requeridos' });
    }
    if (parseFloat(precio) <= 0) return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    if (parseInt(stock) < 0) return res.status(400).json({ error: 'El stock no puede ser negativo' });

    const producto = await Product.create({ nombre, descripcion, precio, stock, categoria, imagen, activo: true });
    res.status(201).json({ mensaje: 'Producto creado exitosamente', producto });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el producto' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, categoria, imagen, activo } = req.body;
    const producto = await Product.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    if (precio !== undefined && parseFloat(precio) <= 0) return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    if (stock !== undefined && parseInt(stock) < 0) return res.status(400).json({ error: 'El stock no puede ser negativo' });

    await producto.update({
      nombre: nombre !== undefined ? nombre : producto.nombre,
      descripcion: descripcion !== undefined ? descripcion : producto.descripcion,
      precio: precio !== undefined ? precio : producto.precio,
      stock: stock !== undefined ? stock : producto.stock,
      categoria: categoria !== undefined ? categoria : producto.categoria,
      imagen: imagen !== undefined ? imagen : producto.imagen,
      activo: activo !== undefined ? activo : producto.activo,
    });
    res.json({ mensaje: 'Producto actualizado exitosamente', producto });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const producto = await Product.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    await producto.update({ activo: false });
    res.json({ mensaje: 'Producto eliminado exitosamente', producto });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
};

exports.descontarStock = async (productId, cantidad) => {
  const t = await db.sequelize.transaction();
  try {
    const producto = await Product.findByPk(productId, { transaction: t, lock: true });
    if (!producto) throw new Error('Producto no encontrado');
    if (producto.stock < cantidad) throw new Error('Stock insuficiente');
    await producto.update({ stock: producto.stock - cantidad }, { transaction: t });
    await t.commit();
    return true;
  } catch (error) {
    await t.rollback();
    throw new Error('Error al descontar stock');
  }
};
