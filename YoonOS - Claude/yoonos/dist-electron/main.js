"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const ipc_1 = require("./ipc");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const isDev = process.env.NODE_ENV === 'development';
const NEXT_DEV_URL = 'http://localhost:3000';
let mainWindow = null;
const SETTINGS_PATH = path.join(electron_1.app.getPath('userData'), 'local-settings.json');
const DEFAULT_SETTINGS = {
    wallpaperType: 'preset',
    wallpaperValue: 'gradient-blue',
    recentWallpapers: [],
    dockPosition: 'bottom',
    showDesktopIcons: true,
};
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: -100, y: -100 },
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });
    if (isDev) {
        mainWindow.loadURL(NEXT_DEV_URL);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// --- Path validation ---
const ALLOWED_ROOTS = [
    electron_1.app.getPath('home'),
    '/Applications',
    '/System/Applications',
];
function isPathAllowed(targetPath) {
    const normalized = path.resolve(targetPath);
    return ALLOWED_ROOTS.some((root) => normalized.startsWith(root));
}
// --- Settings persistence ---
async function loadLocalSettings() {
    try {
        const raw = await fs.readFile(SETTINGS_PATH, 'utf-8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
    catch {
        return { ...DEFAULT_SETTINGS };
    }
}
async function saveLocalSettings(settings) {
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}
// --- IPC Handlers ---
function registerIpcHandlers() {
    electron_1.ipcMain.handle(ipc_1.IPC_CHANNELS.FINDER_LIST_DIRECTORY, async (_event, dirPath) => {
        const normalized = path.resolve(dirPath);
        if (!isPathAllowed(normalized)) {
            return { path: normalized, items: [], error: 'Access denied: path outside allowed directories' };
        }
        try {
            const entries = await fs.readdir(normalized, { withFileTypes: true });
            const items = await Promise.all(entries
                .filter((e) => !e.name.startsWith('.'))
                .map(async (entry) => {
                const fullPath = path.join(normalized, entry.name);
                try {
                    const stat = await fs.stat(fullPath);
                    const lstat = await fs.lstat(fullPath);
                    return {
                        name: entry.name,
                        path: fullPath,
                        isDirectory: entry.isDirectory(),
                        isSymlink: lstat.isSymbolicLink(),
                        size: stat.size,
                        modifiedAt: stat.mtime.toISOString(),
                        createdAt: stat.birthtime.toISOString(),
                        extension: path.extname(entry.name).slice(1),
                        permissions: stat.mode.toString(8),
                    };
                }
                catch {
                    return {
                        name: entry.name,
                        path: fullPath,
                        isDirectory: entry.isDirectory(),
                        isSymlink: false,
                        size: 0,
                        modifiedAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        extension: path.extname(entry.name).slice(1),
                        permissions: '000',
                    };
                }
            }));
            return { path: normalized, items };
        }
        catch (err) {
            return { path: normalized, items: [], error: err.message };
        }
    });
    electron_1.ipcMain.handle(ipc_1.IPC_CHANNELS.FINDER_READ_FILE_METADATA, async (_event, filePath) => {
        const normalized = path.resolve(filePath);
        if (!isPathAllowed(normalized))
            return null;
        try {
            const stat = await fs.stat(normalized);
            const lstat = await fs.lstat(normalized);
            return {
                name: path.basename(normalized),
                path: normalized,
                isDirectory: stat.isDirectory(),
                isSymlink: lstat.isSymbolicLink(),
                size: stat.size,
                modifiedAt: stat.mtime.toISOString(),
                createdAt: stat.birthtime.toISOString(),
                extension: path.extname(normalized).slice(1),
                permissions: stat.mode.toString(8),
            };
        }
        catch {
            return null;
        }
    });
    electron_1.ipcMain.handle(ipc_1.IPC_CHANNELS.FINDER_OPEN_PATH, async (_event, filePath) => {
        const normalized = path.resolve(filePath);
        if (!isPathAllowed(normalized)) {
            return { success: false, error: 'Access denied' };
        }
        try {
            await electron_1.shell.openPath(normalized);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
    electron_1.ipcMain.handle(ipc_1.IPC_CHANNELS.FINDER_REVEAL_IN_FINDER, async (_event, filePath) => {
        const normalized = path.resolve(filePath);
        if (!isPathAllowed(normalized))
            return;
        electron_1.shell.showItemInFolder(normalized);
    });
    electron_1.ipcMain.handle(ipc_1.IPC_CHANNELS.FINDER_PICK_DIRECTORY, async () => {
        if (!mainWindow)
            return null;
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return result.filePaths[0];
    });
    electron_1.ipcMain.handle(ipc_1.IPC_CHANNELS.FINDER_PICK_FILES, async (_event, options) => {
        if (!mainWindow)
            return null;
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            properties: ['openFile', 'multiSelections'],
            filters: options?.filters,
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        const files = await Promise.all(result.filePaths.map(async (fp) => {
            const stat = await fs.stat(fp);
            const ext = path.extname(fp).slice(1).toLowerCase();
            const mimeMap = {
                jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
                webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf',
                txt: 'text/plain', md: 'text/markdown',
            };
            return {
                path: fp,
                name: path.basename(fp),
                size: stat.size,
                mimeType: mimeMap[ext] || 'application/octet-stream',
            };
        }));
        return files;
    });
    electron_1.ipcMain.handle(ipc_1.IPC_CHANNELS.APPS_LIST_INSTALLED, async () => {
        const appDirs = ['/Applications', '/System/Applications'];
        const apps = [];
        for (const dir of appDirs) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.name.endsWith('.app')) {
                        const appPath = path.join(dir, entry.name);
                        const name = entry.name.replace(/\.app$/, '');
                        let bundleId = null;
                        try {
                            const { stdout } = await execAsync(`defaults read "${appPath}/Contents/Info" CFBundleIdentifier 2>/dev/null`);
                            bundleId = stdout.trim() || null;
                        }
                        catch { }
                        apps.push({ name, path: appPath, bundleId, iconPath: null });
                    }
                }
            }
            catch { }
        }
        apps.sort((a, b) => a.name.localeCompare(b.name));
        return apps;
    });
    electron_1.ipcMain.handle(ipc_1.IPC_CHANNELS.APPS_LAUNCH, async (_event, appPathOrBundleId) => {
        try {
            if (appPathOrBundleId.startsWith('/')) {
                await electron_1.shell.openPath(appPathOrBundleId);
            }
            else {
                await execAsync(`open -b "${appPathOrBundleId}"`);
            }
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
    electron_1.ipcMain.handle(ipc_1.IPC_CHANNELS.SETTINGS_GET_LOCAL, async () => {
        return loadLocalSettings();
    });
    electron_1.ipcMain.handle(ipc_1.IPC_CHANNELS.SETTINGS_SET_LOCAL, async (_event, partial) => {
        const current = await loadLocalSettings();
        const updated = { ...current, ...partial };
        await saveLocalSettings(updated);
    });
    electron_1.ipcMain.handle(ipc_1.IPC_CHANNELS.WALLPAPER_PICK_LOCAL_IMAGE, async () => {
        if (!mainWindow)
            return null;
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        const fp = result.filePaths[0];
        const stat = await fs.stat(fp);
        const ext = path.extname(fp).slice(1).toLowerCase();
        const mimeMap = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
        };
        const destDir = path.join(electron_1.app.getPath('userData'), 'wallpapers');
        await fs.mkdir(destDir, { recursive: true });
        const destPath = path.join(destDir, `wallpaper-${Date.now()}.${ext}`);
        await fs.copyFile(fp, destPath);
        return {
            path: destPath,
            name: path.basename(fp),
            size: stat.size,
            mimeType: mimeMap[ext] || 'image/jpeg',
        };
    });
}
electron_1.app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=main.js.map