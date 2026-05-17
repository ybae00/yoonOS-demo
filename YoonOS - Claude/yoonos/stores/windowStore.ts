import { create } from 'zustand';
import { WindowState, AppName } from '@/types';
import { getDefaultSize, getAppTitle } from '@/lib/apps/registry';

type WindowStore = {
  windows: WindowState[];
  maxZIndex: number;
  activeWindowId: string | null;
  openWindow: (app: AppName) => void;
  closeWindow: (id: string) => void;
  closeAllWindows: () => void;
  bringToFront: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  restoreWindow: (app: AppName) => void;
  restoreWindowById: (id: string) => void;
  focusNextWindow: () => void;
  updatePosition: (id: string, x: number, y: number) => void;
  updateSize: (id: string, width: number, height: number) => void;
  getActiveApp: () => AppName | null;
};

const DESKTOP_TOP = 28;
const DESKTOP_BOTTOM = 72;

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  maxZIndex: 10,
  activeWindowId: null,

  openWindow: (app) => {
    const existing = get().windows.find((w) => w.app === app);
    if (existing) {
      if (existing.minimized) {
        get().restoreWindow(app);
      } else {
        get().bringToFront(existing.id);
      }
      return;
    }
    const newZ = get().maxZIndex + 1;
    const { width, height } = getDefaultSize(app);
    const id = crypto.randomUUID();
    set((state) => ({
      maxZIndex: newZ,
      activeWindowId: id,
      windows: [
        ...state.windows,
        {
          id,
          app,
          title: getAppTitle(app),
          x: 80 + Math.random() * 100,
          y: 60 + Math.random() * 60,
          width,
          height,
          zIndex: newZ,
          minimized: false,
          maximized: false,
        },
      ],
    }));
  },

  closeWindow: (id) => {
    set((state) => {
      const remaining = state.windows.filter((w) => w.id !== id);
      const topVisible = remaining
        .filter((w) => !w.minimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      return {
        windows: remaining,
        activeWindowId: topVisible?.id ?? null,
      };
    });
  },

  closeAllWindows: () => set({ windows: [], activeWindowId: null }),

  bringToFront: (id) => {
    const newZ = get().maxZIndex + 1;
    set((state) => ({
      maxZIndex: newZ,
      activeWindowId: id,
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, zIndex: newZ, minimized: false } : w
      ),
    }));
  },

  minimizeWindow: (id) => {
    set((state) => {
      const updated = state.windows.map((w) =>
        w.id === id ? { ...w, minimized: true } : w
      );
      const topVisible = updated
        .filter((w) => !w.minimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      return {
        windows: updated,
        activeWindowId: topVisible?.id ?? null,
      };
    });
  },

  maximizeWindow: (id) => {
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 900;
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) return w;
        return {
          ...w,
          maximized: true,
          previousBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
          x: 0,
          y: 0,
          width: screenW,
          height: screenH - DESKTOP_TOP - DESKTOP_BOTTOM,
        };
      }),
    }));
  },

  toggleMaximize: (id) => {
    const win = get().windows.find((w) => w.id === id);
    if (!win) return;
    if (win.maximized) {
      get().restoreWindowById(id);
    } else {
      get().maximizeWindow(id);
    }
  },

  restoreWindow: (app) => {
    const win = get().windows.find((w) => w.app === app);
    if (win) {
      const newZ = get().maxZIndex + 1;
      set((state) => ({
        maxZIndex: newZ,
        activeWindowId: win.id,
        windows: state.windows.map((w) =>
          w.app === app ? { ...w, minimized: false, zIndex: newZ } : w
        ),
      }));
    }
  },

  restoreWindowById: (id) => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id !== id) return w;
        if (!w.maximized || !w.previousBounds) return { ...w, minimized: false };
        return {
          ...w,
          maximized: false,
          x: w.previousBounds.x,
          y: w.previousBounds.y,
          width: w.previousBounds.width,
          height: w.previousBounds.height,
          previousBounds: undefined,
        };
      }),
    }));
  },

  focusNextWindow: () => {
    const visibleWindows = get().windows
      .filter((w) => !w.minimized)
      .sort((a, b) => b.zIndex - a.zIndex);
    if (visibleWindows.length < 2) return;
    const last = visibleWindows[visibleWindows.length - 1];
    get().bringToFront(last.id);
  },

  updatePosition: (id, x, y) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),

  updateSize: (id, width, height) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, width, height } : w
      ),
    })),

  getActiveApp: () => {
    const { windows, activeWindowId } = get();
    const win = windows.find((w) => w.id === activeWindowId);
    return win?.app ?? null;
  },
}));
