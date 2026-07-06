import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, ShoppingBag, LogOut, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function AdminLayout() {
  const { logout, rol } = useAuthStore();
  const navigate = useNavigate();

  // Protect the route
  if (rol !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h2>
        <p className="text-gray-600 mb-6">No tienes permisos de administrador para ver esta página.</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-emerald text-white rounded-lg">
          Volver al Inicio
        </button>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: <Package size={20} />, label: 'Inventario', path: '/admin/inventario' },
    { icon: <Users size={20} />, label: 'Clientes', path: '/admin/clientes' },
    { icon: <ShoppingBag size={20} />, label: 'Pedidos', path: '/admin/pedidos' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-gray-50 border-t border-gray-200">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white shadow-md z-10 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-heading font-bold text-emerald">Panel Admin</h2>
          <p className="text-xs text-gray-500 mt-1">Gestión de Joyería AZ</p>
        </div>
        
        <nav className="flex-1 py-4 px-3 flex flex-col gap-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive 
                    ? 'bg-light-green text-emerald shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-emerald'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
