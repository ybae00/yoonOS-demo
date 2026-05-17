'use client';

import {
  CalendarDays,
  Camera,
  Compass,
  FileText,
  Folder,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { useWindowStore } from '@/stores/windowStore';
import { getDockApps } from '@/lib/apps/registry';
import { AppName } from '@/types';

const MINIMAL_DOCK_ICONS: Record<AppName, LucideIcon> = {
  finder: Folder,
  browser: Compass,
  calendar: CalendarDays,
  photobooth: Camera,
  textedit: FileText,
  systemsettings: Settings,
};

export default function Dock() {
  const { openWindow, windows } = useWindowStore();
  const dockApps = getDockApps();

  return (
    <div
      className="fixed bottom-[30px] left-1/2 -translate-x-1/2 scale-[0.8] origin-bottom flex flex-row items-center gap-0.5 rounded-2xl px-0.5 py-1 z-[9999] border border-black/10 shadow-[0_16px_35px_rgba(0,0,0,0.12)]"
      style={{
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {dockApps.map((entry) => {
        const isOpen = windows.some((w) => w.app === entry.id);
        const IconComponent = MINIMAL_DOCK_ICONS[entry.id];
        return (
          <button
            key={entry.id}
            onClick={() => openWindow(entry.id)}
            className="relative flex flex-col items-center p-1.5 rounded-xl hover:bg-black/5 transition-colors"
          >
            <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/90 border border-black/10 shadow-[0_6px_12px_rgba(0,0,0,0.08)]">
              <IconComponent className="w-[22px] h-[22px] text-black/70" strokeWidth={1.8} />
            </div>
            {isOpen && (
              <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-black/50" />
            )}
          </button>
        );
      })}
    </div>
  );
}
