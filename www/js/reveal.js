/**
 * reveal.js — Joyería AZ
 * Scroll reveal usando IntersectionObserver
 * NO usa window.addEventListener('scroll') — cumple Section 5.D de design-taste-frontend skill
 * Respeta prefers-reduced-motion
 */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    // Si el usuario prefiere menos movimiento, revelar todo sin animación
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target); // Fires once only
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  // Observar todos los elementos con data-reveal al cargar
  function initReveal() {
    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveal);
  } else {
    initReveal();
  }

  // Para elementos dinámicos añadidos después del load (ej: productos cargados via fetch)
  window.observeReveal = function (el) {
    observer.observe(el);
  };

  window.initReveal = initReveal;
})();
