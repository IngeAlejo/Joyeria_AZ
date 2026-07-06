import { create } from 'zustand';

// Try to load initial state from localStorage if it exists
const savedToken = localStorage.getItem('token');
const savedRol = localStorage.getItem('rol');
const savedNombre = localStorage.getItem('nombre');

const initialState = {
  token: savedToken || null,
  rol: savedRol || null,
  nombre: savedNombre || null,
  isAuthenticated: !!savedToken,
  isAuthModalOpen: false,
};

export const useAuthStore = create((set) => ({
  ...initialState,

  login: (userData) => {
    localStorage.setItem('token', userData.token);
    if (userData.rol) localStorage.setItem('rol', userData.rol);
    if (userData.nombre) localStorage.setItem('nombre', userData.nombre);
    
    set({
      token: userData.token,
      rol: userData.rol || 'cliente',
      nombre: userData.nombre || 'Usuario',
      isAuthenticated: true,
      isAuthModalOpen: false, 
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('nombre');
    
    set({
      token: null,
      rol: null,
      nombre: null,
      isAuthenticated: false,
    });
  },

  setAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),
}));
