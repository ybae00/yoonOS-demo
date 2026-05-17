import { create } from 'zustand';

type PhotoBoothStore = {
  lastPhoto: string | null;
  photos: string[];
  captureRequested: boolean;
  addPhoto: (url: string) => void;
  setPhotos: (urls: string[]) => void;
  requestCapture: () => void;
  clearCaptureRequest: () => void;
};

export const usePhotoBoothStore = create<PhotoBoothStore>((set) => ({
  lastPhoto: null,
  photos: [],
  captureRequested: false,

  addPhoto: (url) =>
    set((state) => ({
      lastPhoto: url,
      photos: [url, ...state.photos].slice(0, 10),
      captureRequested: false,
    })),

  setPhotos: (urls) => set({ photos: urls, lastPhoto: urls[0] ?? null }),

  requestCapture: () => set({ captureRequested: true }),

  clearCaptureRequest: () => set({ captureRequested: false }),
}));
