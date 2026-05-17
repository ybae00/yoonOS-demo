import { create } from 'zustand';

type UIStore = {
  isAboutOpen: boolean;
  openAbout: () => void;
  closeAbout: () => void;
  hoveredNodeId: string | null;
  setHoveredNodeId: (id: string | null) => void;
  desktopExpanded: boolean;
  expandDesktop: () => void;
  collapseDesktop: () => void;
};

export const useUIStore = create<UIStore>((set) => ({
  isAboutOpen: false,
  openAbout: () => set({ isAboutOpen: true }),
  closeAbout: () => set({ isAboutOpen: false }),
  hoveredNodeId: null,
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
  desktopExpanded: false,
  expandDesktop: () => set({ desktopExpanded: true }),
  collapseDesktop: () => set({ desktopExpanded: false }),
}));
