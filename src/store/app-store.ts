import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: "dark" | "light" | "system";
  currency: "USD" | "IDR";
  autoTradingMode: "MONITOR" | "SEMI_AUTO" | "FULL_AUTO";
  autoTradingActive: boolean;
  exchangeConnected: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setTheme: (theme: "dark" | "light" | "system") => void;
  setCurrency: (currency: "USD" | "IDR") => void;
  setAutoTradingMode: (mode: "MONITOR" | "SEMI_AUTO" | "FULL_AUTO") => void;
  setAutoTradingActive: (active: boolean) => void;
  setExchangeConnected: (connected: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  theme: "dark",
  currency: "USD",
  autoTradingMode: "MONITOR",
  autoTradingActive: false,
  exchangeConnected: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
  setCurrency: (currency) => set({ currency }),
  setAutoTradingMode: (mode) => set({ autoTradingMode: mode }),
  setAutoTradingActive: (active) => set({ autoTradingActive: active }),
  setExchangeConnected: (connected) => set({ exchangeConnected: connected }),
}));
