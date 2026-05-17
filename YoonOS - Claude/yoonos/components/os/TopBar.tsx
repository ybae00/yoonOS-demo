'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useClock } from '@/hooks/useClock';
import { useWindowStore } from '@/stores/windowStore';
import { useMenuStore } from '@/stores/menuStore';
import { useFinderStore } from '@/stores/finderStore';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { createMenuDefinitions, MenuDefinition } from '@/lib/menu/commands';

function WifiIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

function ControlCenterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="2" width="8" height="8" rx="2" />
      <rect x="14" y="2" width="8" height="8" rx="2" />
      <rect x="2" y="14" width="8" height="8" rx="2" />
      <rect x="14" y="14" width="8" height="8" rx="2" />
    </svg>
  );
}

function DropdownMenu({ menu, onClose }: { menu: MenuDefinition; onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="absolute top-full left-0 mt-0.5 min-w-[200px] rounded-lg border border-black/10 py-1 z-[10001] shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
      }}
    >
      {menu.items.map((item, idx) => {
        if (item.separator) {
          return <div key={`sep-${idx}`} className="h-px bg-black/10 my-0.5 mx-2" />;
        }
        return (
          <button
            key={item.id}
            role="menuitem"
            disabled={item.disabled}
            className="w-full flex items-center justify-between px-3 py-1 text-xs text-black/80 hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
            onClick={() => {
              item.action?.();
              onClose();
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-[10px] text-black/40 ml-4">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function AboutYoonOSModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/25"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="About YoonOS"
    >
      <div
        className="w-[320px] rounded-2xl border border-black/10 p-5 shadow-[0_20px_45px_rgba(0,0,0,0.25)]"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-semibold text-black/90">YoonOS</div>
        <div className="mt-1 text-xs text-black/60">Version 1.0</div>
        <p className="mt-3 text-xs leading-relaxed text-black/75">
          AI-native web operating system built to have fun.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            className="px-3 py-1.5 text-xs rounded-lg border border-black/10 text-black/80 hover:bg-black hover:text-white transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TopBar() {
  const time = useClock();
  const router = useRouter();
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const { activeMenuId, openMenu, closeMenu, toggleMenu } = useMenuStore();
  const {
    openWindow, closeWindow, closeAllWindows, minimizeWindow,
    toggleMaximize, focusNextWindow, windows, activeWindowId, bringToFront,
  } = useWindowStore();
  const { toggleHidden } = useFinderStore();
  const { isAboutOpen, openAbout, closeAbout } = useUIStore();

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().clearUser();
    router.push('/login');
    router.refresh();
  }, [router]);

  const menuDefs = createMenuDefinitions({
    openAbout,
    openSystemSettings: () => openWindow('systemsettings'),
    signOut: handleSignOut,
    openFinder: () => openWindow('finder'),
    closeWindow: () => {
      if (activeWindowId) closeWindow(activeWindowId);
    },
    closeAllWindows,
    minimizeWindow: () => {
      if (activeWindowId) minimizeWindow(activeWindowId);
    },
    maximizeWindow: () => {
      if (activeWindowId) toggleMaximize(activeWindowId);
    },
    focusNextWindow,
    bringAllToFront: () => {
      windows.filter((w) => w.minimized).forEach((w) => bringToFront(w.id));
    },
    toggleHiddenFiles: toggleHidden,
    openWindows: windows
      .filter((w) => !w.minimized)
      .sort((a, b) => b.zIndex - a.zIndex)
      .map((w) => ({
        id: w.id,
        title: w.title,
        isActive: w.id === activeWindowId,
        focus: () => bringToFront(w.id),
      })),
  });

  useEffect(() => {
    if (!activeMenuId) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu-bar]')) {
        closeMenu();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [activeMenuId, closeMenu]);

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-[9999] flex h-7 items-center text-black/80 text-xs select-none border-b border-black/10"
        style={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
        data-menu-bar
      >
        <div className="flex items-center h-full">
          {menuDefs.map((menu) => (
            <div key={menu.id} className="relative h-full">
              <button
                className={`h-full px-2.5 text-[12px] transition-colors ${
                  menu.id === 'yoonos' ? 'font-semibold px-3 text-[13px]' : ''
                } ${activeMenuId === menu.id ? 'bg-black text-white' : 'hover:bg-black/5'}`}
                onClick={() => toggleMenu(menu.id)}
                onMouseEnter={() => {
                  if (activeMenuId && activeMenuId !== menu.id) {
                    openMenu(menu.id);
                  }
                }}
              >
                {menu.label}
              </button>
              {activeMenuId === menu.id && (
                <DropdownMenu menu={menu} onClose={closeMenu} />
              )}
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center h-full gap-2 px-3 text-[12px]">
          <span className="flex items-center justify-center w-5 h-5">
            <WifiIcon />
          </span>
          <span className="text-[11px] font-medium">100%</span>
          <span className="flex items-center justify-center w-5 h-5">
            <ControlCenterIcon />
          </span>
          <span className="tabular-nums whitespace-nowrap">{date} {time}</span>
        </div>
      </header>

      {isAboutOpen && (
        <AboutYoonOSModal onClose={closeAbout} />
      )}
    </>
  );
}
