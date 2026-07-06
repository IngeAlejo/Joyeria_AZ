import { Star, ShieldCheck, HeartHandshake } from 'lucide-react';
import { API_URL } from '../config';

export default function Nosotros() {
  return (
    <div className="animate-in fade-in duration-500 bg-gray-50">
      {/* Hero */}
      <section className="bg-emerald py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
            Nuestra Historia de Brillo
          </h1>
          <p className="text-emerald-100 text-lg md:text-xl">
            Más de dos décadas transformando metales nobles y gemas preciosas en recuerdos eternos. 
            Joyería AZ representa la tradición familiar y la excelencia artesanal.
          </p>
        </div>
      </section>

      {/* Main Image & Story */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto -mt-10">
        <img 
          src={`${API_URL}/uploads/store_interior.png`} 
          alt="Interior de nuestra boutique" 
          className="w-full h-[500px] object-cover rounded-3xl shadow-2xl mb-16"
        />

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div>
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-4">Nuestra Misión</h2>
            <p className="text-gray-600 leading-relaxed text-lg">
              Diseñar y fabricar piezas de joyería inigualables que acompañen los momentos 
              más importantes en la vida de nuestros clientes. Buscamos democratizar el lujo 
              sin jamás comprometer la calidad de nuestros materiales y nuestro talento humano.
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-4">Nuestra Visión</h2>
            <p className="text-gray-600 leading-relaxed text-lg">
              Ser la marca de joyería líder y de mayor confianza en todo el panorama nacional, 
              reconocida por el diseño vanguardista y la exportación de nuestro símbolo más sagrado: 
              la esmeralda colombiana.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 px-4 md:px-8 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-gray-900">Pilares de Excelencia</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-gray-50 rounded-2xl text-center border border-gray-100">
              <div className="w-16 h-16 bg-light-green rounded-full flex items-center justify-center mx-auto mb-6 text-emerald">
                <Star size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Diseño Exclusivo</h3>
              <p className="text-gray-500">Cada sortija o collar nace de un concepto único pensado en el lienzo de nuestros diseñadores.</p>
            </div>

            <div className="p-8 bg-gray-50 rounded-2xl text-center border border-gray-100">
              <div className="w-16 h-16 bg-light-green rounded-full flex items-center justify-center mx-auto mb-6 text-emerald">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Garantía Absoluta</h3>
              <p className="text-gray-500">Sellos de calidad en nuestros oros (18k) e identidades certificadas de todas las piedras preciosas.</p>
            </div>

            <div className="p-8 bg-gray-50 rounded-2xl text-center border border-gray-100">
              <div className="w-16 h-16 bg-light-green rounded-full flex items-center justify-center mx-auto mb-6 text-emerald">
                <HeartHandshake size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Honestidad</h3>
              <p className="text-gray-500">Transparencia en nuestro proceso de fabricación y precios justos en el trato cercano con el cliente.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
