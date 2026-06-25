import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      addToCart: (product) => {
        const { items } = get();
        const existingItem = items.find((item) => item.id === product.id);
        
        if (existingItem) {
          set({
            items: items.map((item) => 
              item.id === product.id 
                ? { ...item, cantidad: item.cantidad + 1 }
                : item
            )
          });
        } else {
          set({
            items: [...items, { ...product, cantidad: 1 }]
          });
        }
      },

      removeFromCart: (productId) => {
        set({
          items: get().items.filter((item) => item.id !== productId)
        });
      },

      updateQuantity: (productId, delta) => {
        const { items } = get();
        set({
          items: items.map((item) => {
            if (item.id === productId) {
              const newQuantity = item.cantidad + delta;
              return newQuantity > 0 ? { ...item, cantidad: newQuantity } : item;
            }
            return item;
          }).filter(item => item.cantidad > 0)
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.cantidad, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.precio * item.cantidad), 0);
      }
    }),
    {
      name: 'joyeria-cart-storage', // name of the item in the storage (must be unique)
    }
  )
);
