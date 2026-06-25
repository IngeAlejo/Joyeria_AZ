import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Jewelry from './pages/Jewelry';
import CartSidebar from './components/CartSidebar';
import AuthModal from './components/AuthModal';
import Esmeraldas from './pages/Esmeraldas';
import Nosotros from './pages/Nosotros';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Inventory from './pages/admin/Inventory';
import Customers from './pages/admin/Customers';
import Orders from './pages/admin/Orders';

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-gray-900">
      <Navbar onCartClick={() => setIsCartOpen(true)} />
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <AuthModal />

      <ScrollToTop />
      <main className="flex-grow pt-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/joyeria" element={<Jewelry />} />
          <Route path="/esmeraldas" element={<Esmeraldas />} />
          <Route path="/nosotros" element={<Nosotros />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventario" element={<Inventory />} />
            <Route path="clientes" element={<Customers />} />
            <Route path="pedidos" element={<Orders />} />
          </Route>
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
