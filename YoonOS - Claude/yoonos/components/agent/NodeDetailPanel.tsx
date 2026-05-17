'use client';

import { Play, X } from 'lucide-react';
import { runAgentTask } from '@/lib/agent/agentLoop';
import { useAgentStore } from '@/stores/agentStore';
import { ForceGraphNode, STATUS_COLORS, STATUS_LABELS } from './graphUtils';

type NodeDetailPanelProps = {
  node: ForceGraphNode;
  compact?: boolean;
  onClose: () => void;
};

export default function NodeDetailPanel({
  node,
  compact = false,
  onClose,
}: NodeDetailPanelProps) {
  const agentStatus = useAgentStore((s) => s.status);
  const currentTask = useAgentStore((s) => s.currentTask);
  const isInterrupted = node.status === 'interrupted' && agentStatus !== 'running';

  const handleResume = () => {
    if (!currentTask) return;
    onClose();
    runAgentTask(currentTask);
  };

  if (compact) {
    return (
      <div className="absolute inset-0 bg-[#11121a]/95 z-10 overflow-auto p-2 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium text-white">{node.toolName}</span>
          <button onClick={onClose} className="p-0.5 hover:bg-white/10 rounded">
            <X className="w-3 h-3 text-white/60" />
          </button>
        </div>
        <div className="text-[9px] text-white/55 font-mono break-all">
          {JSON.stringify(node.input, null, 1)}
        </div>
        {node.output && (
          <div className="text-[9px] text-white/45 font-mono mt-1 break-all max-h-16 overflow-auto">
            {node.output.slice(0, 300)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-[#11121a]/95 border-l border-purple-900/40 z-10 overflow-auto backdrop-blur-md">
      <div className="flex items-center justify-between p-3 border-b border-purple-900/40">
        <span className="text-xs font-medium text-white">Step Detail</span>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
          <X className="w-3.5 h-3.5 text-white/60" />
        </button>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <div className="text-[10px] text-white/40 mb-0.5">Tool</div>
          <div className="text-sm text-white font-mono">{node.toolName}</div>
        </div>
        <div>
          <div className="text-[10px] text-white/40 mb-0.5">Status</div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full shadow-sm"
              style={{ backgroundColor: STATUS_COLORS[node.status] }}
            />
            <span className="text-xs text-white/80">{STATUS_LABELS[node.status]}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-white/40 mb-0.5">Timestamp</div>
          <div className="text-xs text-white/60">
            {new Date(node.timestamp).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-white/40 mb-0.5">Input</div>
          <pre className="text-[10px] text-white/65 font-mono bg-black/30 rounded p-2 overflow-auto max-h-32 border border-white/5">
            {JSON.stringify(node.input, null, 2)}
          </pre>
        </div>
        {node.output && (
          <div>
            <div className="text-[10px] text-white/40 mb-0.5">Output</div>
            <pre className="text-[10px] text-white/65 font-mono bg-black/30 rounded p-2 overflow-auto max-h-48 border border-white/5">
              {node.output}
            </pre>
          </div>
        )}
        {isInterrupted && currentTask && (
          <button
            onClick={handleResume}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg text-xs text-white transition-colors mt-2"
          >
            <Play className="w-3 h-3" />
            Resume Task
          </button>
        )}
      </div>
    </div>
  );
}
