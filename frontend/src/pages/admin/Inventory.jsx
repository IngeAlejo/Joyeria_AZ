import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../config';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const { token } = useAuthStore();

  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    stock: '',
    descripcion: '',
    categoria: '',
  });
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/inventario`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setProducts(data.productos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isEditing = !!editingProduct;
      const url = isEditing 
        ? `${API_URL}/api/inventario/${editingProduct.id}`
        : `${API_URL}/api/inventario`;

      const submitData = new FormData();
      Object.keys(formData).forEach(key => submitData.append(key, formData[key]));
      if (imageFile) submitData.append('imagen', imageFile);

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: submitData
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro de que quieres eliminar este producto?')) return;
    try {
      const res = await fetch(`${API_URL}/api/inventario/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre,
      precio: product.precio,
      stock: product.stock,
      descripcion: product.descripcion,
      categoria: product.categoria || '',
    });
    setImageFile(null);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ nombre: '', precio: '', stock: '', descripcion: '', categoria: '' });
    setImageFile(null);
    setIsModalOpen(true);
  };

  if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="animate-spin text-emerald" size={40} /></div>;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500">Gestiona los productos de tu joyería</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-emerald text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-[#1a5c3a] transition-colors shadow-sm"
        >
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 font-medium">Producto</th>
                <th className="py-4 px-6 font-medium">Categoría</th>
                <th className="py-4 px-6 font-medium">Precio</th>
                <th className="py-4 px-6 font-medium">Stock</th>
                <th className="py-4 px-6 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                        {product.imagen ? (
                          <img src={`${API_URL}${product.imagen}`} alt={product.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="text-gray-400" size={20} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.nombre}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{product.descripcion}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600">
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs">{product.categoria || 'General'}</span>
                  </td>
                  <td className="py-4 px-6 font-medium text-emerald">${Number(product.precio).toLocaleString()}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.stock > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {product.stock} disp.
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEditModal(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan="5" className="py-8 text-center text-gray-500">No hay productos en el inventario.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold font-heading">{editingProduct ? 'Editar Producto' : 'Añadir Producto'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($)</label>
                    <input type="number" step="0.01" required value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                    <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <input type="text" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subir Imagen</label>
                    <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald/10 file:text-emerald hover:file:bg-emerald/20" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea rows="3" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald"></textarea>
                </div>
                <div className="flex gap-3 justify-end mt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" className="px-5 py-2.5 bg-emerald text-white rounded-xl font-medium hover:bg-[#1a5c3a] transition-colors">{editingProduct ? 'Guardar Cambios' : 'Crear Producto'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
