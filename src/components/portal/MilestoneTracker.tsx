'use client';

import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { AdmissionStage } from '@/types/database';

interface MilestoneProps {
  currentStage: AdmissionStage;
}

const STAGES: AdmissionStage[] = [
  'Inquiry',
  'Counseling',
  'Document Collection',
  'Application',
  'Fee/Verification',
  'Admitted',
];

export function MilestoneTracker({ currentStage }: MilestoneProps) {
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white">Your Placement Journey</h3>
        <p className="text-xs text-slate-400">Live milestone progress tracked by your assigned educational counselor</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={stage}
              className={`p-3 rounded-xl border flex flex-col justify-between min-h-[90px] transition ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : isCurrent
                  ? 'bg-blue-950/40 border-blue-500 text-blue-200 ring-1 ring-blue-500/50'
                  : 'bg-slate-950/50 border-slate-800/80 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold">0{idx + 1}</span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isCurrent ? (
                  <Clock className="w-4 h-4 text-blue-400 animate-spin-slow" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-600" />
                )}
              </div>

              <div>
                <div className="text-xs font-semibold mt-2 truncate">{stage}</div>
                <div className="text-[10px] opacity-75">
                  {isDone ? 'Completed' : isCurrent ? 'In Progress' : 'Upcoming'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
