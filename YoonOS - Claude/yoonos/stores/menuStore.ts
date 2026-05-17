import { create } from 'zustand';

type MenuStore = {
  activeMenuId: string | null;
  openMenu: (id: string) => void;
  closeMenu: () => void;
  toggleMenu: (id: string) => void;
};

export const useMenuStore = create<MenuStore>((set, get) => ({
  activeMenuId: null,

  openMenu: (id) => set({ activeMenuId: id }),

  closeMenu: () => set({ activeMenuId: null }),

  toggleMenu: (id) => {
    if (get().activeMenuId === id) {
      set({ activeMenuId: null });
    } else {
      set({ activeMenuId: id });
    }
  },
}));
