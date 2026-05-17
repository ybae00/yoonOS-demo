import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, NativeAPI } from './ipc';

const nativeAPI: NativeAPI = {
  finder: {
    listDirectory: (dirPath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FINDER_LIST_DIRECTORY, dirPath),
    readFileMetadata: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FINDER_READ_FILE_METADATA, filePath),
    openPath: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FINDER_OPEN_PATH, filePath),
    revealInFinder: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FINDER_REVEAL_IN_FINDER, filePath),
    pickDirectory: () =>
      ipcRenderer.invoke(IPC_CHANNELS.FINDER_PICK_DIRECTORY),
    pickFiles: (options) =>
      ipcRenderer.invoke(IPC_CHANNELS.FINDER_PICK_FILES, options),
  },
  apps: {
    listInstalled: () =>
      ipcRenderer.invoke(IPC_CHANNELS.APPS_LIST_INSTALLED),
    launch: (appPathOrBundleId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.APPS_LAUNCH, appPathOrBundleId),
  },
  settings: {
    getLocal: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_LOCAL),
    setLocal: (partial) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_LOCAL, partial),
  },
  wallpaper: {
    pickLocalImage: () =>
      ipcRenderer.invoke(IPC_CHANNELS.WALLPAPER_PICK_LOCAL_IMAGE),
  },
  platform: process.platform,
};

contextBridge.exposeInMainWorld('yoonosNative', nativeAPI);
