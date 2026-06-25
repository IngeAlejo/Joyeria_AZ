import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, LogIn, LogOut, Menu, X, Gem, ShieldAlert } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export default function Navbar({ onCartClick }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const { isAuthenticated, nombre, rol, setAuthModalOpen, logout } = useAuthStore();
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const cartItemsCount = getTotalItems();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Catálogo', path: '/joyeria' },
    { name: 'Esmeraldas', path: '/esmeraldas' },
    { name: 'Nosotros', path: '/nosotros' },
  ];

  return (
    <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-md py-2' : 'bg-white py-4'} border-b-2 border-light-green`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-emerald text-white p-2 rounded-lg group-hover:bg-gold transition-colors">
            <Gem size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-xl tracking-widest text-emerald uppercase w-full block">AZ</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold -mt-1">Joyería</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex gap-6">
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path}
                className={`font-medium relative overflow-hidden group py-2
                  ${location.pathname === link.path ? 'text-emerald font-semibold' : 'text-gray-700 hover:text-emerald'}`}
              >
                {link.name}
                <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald via-gold to-emerald transform transition-transform duration-300 ${location.pathname === link.path ? 'translate-x-0' : '-translate-x-full group-hover:translate-x-0'}`}></span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4 ml-4">
            {isAuthenticated ? (
              <div className="relative group cursor-pointer">
                <div className="flex items-center gap-2 text-emerald font-medium bg-light-green px-4 py-2 rounded-full border border-emerald/20 hover:bg-emerald/10 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-emerald text-white flex items-center justify-center text-xs font-bold uppercase">
                    {nombre ? nombre.charAt(0) : 'U'}
                  </div>
                  <span className="max-w-[100px] truncate">{nombre}</span>
                </div>
                
                {/* Dropdown Menu */}
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100 z-50">
                  <div className="p-2 flex flex-col gap-1">
                    {rol === 'admin' && (
                      <Link to="/admin/inventario" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-light-green hover:text-emerald rounded-lg transition-colors">
                        <ShieldAlert size={16} /> Admin Panel
                      </Link>
                    )}
                    <button 
                      onClick={logout}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full text-left"
                    >
                      <LogOut size={16} /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2 text-gray-700 hover:text-emerald transition-colors font-medium bg-gray-50 px-4 py-2 rounded-full border border-gray-200 hover:border-emerald/30 hover:bg-light-green"
              >
                <LogIn size={20} />
                <span>Ingresar</span>
              </button>
            )}

            <button 
              className="relative p-2 text-gray-700 hover:text-emerald transition-colors"
              onClick={onCartClick}
            >
              <ShoppingCart size={24} />
              {cartItemsCount > 0 && (
                <span className="absolute top-0 right-0 bg-emerald text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full transform translate-x-1 -translate-y-1">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-4">
          <button 
            className="relative p-2 text-gray-700"
            onClick={onCartClick}
          >
            <ShoppingCart size={24} />
            {cartItemsCount > 0 && (
              <span className="absolute top-0 right-0 bg-emerald text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full transform translate-x-1 -translate-y-1">
                {cartItemsCount}
              </span>
            )}
          </button>
          <button 
            className="text-gray-700 hover:text-emerald p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-lg py-4 px-4 flex flex-col gap-4 animate-in slide-in-from-top-4">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path}
              className={`text-lg font-medium p-2 rounded-lg 
                ${location.pathname === link.path ? 'bg-light-green text-emerald' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <div className="h-px bg-gray-200 my-2"></div>
          {isAuthenticated ? (
            <>
              {rol === 'admin' && (
                <Link to="/admin/inventario" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-lg text-emerald p-2 hover:bg-light-green rounded-lg">
                  <ShieldAlert size={24} />
                  <span>Admin Panel</span>
                </Link>
              )}
              <button 
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 text-lg text-red-600 p-2 hover:bg-red-50 rounded-lg w-full text-left"
              >
                <LogOut size={24} />
                <span>Cerrar Sesión</span>
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                setAuthModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 text-lg text-gray-700 p-2 hover:bg-gray-50 rounded-lg w-full text-left"
            >
              <LogIn size={24} />
              <span>Iniciar Sesión</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
