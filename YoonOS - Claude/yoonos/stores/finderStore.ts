import { create } from 'zustand';
import type { FileMetadata } from '@/electron/ipc';
import { listDirectory, resolveHomePath } from '@/lib/native/finder';

type SortField = 'name' | 'size' | 'modifiedAt' | 'extension';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'icon' | 'list';

type FinderState = {
  currentPath: string;
  items: FileMetadata[];
  loading: boolean;
  error: string | null;
  history: string[];
  historyIndex: number;
  sortField: SortField;
  sortDirection: SortDirection;
  viewMode: ViewMode;
  searchQuery: string;
  selectedItems: string[];
  showHidden: boolean;
};

type FinderActions = {
  navigateTo: (path: string) => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  goUp: () => Promise<void>;
  refresh: () => Promise<void>;
  setSort: (field: SortField, direction?: SortDirection) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  selectItem: (path: string) => void;
  selectMultiple: (paths: string[]) => void;
  clearSelection: () => void;
  toggleHidden: () => void;
};

function sortItems(items: FileMetadata[], field: SortField, direction: SortDirection): FileMetadata[] {
  const sorted = [...items].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    let cmp = 0;
    switch (field) {
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'size':
        cmp = a.size - b.size;
        break;
      case 'modifiedAt':
        cmp = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
        break;
      case 'extension':
        cmp = a.extension.localeCompare(b.extension);
        break;
    }
    return direction === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

export const useFinderStore = create<FinderState & FinderActions>((set, get) => ({
  currentPath: '~',
  items: [],
  loading: false,
  error: null,
  history: ['~'],
  historyIndex: 0,
  sortField: 'name',
  sortDirection: 'asc',
  viewMode: 'list',
  searchQuery: '',
  selectedItems: [],
  showHidden: false,

  navigateTo: async (path: string) => {
    set({ loading: true, error: null, selectedItems: [] });
    const resolved = resolveHomePath(path);
    const result = await listDirectory(resolved);

    if (result.error) {
      set({ loading: false, error: result.error, items: [] });
      return;
    }

    const { sortField, sortDirection, showHidden } = get();
    let items = result.items;
    if (!showHidden) {
      items = items.filter((i) => !i.name.startsWith('.'));
    }
    items = sortItems(items, sortField, sortDirection);

    const { history, historyIndex } = get();
    const newHistory = [...history.slice(0, historyIndex + 1), path];

    set({
      currentPath: path,
      items,
      loading: false,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  goBack: async () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prevPath = history[historyIndex - 1];
    set({ historyIndex: historyIndex - 1 });

    set({ loading: true, error: null, selectedItems: [] });
    const resolved = resolveHomePath(prevPath);
    const result = await listDirectory(resolved);
    if (result.error) {
      set({ loading: false, error: result.error, items: [], currentPath: prevPath });
      return;
    }
    const { sortField, sortDirection, showHidden } = get();
    let items = result.items;
    if (!showHidden) items = items.filter((i) => !i.name.startsWith('.'));
    items = sortItems(items, sortField, sortDirection);
    set({ currentPath: prevPath, items, loading: false });
  },

  goForward: async () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const nextPath = history[historyIndex + 1];
    set({ historyIndex: historyIndex + 1 });

    set({ loading: true, error: null, selectedItems: [] });
    const resolved = resolveHomePath(nextPath);
    const result = await listDirectory(resolved);
    if (result.error) {
      set({ loading: false, error: result.error, items: [], currentPath: nextPath });
      return;
    }
    const { sortField, sortDirection, showHidden } = get();
    let items = result.items;
    if (!showHidden) items = items.filter((i) => !i.name.startsWith('.'));
    items = sortItems(items, sortField, sortDirection);
    set({ currentPath: nextPath, items, loading: false });
  },

  goUp: async () => {
    const { currentPath } = get();
    const resolved = resolveHomePath(currentPath);
    const parent = resolved.split('/').slice(0, -1).join('/') || '/';
    await get().navigateTo(parent);
  },

  refresh: async () => {
    const { currentPath } = get();
    set({ loading: true, error: null });
    const resolved = resolveHomePath(currentPath);
    const result = await listDirectory(resolved);
    if (result.error) {
      set({ loading: false, error: result.error, items: [] });
      return;
    }
    const { sortField, sortDirection, showHidden } = get();
    let items = result.items;
    if (!showHidden) items = items.filter((i) => !i.name.startsWith('.'));
    items = sortItems(items, sortField, sortDirection);
    set({ items, loading: false });
  },

  setSort: (field, direction) => {
    const newDirection = direction ?? (get().sortField === field && get().sortDirection === 'asc' ? 'desc' : 'asc');
    const items = sortItems(get().items, field, newDirection);
    set({ sortField: field, sortDirection: newDirection, items });
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  selectItem: (path) => set({ selectedItems: [path] }),

  selectMultiple: (paths) => set({ selectedItems: paths }),

  clearSelection: () => set({ selectedItems: [] }),

  toggleHidden: () => {
    const show = !get().showHidden;
    set({ showHidden: show });
    get().refresh();
  },
}));
