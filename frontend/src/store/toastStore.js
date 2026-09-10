import { create } from "zustand";

let counter = 0;

export const useToastStore = create((set, get) => ({
  toasts: [],
  push: (message, type = "info") => {
    const id = ++counter;
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 4000);
  },
}));
