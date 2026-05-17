'use client';

/**
 * Desktop — the self-contained OS surface.
 *
 * Renders the wallpaper, TopBar, windows, Dock, and context menu.
 * Does NOT own the graph, chat bar, or approval card — those live at the
 * AICanvas level. Desktop fills whatever container it is placed in.
 */

import { useCallback, useState, useEffect } from 'react';
import TopBar from './TopBar';
import Dock from './Dock';
import Window from './Window';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import FinderApp from '@/components/apps/FinderApp';
import BrowserApp from '@/components/apps/BrowserApp';
import CalendarApp from '@/components/apps/CalendarApp';
import PhotoBoothApp from '@/components/apps/PhotoBoothApp';
import TextEditApp from '@/components/apps/TextEditApp';
import SystemSettingsApp from '@/components/apps/SystemSettingsApp';
import { useWindowStore } from '@/stores/windowStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { getWallpaperUrl } from '@/lib/storage/wallpapers';
import { isNativeAvailable } from '@/types/native';
import { AppName, UserSettings } from '@/types';

const APP_COMPONENTS: Record<AppName, React.ComponentType> = {
  finder: FinderApp,
  browser: BrowserApp,
  calendar: CalendarApp,
  photobooth: PhotoBoothApp,
  textedit: TextEditApp,
  systemsettings: SystemSettingsApp,
};

const PRESET_CSS: Record<string, string> = {
  'gradient-blue': 'url("/wallpapers/dune-dark.png") center center / cover no-repeat',
  'gradient-purple': 'linear-gradient(135deg, #fafafa 0%, #eeeeee 50%, #d4d4d4 100%)',
  'gradient-green': 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 50%, #cfcfcf 100%)',
  'gradient-sunset': 'linear-gradient(135deg, #fdfdfd 0%, #e9e9e9 55%, #bdbdbd 100%)',
  'gradient-mono': 'linear-gradient(135deg, #ffffff 0%, #f3f3f3 50%, #111111 100%)',
};

function getWallpaperStyle(settings: UserSettings | null): React.CSSProperties {
  if (!settings) return { background: PRESET_CSS['gradient-blue'] };
  if (settings.wallpaper_type === 'preset') {
    return { background: PRESET_CSS[settings.wallpaper_value] ?? PRESET_CSS['gradient-blue'] };
  }
  if (settings.wallpaper_type === 'color') {
    return { backgroundColor: settings.wallpaper_value };
  }
  return { background: PRESET_CSS['gradient-blue'] };
}

type DesktopProps = {
  className?: string;
  style?: React.CSSProperties;
};

export default function Desktop({ className, style }: DesktopProps) {
  const { windows, closeAllWindows, openWindow } = useWindowStore();
  const settings = useAuthStore((s) => s.settings);
  const openAbout = useUIStore((s) => s.openAbout);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [localWallpaper, setLocalWallpaper] = useState<{
    type: 'preset' | 'color' | 'local' | 'cloud';
    value: string;
  } | null>(null);
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isNativeAvailable()) return;
    const loadLocalWallpaper = async () => {
      const localSettings = await window.yoonosNative?.settings.getLocal();
      if (!localSettings) return;
      setLocalWallpaper({ type: localSettings.wallpaperType, value: localSettings.wallpaperValue });
    };
    loadLocalWallpaper();
    window.addEventListener('focus', loadLocalWallpaper);
    window.addEventListener('yoonos:local-settings-updated', loadLocalWallpaper as EventListener);
    return () => {
      window.removeEventListener('focus', loadLocalWallpaper);
      window.removeEventListener(
        'yoonos:local-settings-updated',
        loadLocalWallpaper as EventListener
      );
    };
  }, []);

  const effectiveWallpaperType = localWallpaper?.type ?? settings?.wallpaper_type ?? 'preset';
  const effectiveWallpaperValue =
    localWallpaper?.value ?? settings?.wallpaper_value ?? 'gradient-blue';

  useEffect(() => {
    if (
      (effectiveWallpaperType === 'custom' || effectiveWallpaperType === 'cloud') &&
      effectiveWallpaperValue
    ) {
      getWallpaperUrl(effectiveWallpaperValue).then((url) => setCustomWallpaperUrl(url ?? null));
      return;
    }
    setCustomWallpaperUrl(null);
  }, [effectiveWallpaperType, effectiveWallpaperValue]);

  const wallpaperStyle: React.CSSProperties =
    effectiveWallpaperType === 'local'
      ? {
          backgroundImage: `url("file://${effectiveWallpaperValue}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : (effectiveWallpaperType === 'custom' || effectiveWallpaperType === 'cloud') &&
        customWallpaperUrl
      ? {
          backgroundImage: `url(${customWallpaperUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : effectiveWallpaperType === 'color'
      ? { backgroundColor: effectiveWallpaperValue }
      : effectiveWallpaperType === 'preset'
      ? { background: PRESET_CSS[effectiveWallpaperValue] ?? PRESET_CSS['gradient-blue'] }
      : getWallpaperStyle(settings);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.window-handle') ||
      (e.target as HTMLElement).closest('[data-app-content]')
    )
      return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClick = useCallback(() => setContextMenu(null), []);

  const contextMenuItems: ContextMenuItem[] = [
    {
      id: 'new-finder',
      label: 'New Finder Window',
      action: () => openWindow('finder'),
    },
    { id: 'sep1', label: '', separator: true },
    {
      id: 'change-wallpaper',
      label: 'Change Wallpaper...',
      action: () => openWindow('systemsettings'),
    },
    { id: 'sep2', label: '', separator: true },
    {
      id: 'close-all',
      label: 'Close All Windows',
      action: () => closeAllWindows(),
    },
    { id: 'sep3', label: '', separator: true },
    {
      id: 'about',
      label: 'About YoonOS',
      action: openAbout,
    },
  ];

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none ${className ?? ''}`}
      style={{ ...wallpaperStyle, ...style }}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      <TopBar />

      <div className="absolute inset-0 pt-7 pb-16">
        {windows.map((win) => {
          const AppComponent = APP_COMPONENTS[win.app];
          return (
            <Window key={win.id} window={win}>
              <div data-app-content className="w-full h-full">
                <AppComponent />
              </div>
            </Window>
          );
        })}
      </div>

      <Dock />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
