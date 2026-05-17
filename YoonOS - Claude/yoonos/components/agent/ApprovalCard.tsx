'use client';

import { useCallback } from 'react';
import { useAgentStore } from '@/stores/agentStore';
import { runAgentTask } from '@/lib/agent/agentLoop';
import { PlanBranchOption } from '@/types';

export default function ApprovalCard() {
  const {
    currentTask,
    status,
    planBranches,
    recommendedBranchId,
    plannerRationale,
  } = useAgentStore();

  const handleApprovePlan = useCallback(
    (branch: PlanBranchOption) => {
      if (!currentTask || status !== 'awaiting_approval') return;
      runAgentTask(currentTask, { approvedPlan: branch });
    },
    [currentTask, status]
  );

  if (status !== 'awaiting_approval' || planBranches.length === 0) return null;

  const recommendedBranch = planBranches.find((b) => b.id === recommendedBranchId);

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9997] w-[280px]">
      <div className="bg-[#e5e5e5] rounded-xl overflow-hidden shadow-lg">
        <div className="px-4 pt-4 pb-2">
          {plannerRationale && (
            <p className="text-[12px] text-black/70 text-center leading-relaxed mb-1">
              {plannerRationale}
            </p>
          )}
          {!plannerRationale && (
            <p className="text-[12px] text-black/70 text-center leading-relaxed mb-1">
              Choose an execution plan
            </p>
          )}
        </div>

        <div className="px-3 pb-3 space-y-1.5">
          {planBranches.map((branch) => {
            const isRecommended = branch.id === recommendedBranchId;
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => handleApprovePlan(branch)}
                className={`w-full text-left rounded-lg px-3 py-2 transition-colors text-[11px] ${
                  isRecommended
                    ? 'bg-white/80 hover:bg-white font-medium'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              >
                <span className="text-black/80">{branch.title}</span>
                <p className="text-[10px] text-black/50 mt-0.5">{branch.summary}</p>
              </button>
            );
          })}
        </div>

        {recommendedBranch && (
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => handleApprovePlan(recommendedBranch)}
              className="w-full rounded-lg bg-black text-white hover:bg-black/80 transition-colors py-2 text-[12px] font-medium"
            >
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
