import { create } from 'zustand';
import { DBFile } from '@/types';
import { loadUserFiles, saveFile, deleteFile } from '@/lib/storage/textFiles';

const LOCAL_STORAGE_KEY = 'yoonos-textedit-files';

function loadLocalFiles(): DBFile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistLocalFiles(files: DBFile[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(files));
  } catch {}
}

type TextEditStore = {
  files: DBFile[];
  activeFileId: string | null;
  isLoading: boolean;
  isLocalMode: boolean;
  loadFiles: (userId: string) => Promise<void>;
  initLocal: () => void;
  setActiveFile: (id: string) => void;
  createFile: (userId: string | null) => Promise<void>;
  updateContent: (content: string) => void;
  saveActiveFile: (userId: string | null) => Promise<void>;
  renameFile: (id: string, name: string, userId: string | null) => Promise<void>;
  removeFile: (id: string, userId: string | null) => Promise<void>;
};

export const useTextEditStore = create<TextEditStore>((set, get) => ({
  files: [],
  activeFileId: null,
  isLoading: false,
  isLocalMode: false,

  loadFiles: async (userId) => {
    set({ isLoading: true, isLocalMode: false });
    const files = await loadUserFiles(userId);
    if (files.length === 0) {
      const local = loadLocalFiles();
      if (local.length > 0) {
        set({ files: local, activeFileId: local[0]?.id ?? null, isLoading: false, isLocalMode: true });
        return;
      }
    }
    set({ files, activeFileId: files[0]?.id ?? null, isLoading: false });
  },

  initLocal: () => {
    const files = loadLocalFiles();
    set({ files, activeFileId: files[0]?.id ?? null, isLocalMode: true });
  },

  setActiveFile: (id) => set({ activeFileId: id }),

  createFile: async (userId) => {
    const { isLocalMode } = get();
    if (!userId || isLocalMode) {
      const newFile: DBFile = {
        id: crypto.randomUUID(),
        user_id: userId || 'local',
        name: 'Untitled',
        content: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      set((s) => {
        const files = [newFile, ...s.files];
        persistLocalFiles(files);
        return { files, activeFileId: newFile.id, isLocalMode: true };
      });
      return;
    }
    const saved = await saveFile(null, userId, 'Untitled', '');
    if (saved) set((s) => ({ files: [saved, ...s.files], activeFileId: saved.id }));
  },

  updateContent: (content) =>
    set((s) => {
      const files = s.files.map((f) => (f.id === s.activeFileId ? { ...f, content, updated_at: new Date().toISOString() } : f));
      if (s.isLocalMode) persistLocalFiles(files);
      return { files };
    }),

  saveActiveFile: async (userId) => {
    const { files, activeFileId, isLocalMode } = get();
    const file = files.find((f) => f.id === activeFileId);
    if (!file) return;
    if (!userId || isLocalMode) {
      persistLocalFiles(files);
      return;
    }
    const saved = await saveFile(file.id, userId, file.name, file.content);
    if (saved) set((s) => ({ files: s.files.map((f) => (f.id === saved.id ? saved : f)) }));
  },

  renameFile: async (id, name, userId) => {
    const { isLocalMode } = get();
    if (!userId || isLocalMode) {
      set((s) => {
        const files = s.files.map((f) => (f.id === id ? { ...f, name, updated_at: new Date().toISOString() } : f));
        persistLocalFiles(files);
        return { files };
      });
      return;
    }
    const file = get().files.find((f) => f.id === id);
    if (!file) return;
    const saved = await saveFile(id, userId, name, file.content);
    if (saved) set((s) => ({ files: s.files.map((f) => (f.id === saved.id ? saved : f)) }));
  },

  removeFile: async (id, userId) => {
    const { isLocalMode } = get();
    if (!userId || isLocalMode) {
      set((s) => {
        const remaining = s.files.filter((f) => f.id !== id);
        persistLocalFiles(remaining);
        return { files: remaining, activeFileId: remaining[0]?.id ?? null };
      });
      return;
    }
    const ok = await deleteFile(id, userId);
    if (ok) {
      set((s) => {
        const remaining = s.files.filter((f) => f.id !== id);
        return { files: remaining, activeFileId: remaining[0]?.id ?? null };
      });
    }
  },
}));
