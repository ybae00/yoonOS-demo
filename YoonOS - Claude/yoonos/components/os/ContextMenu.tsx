'use client';

import { useEffect, useRef } from 'react';

export type ContextMenuItem = {
  id: string;
  label: string;
  separator?: boolean;
  disabled?: boolean;
  action?: () => void;
};

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) {
      menuRef.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > vh) {
      menuRef.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed rounded-xl border border-black/10 py-1.5 z-[10000] min-w-[180px] shadow-[0_18px_35px_rgba(0,0,0,0.12)]"
      style={{
        left: x,
        top: y,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
      }}
    >
      {items.map((item, idx) => {
        if (item.separator) {
          return <div key={`sep-${idx}`} className="h-px bg-black/10 my-0.5" />;
        }
        return (
          <button
            key={item.id}
            role="menuitem"
            disabled={item.disabled}
            className="w-full text-left px-3 py-1.5 text-xs text-black/75 hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
            onClick={() => {
              item.action?.();
              onClose();
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
