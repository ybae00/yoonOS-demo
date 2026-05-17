'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { useAgentStore } from '@/stores/agentStore';
import { useGraphStore } from '@/stores/graphStore';
import { runAgentTask } from '@/lib/agent/agentLoop';

export default function ChatBar() {
  const [input, setInput] = useState('');
  const {
    status,
    responseText,
    error,
    abort,
  } = useAgentStore();
  const storeNodes = useGraphStore((s) => s.nodes);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const task = input.trim();
      if (!task || status === 'running') return;
      setInput('');
      runAgentTask(task);
    },
    [input, status]
  );

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [responseText]);

  const isRunning = status === 'running';
  const isDone = status === 'done';
  const isAwaitingApproval = status === 'awaiting_approval';
  const isIdle = status === 'idle';
  const hasNodes = storeNodes.length > 0;

  const isIdleStart = isIdle && !hasNodes;
  const isActiveBottom = isRunning || isAwaitingApproval || isDone || (hasNodes && !isIdle);

  const statusDotClass = isDone
    ? 'bg-green-600'
    : isRunning || isAwaitingApproval
      ? 'bg-orange-500'
      : 'bg-black';

  useEffect(() => {
    if (isIdleStart) {
      inputRef.current?.focus();
    }
  }, [isIdleStart]);

  return (
    <>
      {/* Response text - transparent, fades upward */}
      {isActiveBottom && (responseText || error) && (
        <div className="fixed bottom-28 left-0 right-0 z-[9998] pointer-events-none">
          <div
            ref={responseRef}
            className="relative mx-auto max-w-[567px] px-3 max-h-40 overflow-hidden"
          >
            <div
              className="absolute inset-x-0 top-0 h-16 z-10"
              style={{ background: 'linear-gradient(to bottom, white, transparent)' }}
            />
            <div className="py-2">
              {error ? (
                <p className="text-xs text-black/50 whitespace-pre-wrap">{error}</p>
              ) : (
                <p className="text-xs text-black/50 whitespace-pre-wrap">{responseText}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prompt bar - centered when idle/start, bottom when active */}
      <div
        className={
          isIdleStart
            ? 'fixed left-1/2 top-1/2 z-[9998] w-full max-w-[567px] px-3 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out'
            : 'fixed bottom-14 left-0 right-0 z-[9998] transition-all duration-500 ease-out'
        }
      >
        <div className={isIdleStart ? '' : 'mx-auto max-w-[567px] px-3'}>
          <form
            onSubmit={handleSubmit}
            className="flex items-center justify-between rounded-[20px] bg-[#fdfdfd] pl-3 pr-2 py-2 shadow-[2px_2px_13px_rgba(0,0,0,0.15)]"
          >
            <div className="flex items-center gap-[17px] min-w-0 flex-1">
              <div className={`w-[18px] h-[18px] rounded-full shrink-0 ${statusDotClass}`} />
              {isRunning ? (
                <span className="text-[14px] text-black/45 whitespace-nowrap">Working...</span>
              ) : isAwaitingApproval ? (
                <span className="text-[14px] text-black/45 whitespace-nowrap">Approve a plan to continue...</span>
              ) : (
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="What should we make today?"
                  disabled={isRunning || isAwaitingApproval}
                  className="flex-1 min-w-0 bg-transparent text-black/80 text-[14px] outline-none placeholder:text-[#e3e3e3] disabled:opacity-50"
                />
              )}
            </div>
            {isRunning ? (
              <button
                type="button"
                onClick={abort}
                className="size-[26px] rounded-full bg-black/80 hover:bg-black transition-colors flex items-center justify-center shrink-0"
                title="Stop agent"
              >
                <Square className="w-3 h-3 text-white" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || isAwaitingApproval}
                className="size-[26px] rounded-full bg-[#d6d6d6] hover:bg-[#cbcbcb] disabled:opacity-60 transition-colors flex items-center justify-center shrink-0"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#f4f4f4]" strokeWidth={2.5} />
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
