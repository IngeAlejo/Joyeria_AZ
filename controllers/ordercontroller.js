const db = require('../models');

exports.crearOrden = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { productos } = req.body;

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }

    let total = 0;
    let detalles = '';

    for (let item of productos) {
      const prod = await db.Product.findByPk(item.productId, { transaction: t, lock: true });
      if (!prod) {
        await t.rollback();
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      if (prod.stock < item.cantidad) {
        await t.rollback();
        return res.status(400).json({ error: `Stock insuficiente: ${prod.nombre}` });
      }

      total += parseFloat(prod.precio) * item.cantidad;
      detalles += `${prod.nombre} x${item.cantidad} = $${prod.precio * item.cantidad}, `;

      await prod.update({ stock: prod.stock - item.cantidad }, { transaction: t });
    }

    const orden = await db.Order.create({
      userId: req.userId,
      numeroOrden: 'ORD-' + Date.now(),
      totalPrecio: total,
      estado: 'pendiente',
      notasCliente: detalles,
      metodoPago: 'whatsapp',
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      mensaje: 'Orden creada exitosamente',
      orden: orden.dataValues,
      whatsapp: `¡Nueva orden #${orden.numeroOrden}! Total: $${total}\n${detalles}`,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: 'Error al crear la orden' });
  }
};

exports.obtenerMisOrdenes = async (req, res) => {
  try {
    const ordenes = await db.Order.findAll({ where: { userId: req.userId } });
    res.json({ ordenes });
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar las órdenes' });
  }
};

exports.obtenerTodas = async (req, res) => {
  try {
    const ordenes = await db.Order.findAll({
      include: [{ model: db.User, attributes: ['id', 'nombre', 'email'] }],
    });
    res.json({ ordenes });
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar las órdenes' });
  }
};
