'use client';

import { useCallback, useRef, useState, ReactNode } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { X, Minus, Maximize2 } from 'lucide-react';
import { useWindowStore } from '@/stores/windowStore';
import { WindowState } from '@/types';

type WindowProps = {
  window: WindowState;
  children: ReactNode;
};

export default function Window({ window: win, children }: WindowProps) {
  const { closeWindow, minimizeWindow, toggleMaximize, bringToFront, updatePosition, updateSize } =
    useWindowStore();
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const handleDragStop = useCallback(
    (_: DraggableEvent, data: DraggableData) => {
      updatePosition(win.id, data.x, data.y);
    },
    [win.id, updatePosition]
  );

  const handleMouseDownResize = useCallback(
    (e: React.MouseEvent) => {
      if (win.maximized) return;
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: win.width,
        startH: win.height,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const dx = ev.clientX - resizeRef.current.startX;
        const dy = ev.clientY - resizeRef.current.startY;
        updateSize(
          win.id,
          Math.max(300, resizeRef.current.startW + dx),
          Math.max(200, resizeRef.current.startH + dy)
        );
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        resizeRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [win.id, win.width, win.height, win.maximized, updateSize]
  );

  const handleTitleBarDoubleClick = useCallback(() => {
    toggleMaximize(win.id);
  }, [win.id, toggleMaximize]);

  if (win.minimized) return null;

  const windowStyle: React.CSSProperties = win.maximized
    ? { width: '100%', height: '100%', zIndex: win.zIndex }
    : { width: win.width, height: win.height, zIndex: win.zIndex };

  const windowContent = (
    <div
      ref={nodeRef}
      className={win.maximized ? 'w-full h-full' : 'absolute'}
      style={windowStyle}
      onMouseDown={() => bringToFront(win.id)}
    >
      <div className={`w-full h-full shadow-[0_22px_48px_rgba(0,0,0,0.16)] ${win.maximized ? '' : 'rounded-[10px]'} overflow-hidden flex flex-col border border-black/10 bg-white/90 animate-window-open`}>
        <div
          className={`window-handle flex items-center h-[38px] px-3 select-none ${win.maximized ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} flex-shrink-0 border-b border-black/10 bg-white/82`}
          style={{
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
          onDoubleClick={handleTitleBarDoubleClick}
        >
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeWindow(win.id);
              }}
              className="w-3 h-3 rounded-full bg-white border border-black/30 hover:bg-black transition-all flex items-center justify-center group"
            >
              <X className="w-2 h-2 text-white opacity-0 group-hover:opacity-100" strokeWidth={3} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                minimizeWindow(win.id);
              }}
              className="w-3 h-3 rounded-full bg-white border border-black/25 hover:bg-black/70 transition-all flex items-center justify-center group"
            >
              <Minus className="w-2 h-2 text-white opacity-0 group-hover:opacity-100" strokeWidth={3} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMaximize(win.id);
              }}
              className="w-3 h-3 rounded-full bg-white border border-black/20 hover:bg-black/50 transition-all flex items-center justify-center group"
            >
              <Maximize2 className="w-1.5 h-1.5 text-white opacity-0 group-hover:opacity-100" strokeWidth={3} />
            </button>
          </div>
          <span className="flex-1 text-center text-xs text-black/55 truncate px-4 font-medium">
            {win.title}
          </span>
          <div className="w-[54px]" />
        </div>

        <div className="flex-1 overflow-hidden bg-white/95 relative">
          {children}
        </div>

        {!win.maximized && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
            onMouseDown={handleMouseDownResize}
          />
        )}
      </div>
    </div>
  );

  if (win.maximized) {
    return windowContent;
  }

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      handle=".window-handle"
      position={{ x: win.x, y: win.y }}
      onStop={handleDragStop}
      onStart={() => bringToFront(win.id)}
      disabled={isResizing}
      bounds="parent"
    >
      {windowContent}
    </Draggable>
  );
}
