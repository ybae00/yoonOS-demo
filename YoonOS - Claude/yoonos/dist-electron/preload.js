"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const ipc_1 = require("./ipc");
const nativeAPI = {
    finder: {
        listDirectory: (dirPath) => electron_1.ipcRenderer.invoke(ipc_1.IPC_CHANNELS.FINDER_LIST_DIRECTORY, dirPath),
        readFileMetadata: (filePath) => electron_1.ipcRenderer.invoke(ipc_1.IPC_CHANNELS.FINDER_READ_FILE_METADATA, filePath),
        openPath: (filePath) => electron_1.ipcRenderer.invoke(ipc_1.IPC_CHANNELS.FINDER_OPEN_PATH, filePath),
        revealInFinder: (filePath) => electron_1.ipcRenderer.invoke(ipc_1.IPC_CHANNELS.FINDER_REVEAL_IN_FINDER, filePath),
        pickDirectory: () => electron_1.ipcRenderer.invoke(ipc_1.IPC_CHANNELS.FINDER_PICK_DIRECTORY),
        pickFiles: (options) => electron_1.ipcRenderer.invoke(ipc_1.IPC_CHANNELS.FINDER_PICK_FILES, options),
    },
    apps: {
        listInstalled: () => electron_1.ipcRenderer.invoke(ipc_1.IPC_CHANNELS.APPS_LIST_INSTALLED),
        launch: (appPathOrBundleId) => electron_1.ipcRenderer.invoke(ipc_1.IPC_CHANNELS.APPS_LAUNCH, appPathOrBundleId),
    },
    settings: {
        getLocal: () => electron_1.ipcRenderer.invoke(ipc_1.IPC_CHANNELS.SETTINGS_GET_LOCAL),
        setLocal: (partial) => electron_1.ipcRenderer.invoke(ipc_1.IPC_CHANNELS.SETTINGS_SET_LOCAL, partial),
    },
    wallpaper: {
        pickLocalImage: () => electron_1.ipcRenderer.invoke(ipc_1.IPC_CHANNELS.WALLPAPER_PICK_LOCAL_IMAGE),
    },
    platform: process.platform,
};
electron_1.contextBridge.exposeInMainWorld('yoonosNative', nativeAPI);
//# sourceMappingURL=preload.js.map