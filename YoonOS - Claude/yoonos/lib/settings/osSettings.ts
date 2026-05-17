import type { LocalSettings } from '@/electron/ipc';
import type { UserSettings } from '@/types';
import { isNativeAvailable } from '@/types/native';

export type WallpaperSource = 'preset' | 'color' | 'cloud' | 'local';

export type ResolvedWallpaper = {
  source: WallpaperSource;
  value: string;
  cssBackground?: string;
  imageUrl?: string;
};

export async function getLocalSettings(): Promise<LocalSettings | null> {
  if (!isNativeAvailable()) return null;
  return window.yoonosNative!.settings.getLocal();
}

export async function setLocalSettings(partial: Partial<LocalSettings>): Promise<void> {
  if (!isNativeAvailable()) return;
  await window.yoonosNative!.settings.setLocal(partial);
}

export function resolveWallpaper(
  cloudSettings: UserSettings | null,
  localSettings: LocalSettings | null
): ResolvedWallpaper {
  if (localSettings?.wallpaperType === 'local' && localSettings.wallpaperValue) {
    return {
      source: 'local',
      value: localSettings.wallpaperValue,
      imageUrl: `file://${localSettings.wallpaperValue}`,
    };
  }

  if (!cloudSettings) {
    return { source: 'preset', value: 'gradient-blue' };
  }

  switch (cloudSettings.wallpaper_type) {
    case 'preset':
      return { source: 'preset', value: cloudSettings.wallpaper_value };
    case 'color':
      return { source: 'color', value: cloudSettings.wallpaper_value, cssBackground: cloudSettings.wallpaper_value };
    case 'custom':
      return { source: 'cloud', value: cloudSettings.wallpaper_value };
    default:
      return { source: 'preset', value: 'gradient-blue' };
  }
}
