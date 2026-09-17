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
    <div className="bg-slate-900/90 border-y border-slate-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Toolbar Label */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Section 13 Demo Control:
          </span>
          <span className="hidden md:inline">Test zero-latency ingestion, stall aging, and pg_cron triggers</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleAction('Realistic leads seeded across 6 stages!', onSeed)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition shadow-sm"
          >
            <RotateCcw className="w-3 h-3 text-blue-400" />
            <span>Seed 6 Stages</span>
          </button>

          <button
            onClick={() => handleAction('Aged Counseling lead by -3 Days (72 hrs)!', onAgeLead)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 text-xs font-medium border border-amber-700/50 transition shadow-sm"
          >
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Age Lead (-3 Days)</span>
          </button>

          <button
            onClick={() => {
              playChime();
              handleAction('pg_cron Stall Evaluator executed: Breach flagged!', onRunStallCheck);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-red-500/20 transition"
          >
            <Zap className="w-3 h-3 text-white" />
            <span>Trigger pg_cron Stall Check</span>
          </button>
        </div>

      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className="max-w-7xl mx-auto mt-2">
          <div className="bg-blue-950/70 border border-blue-500/40 px-3 py-1.5 rounded-md flex items-center gap-2 text-xs text-blue-200 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            <span>{feedback}</span>
          </div>
        </div>
      )}
    </div>
  );
}
