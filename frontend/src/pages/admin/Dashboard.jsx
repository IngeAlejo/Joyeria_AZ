import { useState, useEffect } from 'react';
import { Users, Package, DollarSign, ShoppingBag, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../config';

export default function Dashboard() {
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuthStore();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setStats(data.stats);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-emerald" size={40} /></div>;
  }

  const statCards = [
    { title: 'Generado', value: `$${Number(stats.revenue || 0).toLocaleString()}`, icon: <DollarSign size={24} />, bg: 'bg-green-100', color: 'text-green-600' },
    { title: 'Pedidos', value: stats.orders, icon: <ShoppingBag size={24} />, bg: 'bg-blue-100', color: 'text-blue-600' },
    { title: 'Clientes Registrados', value: stats.users, icon: <Users size={24} />, bg: 'bg-purple-100', color: 'text-purple-600' },
    { title: 'Productos Activos', value: stats.products, icon: <Package size={24} />, bg: 'bg-orange-100', color: 'text-orange-600' },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">Visión General</h1>
      <p className="text-gray-500 mb-8">Bienvenido al panel, revisa las métricas principales de tu joyería.</p>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-xl ${card.bg} ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{card.title}</p>
              <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
