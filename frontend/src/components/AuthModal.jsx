import { useState } from 'react';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const INITIAL_FORM = {
  nombre: '',
  apellidos: '',
  email: '',
  contraseña: '',
  telefono: '',
  telefonoFijo: '',
  dni: '',
  fechaNacimiento: '',
  genero: '',
  empresa: '',
  pais: '',
  departamento: '',
  ciudad: '',
  direccion: '',
  direccion2: '',
  codigoPostal: '',
  referencia: '',
};

export default function AuthModal() {
  const { isAuthModalOpen, setAuthModalOpen, login } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isAuthModalOpen) return null;

  const set = (field) => (e) => setFormData(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const body = isLogin
        ? { email: formData.email, contraseña: formData.contraseña }
        : { ...formData };

      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok && data.token) {
        login(data.token, data.rol, data.nombre);
        setAuthModalOpen(false);
      } else {
        setError(data.error || 'Error al procesar la solicitud');
      }
    } catch (err) {
      setError('Error de conexión. Inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData(INITIAL_FORM);
  };

  const Field = ({ label, field, type = 'text', required = false, placeholder = '' }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}{required && ' *'}</label>
      <input
        type={type}
        required={required}
        value={formData[field]}
        onChange={set(field)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald focus:ring-1 focus:ring-emerald/20 transition-all"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-heading font-bold text-gray-900">
              {isLogin ? '¡Bienvenido de vuelta!' : 'Crear Cuenta'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isLogin ? 'Ingresa a tu cuenta de Joyería AZ' : 'Únete y descubre nuestras joyas exclusivas'}
            </p>
          </div>
          <button onClick={() => setAuthModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* ---- REGISTER ONLY FIELDS ---- */}
            {!isLogin && (
              <>
                {/* Información Personal */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-bold text-emerald uppercase tracking-widest mb-3">👤 Información Personal</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nombre" field="nombre" required placeholder="Juan" />
                    <Field label="Apellidos" field="apellidos" required placeholder="Pérez García" />
                    <Field label="Documento de Identidad (DNI/CC)" field="dni" placeholder="12345678" />
                    <Field label="Fecha de Nacimiento" field="fechaNacimiento" type="date" />
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Género</label>
                      <select value={formData.genero} onChange={set('genero')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald">
                        <option value="">Seleccionar...</option>
                        <option>Masculino</option>
                        <option>Femenino</option>
                        <option>Prefiero no decir</option>
                        <option>Otro</option>
                      </select>
                    </div>
                    <Field label="Empresa (Opcional)" field="empresa" placeholder="Mi Empresa S.A.S" />
                  </div>
                </div>

                {/* Contacto */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-bold text-emerald uppercase tracking-widest mb-3">📞 Contacto</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Teléfono Celular" field="telefono" type="tel" placeholder="+57 300 000 0000" />
                    <Field label="Teléfono Fijo" field="telefonoFijo" type="tel" placeholder="+57 1 234 5678" />
                  </div>
                </div>

                {/* Dirección de Envío */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-bold text-emerald uppercase tracking-widest mb-3">📦 Dirección de Envío</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">País *</label>
                      <select value={formData.pais} onChange={set('pais')} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald">
                        <option value="">Seleccionar país...</option>
                        <option>Colombia</option>
                        <option>México</option>
                        <option>Argentina</option>
                        <option>Chile</option>
                        <option>Perú</option>
                        <option>Venezuela</option>
                        <option>Ecuador</option>
                        <option>España</option>
                        <option>Estados Unidos</option>
                        <option>Otro</option>
                      </select>
                    </div>
                    <Field label="Departamento / Estado" field="departamento" placeholder="Cundinamarca" />
                    <Field label="Ciudad" field="ciudad" placeholder="Bogotá" />
                    <div className="col-span-2">
                      <Field label="Dirección Principal" field="direccion" placeholder="Calle 123 # 45 - 67" />
                    </div>
                    <div className="col-span-2">
                      <Field label="Dirección Complementaria" field="direccion2" placeholder="Apto 301, Torre 2" />
                    </div>
                    <Field label="Código Postal" field="codigoPostal" placeholder="110111" />
                    <Field label="Referencia del Lugar" field="referencia" placeholder="Al lado del parque central" />
                  </div>
                </div>
              </>
            )}

            {/* ---- SHARED FIELDS (Login + Register) ---- */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Correo Electrónico *</label>
                <input type="email" required value={formData.email} onChange={set('email')} placeholder="tu@correo.com" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald focus:ring-1 focus:ring-emerald/20 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={formData.contraseña} onChange={set('contraseña')} placeholder="••••••••" className="w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald focus:ring-1 focus:ring-emerald/20 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-emerald to-[#1a5c3a] text-white font-heading font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
              {loading ? <Loader2 size={20} className="animate-spin" /> : null}
              {isLogin ? 'Iniciar Sesión' : 'Crear mi Cuenta'}
            </button>

            <p className="text-center text-sm text-gray-500">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button type="button" onClick={switchMode} className="text-emerald font-semibold hover:underline">
                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
