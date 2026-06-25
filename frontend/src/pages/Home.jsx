import { Link } from 'react-router-dom';
import { Gem, ChevronLeft, ChevronRight } from 'lucide-react';
import Hero from '../components/Hero';
import { useState, useEffect } from 'react';

const SLIDES = [
  {
    img: 'http://localhost:5000/uploads/carousel_emerald_ring.png',
    title: 'Anillos de Esmeralda',
    subtitle: 'Esmeraldas colombianas certificadas en montura de oro 18k. Cada brillo cuenta una historia.',
    link: '/esmeraldas',
    cta: 'Ver Colección'
  },
  {
    img: 'http://localhost:5000/uploads/carousel_gold_necklace.png',
    title: 'Collares de Alta Joyería',
    subtitle: 'Diseños exclusivos en oro y diamantes, creados por artesanos colombianos de excelencia.',
    link: '/joyeria',
    cta: 'Explorar Catálogo'
  },
  {
    img: 'http://localhost:5000/uploads/carousel_bracelet_emerald.png',
    title: 'Pulseras Únicas',
    subtitle: 'La elegancia de nuestra joyería habla por sí sola. Piezas que acompañan los momentos eternos.',
    link: '/joyeria',
    cta: 'Descubrir Más'
  }
];

export default function Home() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setCurrent(c => (c + 1) % SLIDES.length);

  return (
    <div className="flex flex-col min-h-screen">
      <Hero />

      {/* Carousel Section */}
      <section className="py-24 px-4 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-light-green rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-2">Esmeraldas Colombianas Auténticas</h2>
            <p className="text-gray-500">Colombia produce el <strong className="text-emerald">70%</strong> de las esmeraldas del mundo</p>
          </div>
          
          {/* Carousel */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl group" style={{ height: '480px' }}>
            {SLIDES.map((slide, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-700 ${idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                <img src={slide.img} alt={slide.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent"></div>
                <div className="absolute left-10 bottom-12 max-w-lg z-20">
                  <h3 className="text-4xl font-heading font-bold text-white mb-3">{slide.title}</h3>
                  <p className="text-white/80 text-lg mb-6 leading-relaxed">{slide.subtitle}</p>
                  <Link to={slide.link} className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald to-[#1a5c3a] text-white font-heading font-bold py-3 px-8 rounded-full transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald/30">
                    <Gem size={20} /> {slide.cta}
                  </Link>
                </div>
              </div>
            ))}

            {/* Controls */}
            <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
              <ChevronLeft size={22}/>
            </button>
            <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
              <ChevronRight size={22}/>
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {SLIDES.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-white scale-125' : 'bg-white/50'}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-gradient-to-b from-white to-light-green border-t border-emerald/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-emerald mb-4 relative inline-block">
            Nuestros Tesoros
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-1 bg-gold"></span>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-1 bg-gold"></span>
          </h2>
          <p className="text-lg text-gray-600 font-sans mt-8 mb-16">Selección exclusiva de joyería fina</p>
          
          <div className="flex items-center justify-center gap-4 mb-16">
            <div className="h-px w-32 bg-gradient-to-r from-transparent to-gold"></div>
            <p className="font-heading font-medium text-emerald tracking-wide">Cada joya es una historia de brillo y elegancia</p>
            <div className="h-px w-32 bg-gradient-to-l from-transparent to-gold"></div>
          </div>

          <div className="text-center mt-12 pb-8">
            <Link to="/joyeria" className="inline-flex items-center gap-3 border-2 border-emerald text-emerald bg-transparent font-heading font-bold py-4 px-10 rounded-full transition-all hover:bg-emerald hover:text-white hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald/30 active:translate-y-0">
              <Gem size={24} />
              Ver Toda la Colección
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
