import type { DirectoryListing, FileMetadata } from '@/electron/ipc';
import { APP_REGISTRY } from '@/lib/apps/registry';

function makeItem(
  name: string,
  parentPath: string,
  overrides: Partial<FileMetadata> = {}
): FileMetadata {
  const now = new Date().toISOString();
  return {
    name,
    path: parentPath === '/' ? `/${name}` : `${parentPath}/${name}`,
    isDirectory: false,
    isSymlink: false,
    size: 0,
    modifiedAt: now,
    createdAt: now,
    extension: name.includes('.') ? name.split('.').pop()! : '',
    permissions: '755',
    ...overrides,
  };
}

function makeFolder(name: string, parentPath: string, modifiedAt?: string): FileMetadata {
  return makeItem(name, parentPath, {
    isDirectory: true,
    extension: '',
    modifiedAt: modifiedAt || new Date().toISOString(),
  });
}

const VIRTUAL_HOME: FileMetadata[] = [
  makeFolder('Desktop', '/Home'),
  makeFolder('Documents', '/Home'),
  makeFolder('Downloads', '/Home'),
  makeFolder('Pictures', '/Home'),
  makeFolder('Music', '/Home'),
  makeFolder('Applications', '/Home'),
];

function getApplicationsListing(): FileMetadata[] {
  return APP_REGISTRY.map((app) =>
    makeItem(`${app.title}.app`, '/Applications', {
      isDirectory: true,
      size: 0,
      extension: 'app',
    })
  );
}

function getDocumentsListing(): FileMetadata[] {
  return [
    makeItem('Welcome.txt', '/Home/Documents', { size: 256, extension: 'txt' }),
    makeItem('Notes.txt', '/Home/Documents', { size: 128, extension: 'txt' }),
    makeFolder('Projects', '/Home/Documents'),
  ];
}

function getDesktopListing(): FileMetadata[] {
  return [
    makeFolder('Screenshots', '/Home/Desktop'),
  ];
}

function getDownloadsListing(): FileMetadata[] {
  return [
    makeItem('readme.pdf', '/Home/Downloads', { size: 45000, extension: 'pdf' }),
  ];
}

function getPicturesListing(): FileMetadata[] {
  return [
    makeFolder('Photo Booth', '/Home/Pictures'),
    makeFolder('Wallpapers', '/Home/Pictures'),
  ];
}

function getMusicListing(): FileMetadata[] {
  return [];
}

function getProjectsListing(): FileMetadata[] {
  return [
    makeFolder('YoonOS', '/Home/Documents/Projects'),
  ];
}

const VIRTUAL_TREE: Record<string, () => FileMetadata[]> = {
  '/': () => [makeFolder('Home', '/'), makeFolder('Applications', '/')],
  '/Home': () => VIRTUAL_HOME,
  '/Home/Desktop': getDesktopListing,
  '/Home/Documents': getDocumentsListing,
  '/Home/Documents/Projects': getProjectsListing,
  '/Home/Downloads': getDownloadsListing,
  '/Home/Pictures': getPicturesListing,
  '/Home/Music': getMusicListing,
  '/Home/Applications': getApplicationsListing,
  '/Applications': getApplicationsListing,
};

export function virtualListDirectory(dirPath: string): DirectoryListing {
  const normalized = normalizePath(dirPath);
  const generator = VIRTUAL_TREE[normalized];

  if (generator) {
    return { path: normalized, items: generator() };
  }

  return { path: normalized, items: [], error: undefined };
}

export function virtualReadFileMetadata(filePath: string): FileMetadata | null {
  const normalized = normalizePath(filePath);
  const parentPath = normalized.split('/').slice(0, -1).join('/') || '/';
  const name = normalized.split('/').pop() || '';
  const generator = VIRTUAL_TREE[parentPath];
  if (!generator) return null;
  return generator().find((item) => item.name === name) ?? null;
}

function normalizePath(p: string): string {
  if (p === '~' || p === '/Home' || p === '') return '/Home';
  if (p.startsWith('~/')) return p.replace('~', '/Home');
  if (!p.startsWith('/')) return `/Home/${p}`;
  return p;
}

export const VIRTUAL_SIDEBAR_LOCATIONS = [
  { id: 'home', label: 'Home', path: '/Home' },
  { id: 'desktop', label: 'Desktop', path: '/Home/Desktop' },
  { id: 'documents', label: 'Documents', path: '/Home/Documents' },
  { id: 'downloads', label: 'Downloads', path: '/Home/Downloads' },
  { id: 'pictures', label: 'Pictures', path: '/Home/Pictures' },
  { id: 'music', label: 'Music', path: '/Home/Music' },
  { id: 'applications', label: 'Applications', path: '/Applications' },
] as const;

export function resolveVirtualPath(p: string): string {
  return normalizePath(p);
}
