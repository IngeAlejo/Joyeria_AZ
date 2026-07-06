import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { API_URL } from '../config';

export default function ProductCard({ product }) {
  const addToCart = useCartStore((state) => state.addToCart);

  const handleAddToCart = () => {
    addToCart(product);
  };

  const isOutOfStock = product.stock === 0;

  return (
    <div className="group bg-white rounded-2xl overflow-hidden transition-all duration-400 border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-emerald/10 hover:-translate-y-2 relative">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald via-gold to-emerald opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
      
      {/* Product Image */}
      <div className="relative h-72 overflow-hidden bg-gray-50">
        <img 
          src={product.imagen 
            ? (product.imagen.startsWith('http') ? product.imagen : `${API_URL}${product.imagen}`)
            : 'https://via.placeholder.com/400x400/2D7A4A/FFF?text=Joya'} 
          alt={product.nombre}
          className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
        />
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-md backdrop-blur-md ${isOutOfStock ? 'bg-red-500/90' : 'bg-gradient-to-r from-emerald to-[#1a5c3a]'}`}>
            {isOutOfStock ? 'Sin stock' : `${product.stock} disp.`}
          </span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-6 flex flex-col h-full">
        <h3 className="text-xl font-heading font-semibold text-emerald mb-2 group-hover:text-[#1a5c3a] transition-colors">{product.nombre}</h3>
        <p className="text-gray-600 text-sm mb-6 flex-grow line-clamp-2 leading-relaxed">
          {product.descripcion || 'Joya exclusiva con diseño artesanal.'}
        </p>

        {/* Price and Action */}
        <div className="mt-auto">
          <div className="flex justify-between items-end mb-4">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Precio</span>
              <span className="text-2xl font-heading font-bold text-emerald">
                ${Number(product.precio).toLocaleString()} <span className="text-sm font-normal text-gray-500">COP</span>
              </span>
            </div>
          </div>

          <button 
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-semibold transition-all duration-300 
              ${isOutOfStock 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-emerald text-white hover:bg-[#1a5c3a] hover:shadow-lg hover:shadow-emerald/30 active:scale-[0.98]'
              }`}
          >
            <ShoppingCart size={20} />
            {isOutOfStock ? 'No disponible' : 'Añadir al Carrito'}
          </button>
        </div>
      </div>
    </div>
  );
}
