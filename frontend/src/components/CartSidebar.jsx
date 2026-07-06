import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export default function CartSidebar({ isOpen, onClose }) {
  const { items, removeFromCart, updateQuantity, clearCart, getTotalPrice } = useCartStore();

  const handleWhatsappCheckout = () => {
    if (items.length === 0) return;
    const mensaje = `🛒 *PEDIDO JOYERÍA AZ*\n\n` +
      items.map(item => 
        `✨ ${item.nombre}\n   Cantidad: ${item.cantidad}\n   Precio: $${Number(item.precio).toLocaleString()}\n`
      ).join('\n') + 
      `\n💎 *TOTAL: $${getTotalPrice().toLocaleString()} COP*`;
    
    // Replace the phone number with the actual one
    window.open(`https://wa.me/573001234567?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-heading font-bold text-emerald flex items-center gap-2">
            <ShoppingBag size={24} />
            Mi Carrito
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-emerald hover:bg-light-green rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 gap-4">
              <div className="w-24 h-24 rounded-full bg-light-green flex items-center justify-center text-emerald">
                <ShoppingBag size={48} />
              </div>
              <p className="font-sans text-lg">Tu carrito está vacío</p>
              <button 
                onClick={onClose}
                className="mt-4 text-emerald font-semibold hover:text-gold transition-colors"
              >
                Volver al catálogo
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <img 
                    src={item.imagen} 
                    alt={item.nombre}
                    className="w-20 h-20 object-cover rounded-xl"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <h4 className="font-heading font-semibold text-gray-800 line-clamp-1 pr-2">{item.nombre}</h4>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-end mt-2">
                      <span className="font-bold text-emerald">${Number(item.precio).toLocaleString()}</span>
                      
                      <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-gray-200">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-emerald hover:bg-light-green rounded transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-medium text-sm w-4 text-center">{item.cantidad}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-emerald hover:bg-light-green rounded transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-gray-100 bg-gray-50/50">
            <div className="flex justify-between items-center mb-6">
              <span className="font-sans text-gray-600">Total calculado</span>
              <span className="text-2xl font-bold font-heading text-emerald">
                ${getTotalPrice().toLocaleString()} <span className="text-sm text-gray-500 font-normal">COP</span>
              </span>
            </div>
            
            <button 
              onClick={handleWhatsappCheckout}
              className="w-full bg-emerald text-white py-4 rounded-xl font-heading font-bold text-lg hover:bg-[#1a5c3a] transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald/30 mb-3"
            >
              Comprar por WhatsApp
            </button>
            
            <button 
              onClick={clearCart}
              className="w-full py-3 text-red-500 font-medium hover:bg-red-50 rounded-xl transition-colors"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </>
  );
}
