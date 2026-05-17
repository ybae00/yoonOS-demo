export const IPC_CHANNELS = {
  FINDER_LIST_DIRECTORY: 'finder:listDirectory',
  FINDER_READ_FILE_METADATA: 'finder:readFileMetadata',
  FINDER_OPEN_PATH: 'finder:openPath',
  FINDER_REVEAL_IN_FINDER: 'finder:revealInFinder',
  FINDER_PICK_DIRECTORY: 'finder:pickDirectory',
  FINDER_PICK_FILES: 'finder:pickFiles',
  APPS_LIST_INSTALLED: 'apps:listInstalled',
  APPS_LAUNCH: 'apps:launch',
  SETTINGS_GET_LOCAL: 'settings:getLocal',
  SETTINGS_SET_LOCAL: 'settings:setLocal',
  WALLPAPER_PICK_LOCAL_IMAGE: 'wallpaper:pickLocalImage',
} as const;

export type FileMetadata = {
  name: string;
  path: string;
  isDirectory: boolean;
  isSymlink: boolean;
  size: number;
  modifiedAt: string;
  createdAt: string;
  extension: string;
  permissions: string;
};

export type DirectoryListing = {
  path: string;
  items: FileMetadata[];
  error?: string;
};

export type InstalledApp = {
  name: string;
  path: string;
  bundleId: string | null;
  iconPath: string | null;
};

export type LocalSettings = {
  wallpaperType: 'preset' | 'color' | 'local' | 'cloud';
  wallpaperValue: string;
  recentWallpapers: string[];
  dockPosition: 'bottom' | 'left' | 'right';
  showDesktopIcons: boolean;
};

export type PickedFile = {
  path: string;
  name: string;
  size: number;
  mimeType: string;
};

export type NativeAPI = {
  finder: {
    listDirectory: (dirPath: string) => Promise<DirectoryListing>;
    readFileMetadata: (filePath: string) => Promise<FileMetadata | null>;
    openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    revealInFinder: (filePath: string) => Promise<void>;
    pickDirectory: () => Promise<string | null>;
    pickFiles: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<PickedFile[] | null>;
  };
  apps: {
    listInstalled: () => Promise<InstalledApp[]>;
    launch: (appPathOrBundleId: string) => Promise<{ success: boolean; error?: string }>;
  };
  settings: {
    getLocal: () => Promise<LocalSettings>;
    setLocal: (partial: Partial<LocalSettings>) => Promise<void>;
  };
  wallpaper: {
    pickLocalImage: () => Promise<PickedFile | null>;
  };
  platform: NodeJS.Platform;
};
