'use client';

import React, { useState } from 'react';
import { Sparkles, Clock, Zap, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useAudioAlert } from '@/hooks/useAudioAlert';

interface DemoToolbarProps {
  onSeed: () => void;
  onAgeLead: () => void;
  onRunStallCheck: () => void;
}

export function DemoToolbar({ onSeed, onAgeLead, onRunStallCheck }: DemoToolbarProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const { playChime } = useAudioAlert();

  const handleAction = (label: string, action: () => void) => {
    action();
    setFeedback(label);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Toolbar Label */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Section 13 Demo Control:
          </span>
          <span className="hidden md:inline text-slate-500">Test zero-latency ingestion, stall aging, and pg_cron triggers</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleAction('Realistic leads seeded across 6 stages!', onSeed)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium border border-slate-200 transition shadow-sm"
          >
            <RotateCcw className="w-3 h-3 text-blue-600" />
            <span>Seed 6 Stages</span>
          </button>

          <button
            onClick={() => handleAction('Aged Counseling lead by -3 Days (72 hrs)!', onAgeLead)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium border border-amber-200 transition shadow-sm"
          >
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Age Lead (-3 Days)</span>
          </button>

          <button
            onClick={() => {
              playChime();
              handleAction('pg_cron Stall Evaluator executed: Breach flagged!', onRunStallCheck);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium shadow-sm transition"
          >
            <Zap className="w-3 h-3 text-white" />
            <span>Trigger pg_cron Stall Check</span>
          </button>
        </div>

      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className="max-w-7xl mx-auto mt-2">
          <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-blue-800 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{feedback}</span>
          </div>
        </div>
      )}
    </div>
  );
}
