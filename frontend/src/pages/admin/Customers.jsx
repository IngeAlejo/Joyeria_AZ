import { useState, useEffect } from 'react';
import { UserCog, Loader2, Edit2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../config';

const EMPTY_FORM = {
  nombre: '', apellidos: '', email: '', telefono: '', telefonoFijo: '',
  dni: '', fechaNacimiento: '', genero: '', empresa: '',
  pais: '', departamento: '', ciudad: '', direccion: '', direccion2: '',
  codigoPostal: '', referencia: '', rol: 'cliente'
};

export default function Customers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const { token, id: currentId } = useAuthStore();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setUsers(data.users);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRoleChange = async (userId, newRole) => {
    const res = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rol: newRole })
    });
    if (res.ok) setUsers(users.map(u => u.id === userId ? { ...u, rol: newRole } : u));
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      nombre: user.nombre || '', apellidos: user.apellidos || '', email: user.email || '',
      telefono: user.telefono || '', telefonoFijo: user.telefonoFijo || '',
      dni: user.dni || '',
      fechaNacimiento: user.fechaNacimiento ? user.fechaNacimiento.substring(0, 10) : '',
      genero: user.genero || '', empresa: user.empresa || '',
      pais: user.pais || '', departamento: user.departamento || '',
      ciudad: user.ciudad || '', direccion: user.direccion || '',
      direccion2: user.direccion2 || '', codigoPostal: user.codigoPostal || '',
      referencia: user.referencia || '', rol: user.rol || 'cliente'
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/api/admin/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    if (res.ok) { setIsModalOpen(false); fetchUsers(); }
    else { const err = await res.json(); alert(err.error); }
  };

  const set = (field) => (e) => setFormData(f => ({ ...f, [field]: e.target.value }));

  const Inp = ({ label, field, type = 'text', placeholder = '', full = false }) => (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={formData[field]} onChange={set(field)} placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald" />
    </div>
  );

  if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="animate-spin text-emerald" size={40} /></div>;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-900">Gestión de Clientes</h1>
        <p className="text-gray-500">Administra los datos completos y roles de los usuarios registrados</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 font-medium">Usuario</th>
                <th className="py-4 px-6 font-medium">Ubicación</th>
                <th className="py-4 px-6 font-medium">Fecha Reg.</th>
                <th className="py-4 px-6 font-medium">Rol</th>
                <th className="py-4 px-6 font-medium text-right">Editar</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <p className="font-medium text-gray-900">{user.nombre} {user.apellidos}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">{user.telefono || 'Sin teléfono'}</p>
                  </td>
                  <td className="py-4 px-6 text-gray-600 text-sm">
                    {user.ciudad ? `${user.ciudad}${user.pais ? ', ' + user.pais : ''}` : <span className="text-gray-400 italic">No proporcionada</span>}
                  </td>
                  <td className="py-4 px-6 text-gray-500 text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="py-4 px-6">
                    <select
                      disabled={user.id === currentId}
                      value={user.rol}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`text-xs font-bold uppercase rounded-lg p-2 border outline-none ${user.rol === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button onClick={() => openEditModal(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center shrink-0 bg-gray-50">
              <h3 className="text-xl font-bold font-heading flex items-center gap-2">
                <UserCog size={22} className="text-emerald" /> Editar Perfil de Usuario
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto p-6">
              {editingUser?.id === currentId && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-xl flex items-center gap-2 text-sm">
                  <ShieldAlert size={16} /> Editando tu propio perfil.
                </div>
              )}
              <form onSubmit={handleUpdate} className="flex flex-col gap-5">
                {/* Personal */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-bold text-emerald uppercase tracking-widest mb-3">👤 Datos Personales</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Inp label="Nombre *" field="nombre" placeholder="Juan" />
                    <Inp label="Apellidos *" field="apellidos" placeholder="Pérez" />
                    <Inp label="DNI / Cédula" field="dni" placeholder="12345678" />
                    <Inp label="Fecha de Nacimiento" field="fechaNacimiento" type="date" />
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Género</label>
                      <select value={formData.genero} onChange={set('genero')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald">
                        <option value="">Seleccionar...</option>
                        <option>Masculino</option><option>Femenino</option><option>Prefiero no decir</option><option>Otro</option>
                      </select>
                    </div>
                    <Inp label="Empresa" field="empresa" placeholder="Empresa S.A.S" />
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-bold text-emerald uppercase tracking-widest mb-3">📞 Contacto</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Inp label="Email *" field="email" type="email" placeholder="correo@ejemplo.com" />
                    <Inp label="Teléfono Celular" field="telefono" type="tel" placeholder="+57 300 000 0000" />
                    <Inp label="Teléfono Fijo" field="telefonoFijo" type="tel" placeholder="+57 1 234 5678" />
                  </div>
                </div>

                {/* Address */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-bold text-emerald uppercase tracking-widest mb-3">📦 Envío</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">País</label>
                      <select value={formData.pais} onChange={set('pais')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald">
                        <option value="">Seleccionar...</option>
                        <option>Colombia</option><option>México</option><option>Argentina</option>
                        <option>Chile</option><option>Perú</option><option>España</option>
                        <option>Estados Unidos</option><option>Otro</option>
                      </select>
                    </div>
                    <Inp label="Departamento / Estado" field="departamento" placeholder="Cundinamarca" />
                    <Inp label="Ciudad" field="ciudad" placeholder="Bogotá" />
                    <Inp label="Código Postal" field="codigoPostal" placeholder="110111" />
                    <Inp label="Dirección Principal" field="direccion" placeholder="Calle 123 #45-67" full />
                    <Inp label="Complemento" field="direccion2" placeholder="Apto 301, Torre 2" full />
                    <Inp label="Referencia" field="referencia" placeholder="Al lado del parque" full />
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" className="px-5 py-2.5 bg-emerald text-white rounded-xl font-medium hover:bg-[#1a5c3a] transition-colors">Guardar Cambios</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
