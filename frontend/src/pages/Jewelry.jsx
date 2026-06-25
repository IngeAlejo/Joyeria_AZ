import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function Jewelry() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Assuming your backend is running on 5000 as per app.js
        const response = await fetch('http://localhost:5000/api/products');
        if (!response.ok) throw new Error('Error fetching products');
        
        const data = await response.json();
        // The original logic extracted products based on if it was nested or direct array
        const fetchedProducts = data.productos || data || [];
        setProducts(fetchedProducts);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('No se pudo conectar con el catálogo en este momento. Intenta conectarte más tarde.');
        // Fallback mockup data so the UI doesn't look broken while backend is off
        setProducts([
          { id: 1, nombre: 'Anillo Esmeralda Gota', precio: 1200000, stock: 5, descripcion: 'Anillo en oro 18k con esmeralda corte gota de .50ct' },
          { id: 2, nombre: 'Collar Chivor Luz', precio: 2500000, stock: 2, descripcion: 'Collar con esmeralda colombiana corte princesa 1.2ct' },
          { id: 3, nombre: 'Aretes Muzo Clásicos', precio: 1800000, stock: 0, descripcion: 'Aretes en oro blanco con dos esmeraldas Muzo' },
          { id: 4, nombre: 'Pulsera Tenis Esmeralda', precio: 4500000, stock: 1, descripcion: 'Pulsera tipo tenis con esmeraldas y diamantes' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product => 
    product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-emerald mb-4">Catálogo de Joyería</h1>
          <div className="h-1 w-24 bg-gold mx-auto mb-6 rounded-full"></div>
          <p className="text-gray-600 font-sans max-w-2xl mx-auto text-lg">
            Explora nuestra colección exclusiva de piezas artesanales con las mejores esmeraldas colombianas.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o descripción..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:border-emerald transition-all font-sans"
            />
          </div>
          
          <button className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors w-full md:w-auto font-heading font-medium text-gray-700">
            <SlidersHorizontal size={20} />
            Filtros
          </button>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald" size={48} />
            <p className="text-gray-500 font-sans animate-pulse">Cargando tesoros...</p>
          </div>
        ) : error && products.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-red-50 text-red-500 p-6 rounded-2xl max-w-lg mx-auto border border-red-100">
              <p className="font-heading font-semibold text-lg">{error}</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 font-sans text-lg">No encontramos joyas que coincidan con tu búsqueda.</p>
            <button 
              onClick={() => setSearchTerm('')}
              className="mt-4 text-emerald hover:text-gold font-medium transition-colors"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
