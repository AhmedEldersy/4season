import { create } from "zustand";

export const useAdminRealtimeStore = create((set, get) => ({
  connected: false,
  lastEvent: null, // { event, data, receivedAt }
  pendingCount: 0,
  setConnected: (v) => set({ connected: v }),
  pushEvent: (event, data) => set({ lastEvent: { event, data, receivedAt: Date.now() } }),
  setPendingCount: (n) => set({ pendingCount: n }),
}));
