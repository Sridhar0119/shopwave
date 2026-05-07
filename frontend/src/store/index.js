import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'sw-auth' }
  )
);

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      add: (product, qty = 1) => {
        const items = get().items;
        const ex = items.find(i => i.id === product.id);
        if (ex) set({ items: items.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i) });
        else     set({ items: [...items, { ...product, qty }] });
      },
      remove:   (id)      => set({ items: get().items.filter(i => i.id !== id) }),
      setQty:   (id, qty) => qty < 1 ? get().remove(id) : set({ items: get().items.map(i => i.id === id ? { ...i, qty } : i) }),
      clear:    ()        => set({ items: [] }),
      total:    ()        => get().items.reduce((s, i) => s + i.price * i.qty, 0),
      count:    ()        => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    { name: 'sw-cart' }
  )
);
