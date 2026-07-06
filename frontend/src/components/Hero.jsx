import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1599643478514-4a11f2a3db66?auto=format&fit=crop&w=1920&q=80', // Replace with real emerald img
    title: 'Esmeraldas Colombianas',
    subtitle: 'La mejor calidad del mundo desde el corazón de Colombia',
  },
  {
    image: 'https://images.unsplash.com/photo-1515562141207-7a8f73883f1d?auto=format&fit=crop&w=1920&q=80',
    title: 'Diseños Exclusivos',
    subtitle: 'Hechas a mano con amor y tradición',
  },
  {
    image: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=1920&q=80',
    title: 'Colección Premium',
    subtitle: 'Cada pieza es una obra de arte',
  }
];

export default function Hero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrent(current === slides.length - 1 ? 0 : current + 1);
  const prevSlide = () => setCurrent(current === 0 ? slides.length - 1 : current - 1);

  return (
    <div className="relative h-[80vh] min-h-[600px] w-full overflow-hidden group">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Overlay to darken image exactly as in the original */}
          <div className="absolute inset-0 bg-black/50 z-10"></div>
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover transform scale-105"
            style={{
              transition: 'transform 10s ease-out',
              transform: index === current ? 'scale(1.1)' : 'scale(1.05)'
            }}
          />
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
            <h1 
              className={`text-5xl md:text-7xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-200 to-gold mb-6 drop-shadow-lg transition-all duration-1000 transform ${
                index === current ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
              }`}
            >
              {slide.title}
            </h1>
            <p 
              className={`text-xl md:text-3xl font-sans text-white max-w-2xl drop-shadow-md transition-all duration-1000 delay-200 transform ${
                index === current ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
            >
              {slide.subtitle}
            </p>
          </div>
        </div>
      ))}

      {/* Controls */}
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-emerald/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald hover:scale-110"
      >
        <ChevronLeft size={32} />
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-emerald/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald hover:scale-110"
      >
        <ChevronRight size={32} />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`transition-all duration-300 rounded-full ${
              index === current ? 'w-8 h-2 bg-gold' : 'w-2 h-2 bg-white/50 hover:bg-white'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
