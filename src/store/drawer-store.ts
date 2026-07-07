import { create } from "zustand";

type DrawerState = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const useDrawerStore = create<DrawerState>((set) => ({
  open: false,
  openDrawer: () => set({ open: true }),
  closeDrawer: () => set({ open: false }),
}));
