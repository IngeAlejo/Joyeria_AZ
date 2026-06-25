const db = require('../models');

exports.crearOrden = async (req, res) => {
  try {
    console.log('Body:', req.body);
    console.log('userId:', req.userId);

    const { productos } = req.body;

    if (!productos || productos.length === 0) {
      return res.status(400).json({ error: 'Sin productos' });
    }

    let total = 0;
    let detalles = '';

    // Procesa productos
    for (let item of productos) {
      const prod = await db.Product.findByPk(item.productId);
      if (!prod) return res.status(404).json({ error: 'Producto no existe' });
      if (prod.stock < item.cantidad) {
        return res.status(400).json({ error: `Stock insuficiente: ${prod.nombre}` });
      }

      total += parseFloat(prod.precio) * item.cantidad;
      detalles += `${prod.nombre} x${item.cantidad} = $${prod.precio * item.cantidad}, `;

      // Descuenta stock
      await prod.update({ stock: prod.stock - item.cantidad });
    }

    // Crea orden SIMPLE (sin OrderItem)
    const orden = await db.Order.create({
      userId: req.userId,
      numeroOrden: 'ORD-' + Date.now(),
      totalPrecio: total,
      estado: 'pendiente',
      notasCliente: detalles,
      metodoPago: 'whatsapp',
    });

    res.status(201).json({
      mensaje: '✅ ORDEN CREADA',
      orden: orden.dataValues,
      whatsapp: `¡Nueva orden #${orden.numeroOrden}! Total: $${total}\n${detalles}`,
    });

  } catch (error) {
    console.error('ERROR:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerMisOrdenes = async (req, res) => {
  const ordenes = await db.Order.findAll({
    where: { userId: req.userId },
  });
  res.json({ ordenes });
};

exports.obtenerTodas = async (req, res) => {
  const ordenes = await db.Order.findAll({
    include: [{ model: db.User }],
  });
  res.json({ ordenes });
};
