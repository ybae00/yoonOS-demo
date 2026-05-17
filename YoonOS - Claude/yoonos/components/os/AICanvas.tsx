'use client';

/**
 * AICanvas — the root screen of YoonOS.
 *
 * A white canvas that hosts the force-graph nodes directly. The OS desktop
 * appears as a scaled-down PiP panel on the right once nodes are drawn.
 * Clicking the PiP expands the desktop as a full-screen modal overlay.
 */

import { useCallback } from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import Desktop from './Desktop';
import ChatBar from '@/components/agent/ChatBar';
import ApprovalCard from '@/components/agent/ApprovalCard';
import AgentGraph from '@/components/agent/AgentGraph';
import { useAgentStore } from '@/stores/agentStore';
import { useGraphStore } from '@/stores/graphStore';
import { useUIStore } from '@/stores/uiStore';

const PIP_SCALE = 0.45;

export default function AICanvas() {
  const agentStatus = useAgentStore((s) => s.status);
  const storeNodes = useGraphStore((s) => s.nodes);
  const clearGraph = useGraphStore((s) => s.clearGraph);
  const abort = useAgentStore((s) => s.abort);
  const desktopExpanded = useUIStore((s) => s.desktopExpanded);
  const expandDesktop = useUIStore((s) => s.expandDesktop);
  const collapseDesktop = useUIStore((s) => s.collapseDesktop);

  const hasNodes = storeNodes.length > 0;
  const isRunning = agentStatus === 'running';

  const handleClearGraph = useCallback(() => {
    if (isRunning) abort();
    clearGraph();
  }, [isRunning, abort, clearGraph]);

  return (
    <div className="fixed inset-0 bg-white overflow-hidden">

      {/* Force graph — fills the entire canvas background */}
      {hasNodes && <AgentGraph />}

      {/* PiP desktop — appears on the right when nodes exist, fully interactive */}
      {hasNodes && !desktopExpanded && (
        <div
          className="absolute top-4 right-4 z-20 overflow-hidden rounded-2xl shadow-2xl border border-black/10 transition-all duration-500 ease-out"
          style={{ width: '45%', aspectRatio: '16 / 10' }}
        >
          <div
            className="absolute inset-0 origin-top-left"
            style={{
              width: `${100 / PIP_SCALE}%`,
              height: `${100 / PIP_SCALE}%`,
              transform: `scale(${PIP_SCALE})`,
              transformOrigin: 'top left',
            }}
          >
            <Desktop />
          </div>
          <button
            onClick={expandDesktop}
            className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
            title="Expand desktop"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Desktop modal overlay — full-screen interactive desktop */}
      {desktopExpanded && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="absolute inset-4 rounded-2xl overflow-hidden shadow-2xl">
            <Desktop />
            <button
              onClick={collapseDesktop}
              className="absolute top-3 right-3 z-[10000] flex items-center gap-1.5 px-3 py-1.5 bg-black/70 hover:bg-black/90 text-white text-[11px] font-medium rounded-full backdrop-blur-sm transition-colors"
            >
              <Minimize2 className="w-3 h-3" />
              Back to Canvas
            </button>
          </div>
        </div>
      )}

      {/* Take Over button — visible while agent is running */}
      {!desktopExpanded && (
        <div
          className="fixed top-0 left-0 right-0 z-[9998] flex justify-center pt-2 pointer-events-none"
          style={{
            opacity: isRunning ? 1 : 0,
            transition: 'opacity 0.25s ease',
          }}
        >
          <button
            onClick={() => {
              abort();
              clearGraph();
            }}
            className="pointer-events-auto flex items-center gap-2 px-4 py-1.5 bg-black text-white text-[11px] font-semibold rounded-full shadow-lg hover:bg-black/75 active:scale-95 transition-all tracking-wide"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Take Over
          </button>
        </div>
      )}

      {/* Clear graph button — top-left, visible when nodes exist */}
      {hasNodes && !desktopExpanded && (
        <button
          onClick={handleClearGraph}
          className="fixed top-3 left-3 z-[9998] p-1.5 rounded-full hover:bg-black/5 transition-colors"
          title="Clear graph"
        >
          <X className="w-4 h-4 text-black/25" />
        </button>
      )}

      {/* Approval card — floats when awaiting approval */}
      {!desktopExpanded && agentStatus === 'awaiting_approval' && <ApprovalCard />}

      {/* Chat bar — centered when idle, bottom when active */}
      {!desktopExpanded && <ChatBar />}
    </div>
  );
}
