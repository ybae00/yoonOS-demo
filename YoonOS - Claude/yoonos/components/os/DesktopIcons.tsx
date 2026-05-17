'use client';

import { useCallback, useState } from 'react';
import { Folder, HardDrive, Trash2 } from 'lucide-react';
import { useWindowStore } from '@/stores/windowStore';

type DesktopIcon = {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  action: () => void;
};

export default function DesktopIcons() {
  const { openWindow } = useWindowStore();
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  const icons: DesktopIcon[] = [
    {
      id: 'finder',
      label: 'Macintosh HD',
      Icon: HardDrive,
      color: 'text-black/65',
      action: () => openWindow('finder'),
    },
    {
      id: 'documents',
      label: 'Documents',
      Icon: Folder,
      color: 'text-black/65',
      action: () => openWindow('finder'),
    },
    {
      id: 'trash',
      label: 'Trash',
      Icon: Trash2,
      color: 'text-black/55',
      action: () => {},
    },
  ];

  const handleIconClick = useCallback((id: string) => {
    setSelectedIcon(id);
  }, []);

  const handleIconDoubleClick = useCallback((icon: DesktopIcon) => {
    icon.action();
  }, []);

  return (
    <div
      className="absolute top-2 right-3 flex flex-col gap-2 items-end z-[1]"
      onClick={(e) => e.stopPropagation()}
    >
      {icons.map((icon) => {
        const isSelected = selectedIcon === icon.id;
        return (
          <div
            key={icon.id}
            className={`flex flex-col items-center w-[72px] p-1.5 rounded-lg cursor-default transition-colors ${
              isSelected ? 'bg-black/10' : 'hover:bg-black/5'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleIconClick(icon.id);
            }}
            onDoubleClick={() => handleIconDoubleClick(icon)}
          >
            <icon.Icon className={`w-10 h-10 ${icon.color}`} />
            <span className="text-[10px] text-black text-center mt-1 leading-tight line-clamp-2">
              {icon.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
