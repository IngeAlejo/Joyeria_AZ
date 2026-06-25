import { useState, useEffect } from 'react';
import { Truck, CheckCircle, Package, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/historial', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setOrders(data.ordenes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/historial/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ estado: newStatus })
      });
      
      if (res.ok) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, estado: newStatus } : o));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'confirmada': 'bg-blue-100 text-blue-800',
      'enviada': 'bg-purple-100 text-purple-800',
      'entregada': 'bg-green-100 text-green-800',
      'cancelada': 'bg-red-100 text-red-800'
    };
    return `px-3 py-1 rounded-full text-xs font-bold uppercase ${styles[status] || styles['pendiente']}`;
  };

  if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="animate-spin text-emerald" size={40} /></div>;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-900">Historial de Pedidos</h1>
        <p className="text-gray-500">Realiza seguimiento a las compras</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left bg-white">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
            <tr>
              <th className="py-4 px-6 font-medium"># Orden</th>
              <th className="py-4 px-6 font-medium">Cliente</th>
              <th className="py-4 px-6 font-medium">Total</th>
              <th className="py-4 px-6 font-medium">Estado</th>
              <th className="py-4 px-6 font-medium">Fecha</th>
              <th className="py-4 px-6 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="py-4 px-6 font-medium text-emerald">{order.numeroOrden || `ORD-${order.id}`}</td>
                <td className="py-4 px-6">
                  <p className="text-gray-900 font-medium">{order.userName || 'Usuario'}</p>
                  <p className="text-gray-500 text-xs">{order.userEmail}</p>
                </td>
                <td className="py-4 px-6 font-bold">${Number(order.totalPrecio).toLocaleString()}</td>
                <td className="py-4 px-6">
                  <span className={getStatusBadge(order.estado)}>{order.estado}</span>
                </td>
                <td className="py-4 px-6 text-gray-500 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="py-4 px-6 text-right">
                  <select
                    value={order.estado}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-emerald focus:border-emerald inline-block w-40 p-2"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="enviada">Enviada</option>
                    <option value="entregada">Entregada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan="6" className="py-8 text-center text-gray-500">No hay pedidos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
