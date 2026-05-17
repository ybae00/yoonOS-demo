import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { IPC_CHANNELS, DirectoryListing, FileMetadata, InstalledApp, LocalSettings, PickedFile } from './ipc';

const execAsync = promisify(exec);

const isDev = process.env.NODE_ENV === 'development';
const NEXT_DEV_URL = 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;

const SETTINGS_PATH = path.join(app.getPath('userData'), 'local-settings.json');

const DEFAULT_SETTINGS: LocalSettings = {
  wallpaperType: 'preset',
  wallpaperValue: 'gradient-blue',
  recentWallpapers: [],
  dockPosition: 'bottom',
  showDesktopIcons: true,
};

function createWindow() {
  mainWindow = new BrowserWindow({
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
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- Path validation ---

const ALLOWED_ROOTS = [
  app.getPath('home'),
  '/Applications',
  '/System/Applications',
];

function isPathAllowed(targetPath: string): boolean {
  const normalized = path.resolve(targetPath);
  return ALLOWED_ROOTS.some((root) => normalized.startsWith(root));
}

// --- Settings persistence ---

async function loadLocalSettings(): Promise<LocalSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function saveLocalSettings(settings: LocalSettings): Promise<void> {
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

// --- IPC Handlers ---

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.FINDER_LIST_DIRECTORY, async (_event, dirPath: string): Promise<DirectoryListing> => {
    const normalized = path.resolve(dirPath);
    if (!isPathAllowed(normalized)) {
      return { path: normalized, items: [], error: 'Access denied: path outside allowed directories' };
    }
    try {
      const entries = await fs.readdir(normalized, { withFileTypes: true });
      const items: FileMetadata[] = await Promise.all(
        entries
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
            } catch {
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
          })
      );
      return { path: normalized, items };
    } catch (err: any) {
      return { path: normalized, items: [], error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FINDER_READ_FILE_METADATA, async (_event, filePath: string): Promise<FileMetadata | null> => {
    const normalized = path.resolve(filePath);
    if (!isPathAllowed(normalized)) return null;
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
    } catch {
      return null;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FINDER_OPEN_PATH, async (_event, filePath: string) => {
    const normalized = path.resolve(filePath);
    if (!isPathAllowed(normalized)) {
      return { success: false, error: 'Access denied' };
    }
    try {
      await shell.openPath(normalized);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FINDER_REVEAL_IN_FINDER, async (_event, filePath: string) => {
    const normalized = path.resolve(filePath);
    if (!isPathAllowed(normalized)) return;
    shell.showItemInFolder(normalized);
  });

  ipcMain.handle(IPC_CHANNELS.FINDER_PICK_DIRECTORY, async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.FINDER_PICK_FILES, async (_event, options?: { filters?: { name: string; extensions: string[] }[] }) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: options?.filters,
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const files: PickedFile[] = await Promise.all(
      result.filePaths.map(async (fp) => {
        const stat = await fs.stat(fp);
        const ext = path.extname(fp).slice(1).toLowerCase();
        const mimeMap: Record<string, string> = {
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
      })
    );
    return files;
  });

  ipcMain.handle(IPC_CHANNELS.APPS_LIST_INSTALLED, async (): Promise<InstalledApp[]> => {
    const appDirs = ['/Applications', '/System/Applications'];
    const apps: InstalledApp[] = [];
    for (const dir of appDirs) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.endsWith('.app')) {
            const appPath = path.join(dir, entry.name);
            const name = entry.name.replace(/\.app$/, '');
            let bundleId: string | null = null;
            try {
              const { stdout } = await execAsync(
                `defaults read "${appPath}/Contents/Info" CFBundleIdentifier 2>/dev/null`
              );
              bundleId = stdout.trim() || null;
            } catch {}
            apps.push({ name, path: appPath, bundleId, iconPath: null });
          }
        }
      } catch {}
    }
    apps.sort((a, b) => a.name.localeCompare(b.name));
    return apps;
  });

  ipcMain.handle(IPC_CHANNELS.APPS_LAUNCH, async (_event, appPathOrBundleId: string) => {
    try {
      if (appPathOrBundleId.startsWith('/')) {
        await shell.openPath(appPathOrBundleId);
      } else {
        await execAsync(`open -b "${appPathOrBundleId}"`);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_LOCAL, async (): Promise<LocalSettings> => {
    return loadLocalSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_LOCAL, async (_event, partial: Partial<LocalSettings>) => {
    const current = await loadLocalSettings();
    const updated = { ...current, ...partial };
    await saveLocalSettings(updated);
  });

  ipcMain.handle(IPC_CHANNELS.WALLPAPER_PICK_LOCAL_IMAGE, async (): Promise<PickedFile | null> => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const fp = result.filePaths[0];
    const stat = await fs.stat(fp);
    const ext = path.extname(fp).slice(1).toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    };

    const destDir = path.join(app.getPath('userData'), 'wallpapers');
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

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
