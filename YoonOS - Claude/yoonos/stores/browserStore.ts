import { create } from 'zustand';

type BrowserStore = {
  currentUrl: string;
  history: string[];
  historyIndex: number;
  isLoading: boolean;
  navigate: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  setLoading: (loading: boolean) => void;
};

export const useBrowserStore = create<BrowserStore>((set, get) => ({
  currentUrl: '',
  history: [],
  historyIndex: -1,
  isLoading: false,

  navigate: (url) => {
    const raw = (url ?? '').replace(/^undefined/, '').trim();
    if (!raw) return;
    const normalizedUrl = raw.startsWith('http') ? raw : `https://${raw}`;
    const { history, historyIndex } = get();
    const newHistory = [...history.slice(0, historyIndex + 1), normalizedUrl];
    set({
      currentUrl: normalizedUrl,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isLoading: true,
    });
  },

  goBack: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        historyIndex: historyIndex - 1,
        currentUrl: history[historyIndex - 1],
        isLoading: true,
      });
    }
  },

  goForward: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        historyIndex: historyIndex + 1,
        currentUrl: history[historyIndex + 1],
        isLoading: true,
      });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
