import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-900 to-[#1a4a2d] text-white pt-16 pb-8 border-t-2 border-gold relative overflow-hidden mt-20">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald via-gold to-emerald opacity-80"></div>
      
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          
          {/* Brand Col */}
          <div className="flex flex-col gap-4">
            <h5 className="font-heading font-bold text-2xl text-gold tracking-wider mb-2">AZ JOYERÍA</h5>
            <p className="text-gray-300 leading-relaxed max-w-sm font-sans">
              Esmeraldas colombianas auténticas desde el corazón de Colombia. Extraídas éticamente y certificadas.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold hover:text-gray-900 transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold hover:text-gray-900 transition-colors">
                <Facebook size={20} />
              </a>
            </div>
          </div>

          {/* Links Col */}
          <div className="flex flex-col gap-4">
            <h6 className="font-heading font-semibold text-lg text-gold uppercase tracking-wider mb-2">Enlaces Rápidos</h6>
            <nav className="flex flex-col gap-3 font-sans">
              <Link to="/" className="text-gray-300 hover:text-gold hover:translate-x-1 transition-all">Inicio</Link>
              <Link to="/joyeria" className="text-gray-300 hover:text-gold hover:translate-x-1 transition-all">Catálogo de Joyería</Link>
              <Link to="/esmeraldas" className="text-gray-300 hover:text-gold hover:translate-x-1 transition-all">Sobre Esmeraldas</Link>
              <Link to="/nosotros" className="text-gray-300 hover:text-gold hover:translate-x-1 transition-all">Nuestra Historia</Link>
            </nav>
          </div>

          {/* Contact Col */}
          <div className="flex flex-col gap-4">
            <h6 className="font-heading font-semibold text-lg text-gold uppercase tracking-wider mb-2">Contacto</h6>
            <ul className="flex flex-col gap-4 font-sans text-gray-300">
              <li className="flex items-start gap-3">
                <Phone size={20} className="text-emerald mt-1 flex-shrink-0" />
                <span>+57 300 123 4567<br/><small className="text-gray-400">Lun - Sáb: 9am - 6pm</small></span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={20} className="text-emerald flex-shrink-0" />
                <span>info@joyeriaaz.com</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin size={20} className="text-emerald flex-shrink-0" />
                <span>Bogotá, Colombia</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 mt-8 text-center text-gray-400 font-sans text-sm">
          <p>&copy; {new Date().getFullYear()} Joyería AZ. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
