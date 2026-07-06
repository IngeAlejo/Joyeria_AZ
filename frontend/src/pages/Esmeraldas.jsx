// Esmeraldas.jsx
import { API_URL } from '../config';
export default function Esmeraldas() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={`${API_URL}/uploads/emerald_showcase.png`} 
            alt="Fondo de Esmeralda" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-heading font-bold text-white mb-6">
            Esmeraldas Colombianas
          </h1>
          <p className="text-xl text-gray-200 font-light">
            El tesoro verde más valioso del mundo, extraído con orgullo y tallado a la perfección en nuestras joyerías.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-6">
              ¿Por qué nuestras esmeraldas?
            </h2>
            <div className="space-y-6 text-gray-600 leading-relaxed">
              <p>
                Las esmeraldas de Colombia son globalmente reconocidas por su excepcional pureza y un profundo tono 
                verde que no se encuentra en ninguna otra parte del mundo. En Joyería AZ trabajamos con gemas extraídas 
                bajo los más altos estándares éticos en las minas de Muzo, Chivor y Coscuez.
              </p>
              <p>
                Cada esmeralda que engastamos cuenta una historia milenaria. Su rareza, color fuego profundo y esa 
                "jardinería" interna natural (inclusiones) garantizan que cada piedra sea una obra de arte única de la naturaleza.
              </p>
            </div>
            <ul className="mt-8 space-y-4">
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald"></div>
                <span className="font-medium text-gray-800">Certificación Gemológica de Origen</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald"></div>
                <span className="font-medium text-gray-800">Tallas exclusivas gota, brillante y esmeralda</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald"></div>
                <span className="font-medium text-gray-800">Engaste a mano en Oros 18k</span>
              </li>
            </ul>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-emerald rounded-3xl transform translate-x-4 translate-y-4 -z-10"></div>
            <img 
              src={`${API_URL}/uploads/jewelry_crafting.png`} 
              alt="Artesano engastando una joya" 
              className="w-full h-[500px] object-cover rounded-3xl shadow-xl border-4 border-white"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
