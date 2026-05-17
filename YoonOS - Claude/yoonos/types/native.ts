import type { NativeAPI } from '@/electron/ipc';

declare global {
  interface Window {
    yoonosNative?: NativeAPI;
  }
}

export function isNativeAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.yoonosNative;
}

export function getNativeAPI(): NativeAPI | null {
  if (isNativeAvailable()) {
    return window.yoonosNative!;
  }
  return null;
}
