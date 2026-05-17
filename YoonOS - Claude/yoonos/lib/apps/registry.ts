import { AppName } from '@/types';

export type AppRegistryEntry = {
  id: AppName;
  title: string;
  iconSrc?: string;
  iconComponent?: string;
  defaultWidth: number;
  defaultHeight: number;
  showInDock: boolean;
  dockOrder: number;
};

export const APP_REGISTRY: AppRegistryEntry[] = [
  {
    id: 'finder',
    title: 'Finder',
    iconSrc: '/icons/finder.svg',
    defaultWidth: 800,
    defaultHeight: 550,
    showInDock: true,
    dockOrder: 0,
  },
  {
    id: 'browser',
    title: 'Browser',
    iconSrc: '/icons/browser.svg',
    defaultWidth: 800,
    defaultHeight: 600,
    showInDock: true,
    dockOrder: 1,
  },
  {
    id: 'calendar',
    title: 'Calendar',
    iconSrc: '/icons/calendar.svg',
    defaultWidth: 600,
    defaultHeight: 500,
    showInDock: true,
    dockOrder: 2,
  },
  {
    id: 'photobooth',
    title: 'Photo Booth',
    iconSrc: '/icons/photobooth.svg',
    defaultWidth: 500,
    defaultHeight: 450,
    showInDock: true,
    dockOrder: 3,
  },
  {
    id: 'textedit',
    title: 'Text Edit',
    iconSrc: '/icons/textedit.svg',
    defaultWidth: 650,
    defaultHeight: 520,
    showInDock: true,
    dockOrder: 4,
  },
  {
    id: 'systemsettings',
    title: 'System Settings',
    iconComponent: 'Settings',
    defaultWidth: 580,
    defaultHeight: 480,
    showInDock: true,
    dockOrder: 5,
  },
];

export function getAppEntry(id: AppName): AppRegistryEntry | undefined {
  return APP_REGISTRY.find((app) => app.id === id);
}

export function getDockApps(): AppRegistryEntry[] {
  return APP_REGISTRY.filter((app) => app.showInDock).sort((a, b) => a.dockOrder - b.dockOrder);
}

export function getDefaultSize(id: AppName): { width: number; height: number } {
  const entry = getAppEntry(id);
  return entry
    ? { width: entry.defaultWidth, height: entry.defaultHeight }
    : { width: 600, height: 400 };
}

export function getAppTitle(id: AppName): string {
  return getAppEntry(id)?.title ?? id;
}
