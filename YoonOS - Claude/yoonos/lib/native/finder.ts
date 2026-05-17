import type { DirectoryListing, FileMetadata, PickedFile } from '@/electron/ipc';
import { virtualListDirectory, virtualReadFileMetadata, VIRTUAL_SIDEBAR_LOCATIONS, resolveVirtualPath } from './virtualFs';

function getNative() {
  if (typeof window !== 'undefined' && window.yoonosNative) {
    return window.yoonosNative;
  }
  return null;
}

export function isNativeMode(): boolean {
  return !!getNative();
}

export async function listDirectory(dirPath: string): Promise<DirectoryListing> {
  const native = getNative();
  if (native) {
    return native.finder.listDirectory(dirPath);
  }
  return virtualListDirectory(dirPath);
}

export async function readFileMetadata(filePath: string): Promise<FileMetadata | null> {
  const native = getNative();
  if (native) {
    return native.finder.readFileMetadata(filePath);
  }
  return virtualReadFileMetadata(filePath);
}

export async function openPath(filePath: string): Promise<{ success: boolean; error?: string }> {
  const native = getNative();
  if (native) {
    return native.finder.openPath(filePath);
  }
  return { success: false, error: 'Open is not available in browser mode' };
}

export async function revealInFinder(filePath: string): Promise<void> {
  const native = getNative();
  if (native) {
    await native.finder.revealInFinder(filePath);
  }
}

export async function pickDirectory(): Promise<string | null> {
  const native = getNative();
  if (native) {
    return native.finder.pickDirectory();
  }
  return null;
}

export async function pickFiles(options?: { filters?: { name: string; extensions: string[] }[] }): Promise<PickedFile[] | null> {
  const native = getNative();
  if (native) {
    return native.finder.pickFiles(options);
  }
  return null;
}

export function getSidebarLocations() {
  const native = getNative();
  if (native) {
    return [
      { id: 'home', label: 'Home', path: '~' },
      { id: 'desktop', label: 'Desktop', path: '~/Desktop' },
      { id: 'documents', label: 'Documents', path: '~/Documents' },
      { id: 'downloads', label: 'Downloads', path: '~/Downloads' },
      { id: 'pictures', label: 'Pictures', path: '~/Pictures' },
      { id: 'music', label: 'Music', path: '~/Music' },
      { id: 'applications', label: 'Applications', path: '/Applications' },
    ] as const;
  }
  return VIRTUAL_SIDEBAR_LOCATIONS;
}

export function resolveHomePath(p: string): string {
  const native = getNative();
  if (native && native.platform === 'darwin') {
    if (p.startsWith('~')) {
      return p.replace('~', `/Users/${getUsernameNative()}`);
    }
    return p;
  }
  return resolveVirtualPath(p);
}

function getUsernameNative(): string {
  return 'yoonbae';
}

export { VIRTUAL_SIDEBAR_LOCATIONS as SIDEBAR_LOCATIONS };
