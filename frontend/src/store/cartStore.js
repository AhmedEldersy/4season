import { create } from "zustand";
import { persist } from "zustand/middleware";

const lineKey = (item) => `${item.product_id}__${item.size || "medium"}`;

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // { product_id, name, image_url, unit_price, size, quantity, special_instructions }

      addItem: (item) => {
        const key = lineKey(item);
        const items = [...get().items];
        const idx = items.findIndex((i) => lineKey(i) === key);
        if (idx >= 0) {
          items[idx] = { ...items[idx], quantity: items[idx].quantity + item.quantity };
        } else {
          items.push(item);
        }
        set({ items });
      },

      updateQuantity: (key, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => lineKey(i) !== key) });
          return;
        }
        set({
          items: get().items.map((i) => (lineKey(i) === key ? { ...i, quantity } : i)),
        });
      },

      removeItem: (key) => set({ items: get().items.filter((i) => lineKey(i) !== key) }),

      clear: () => set({ items: [] }),

      subtotal: () => get().items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0),

      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "4season-cart" }
  )
);

export { lineKey };
