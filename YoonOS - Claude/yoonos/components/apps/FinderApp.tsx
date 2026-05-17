'use client';

import { useEffect, useCallback, useMemo } from 'react';
import {
  Folder, File, ChevronLeft, ChevronRight, ChevronUp,
  RotateCw, Grid, List, Home, Monitor, FileText,
  Download, Image as ImageIcon, Music, AppWindow, Search, Eye, EyeOff,
} from 'lucide-react';
import { useFinderStore } from '@/stores/finderStore';
import { openPath, getSidebarLocations, isNativeMode } from '@/lib/native/finder';
import { useWindowStore } from '@/stores/windowStore';
import { APP_REGISTRY } from '@/lib/apps/registry';
import type { FileMetadata } from '@/electron/ipc';
import type { AppName } from '@/types';

const SIDEBAR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  desktop: Monitor,
  documents: FileText,
  downloads: Download,
  pictures: ImageIcon,
  music: Music,
  applications: AppWindow,
};

function formatSize(bytes: number): string {
  if (bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function FileIcon({ item }: { item: FileMetadata }) {
  if (item.isDirectory) {
    if (item.name.endsWith('.app')) {
      return <AppWindow className="w-4 h-4 text-black/60" />;
    }
    return <Folder className="w-4 h-4 text-black/60" />;
  }
  const ext = item.extension.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-black/60" />;
  }
  if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) {
    return <Music className="w-4 h-4 text-black/60" />;
  }
  if (['txt', 'md', 'json'].includes(ext)) {
    return <FileText className="w-4 h-4 text-black/60" />;
  }
  return <File className="w-4 h-4 text-black/50" />;
}

function appNameFromTitle(title: string): AppName | null {
  const clean = title.replace(/\.app$/, '');
  const entry = APP_REGISTRY.find((a) => a.title === clean);
  return entry?.id ?? null;
}

export default function FinderApp() {
  const {
    currentPath, items, loading, error, history, historyIndex,
    sortField, sortDirection, viewMode, searchQuery, selectedItems,
    showHidden,
    navigateTo, goBack, goForward, goUp, refresh,
    setSort, setViewMode, setSearchQuery, selectItem, clearSelection, toggleHidden,
  } = useFinderStore();

  const { openWindow } = useWindowStore();

  const sidebarLocations = useMemo(() => getSidebarLocations(), []);
  const native = isNativeMode();

  useEffect(() => {
    navigateTo('~');
  }, [navigateTo]);

  const handleItemDoubleClick = useCallback(async (item: FileMetadata) => {
    if (item.isDirectory) {
      if (item.name.endsWith('.app')) {
        const appId = appNameFromTitle(item.name);
        if (appId) {
          openWindow(appId);
          return;
        }
        if (native) {
          await openPath(item.path);
        }
      } else {
        await navigateTo(item.path);
      }
    } else {
      if (native) {
        await openPath(item.path);
      } else {
        const ext = item.extension.toLowerCase();
        if (['txt', 'md', 'json'].includes(ext)) {
          openWindow('textedit');
        }
      }
    }
  }, [navigateTo, openWindow, native]);

  const handleItemClick = useCallback((item: FileMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    selectItem(item.path);
  }, [selectItem]);

  const filteredItems = searchQuery
    ? items.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  const pathSegments = currentPath.split('/').filter(Boolean);

  return (
    <div className="flex h-full bg-white text-black text-xs">
      {/* Sidebar */}
      <div className="w-44 bg-neutral-50 border-r border-black/10 flex flex-col py-2 flex-shrink-0 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-black/35 font-medium">
          Favorites
        </div>
        {sidebarLocations.map((loc) => {
          const Icon = SIDEBAR_ICONS[loc.id] || Folder;
          const isActive = currentPath === loc.path;
          return (
            <button
              key={loc.id}
              onClick={() => navigateTo(loc.path)}
              className={`flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                isActive ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{loc.label}</span>
            </button>
          );
        })}

        {!native && (
          <>
            <div className="h-px bg-black/10 my-2 mx-3" />
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-black/35 font-medium">
              YoonOS
            </div>
            <button
              onClick={() => openWindow('textedit')}
              className="flex items-center gap-2 px-3 py-1.5 text-left text-black/60 hover:bg-black/5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate">Text Edit Files</span>
            </button>
            <button
              onClick={() => openWindow('photobooth')}
              className="flex items-center gap-2 px-3 py-1.5 text-left text-black/60 hover:bg-black/5 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="truncate">Photo Booth</span>
            </button>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-black/10 bg-white flex-shrink-0">
          <button
            onClick={goBack}
            disabled={historyIndex <= 0}
            className="p-1 rounded hover:bg-black/5 disabled:opacity-30 transition-colors"
            title="Back"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={goForward}
            disabled={historyIndex >= history.length - 1}
            className="p-1 rounded hover:bg-black/5 disabled:opacity-30 transition-colors"
            title="Forward"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={goUp} className="p-1 rounded hover:bg-black/5 transition-colors" title="Go up">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={refresh} className="p-1 rounded hover:bg-black/5 transition-colors" title="Refresh">
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 flex items-center gap-0.5 px-2 overflow-hidden">
            {pathSegments.map((part, i) => (
              <span key={i} className="text-black/50 truncate">
                {i > 0 && <span className="mx-0.5">/</span>}
                <span className={i === pathSegments.length - 1 ? 'text-black/90' : ''}>{part}</span>
              </span>
            ))}
          </div>

          {/* View toggles */}
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-black text-white' : 'text-black/50 hover:bg-black/5'}`}
            title="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('icon')}
            className={`p-1 rounded transition-colors ${viewMode === 'icon' ? 'bg-black text-white' : 'text-black/50 hover:bg-black/5'}`}
            title="Icon view"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleHidden}
            className={`p-1 rounded transition-colors ${showHidden ? 'bg-black text-white' : 'text-black/50 hover:bg-black/5'}`}
            title={showHidden ? 'Hide hidden files' : 'Show hidden files'}
          >
            {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Search */}
          <div className="relative ml-1">
            <Search className="w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-black/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-28 pl-5 pr-2 py-1 bg-white border border-black/10 rounded text-[11px] text-black placeholder:text-black/30 focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-auto" onClick={() => clearSelection()}>
          {loading && (
            <div className="flex items-center justify-center h-full text-black/40">
              <RotateCw className="w-5 h-5 animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full text-black/50 p-4">
              <Folder className="w-8 h-8 mb-2 text-black/20" />
              <p className="text-center">{error}</p>
            </div>
          )}

          {!loading && !error && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-black/40">
              <Folder className="w-8 h-8 mb-2 text-black/20" />
              <p>{searchQuery ? 'No matching files' : 'This folder is empty'}</p>
            </div>
          )}

          {!loading && !error && filteredItems.length > 0 && viewMode === 'list' && (
            <div>
              <div className="flex items-center px-3 py-1 border-b border-black/10 text-[10px] text-black/40 uppercase tracking-wider sticky top-0 bg-white">
                <button onClick={() => setSort('name')} className="flex-1 text-left hover:text-black/70">
                  Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button onClick={() => setSort('modifiedAt')} className="w-24 text-left hover:text-black/70">
                  Modified {sortField === 'modifiedAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button onClick={() => setSort('size')} className="w-16 text-right hover:text-black/70">
                  Size {sortField === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
              </div>
              {filteredItems.map((item) => {
                const isSelected = selectedItems.includes(item.path);
                return (
                  <div
                    key={item.path}
                    className={`flex items-center px-3 py-1 cursor-default transition-colors ${
                      isSelected ? 'bg-black/10' : 'hover:bg-black/5'
                    }`}
                    onClick={(e) => handleItemClick(item, e)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      selectItem(item.path);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileIcon item={item} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="w-24 text-black/40 truncate">{formatDate(item.modifiedAt)}</span>
                    <span className="w-16 text-right text-black/40">
                      {item.isDirectory ? '—' : formatSize(item.size)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && filteredItems.length > 0 && viewMode === 'icon' && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2 p-3">
              {filteredItems.map((item) => {
                const isSelected = selectedItems.includes(item.path);
                return (
                  <div
                    key={item.path}
                    className={`flex flex-col items-center p-2 rounded-lg cursor-default transition-colors ${
                      isSelected ? 'bg-black/10' : 'hover:bg-black/5'
                    }`}
                    onClick={(e) => handleItemClick(item, e)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                  >
                    <div className="w-10 h-10 flex items-center justify-center">
                      {item.isDirectory ? (
                        item.name.endsWith('.app') ? (
                          <AppWindow className="w-8 h-8 text-black/60" />
                        ) : (
                          <Folder className="w-8 h-8 text-black/60" />
                        )
                      ) : (
                        <File className="w-8 h-8 text-black/50" />
                      )}
                    </div>
                    <span className="text-[10px] text-center text-black/70 mt-1 w-full truncate">
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1 border-t border-black/10 bg-neutral-50 text-[10px] text-black/40">
          <span>{filteredItems.length} items{selectedItems.length > 0 ? ` — ${selectedItems.length} selected` : ''}</span>
          {!native && <span className="text-black/25">Virtual File System</span>}
        </div>
      </div>
    </div>
  );
}
