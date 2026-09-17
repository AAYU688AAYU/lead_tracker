'use client';

import React from 'react';
import { TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { Lead, AdmissionStage } from '@/types/database';

interface FunnelProps {
  leads: Lead[];
}

const STAGES: AdmissionStage[] = [
  'Inquiry',
  'Counseling',
  'Document Collection',
  'Application',
  'Fee/Verification',
  'Admitted',
];

export function FunnelChart({ leads }: FunnelProps) {
  const totalLeads = leads.length;
  const admittedLeads = leads.filter((l) => l.stage === 'Admitted').length;
  const conversionRate = totalLeads > 0 ? ((admittedLeads / totalLeads) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Agency Placement Funnel & Velocity
          </h3>
          <p className="text-xs text-slate-400">Conversion across the 6 relational brokerage admission stages</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-2 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Total Leads:</span>
            <strong className="text-white font-mono">{totalLeads}</strong>
          </div>

          <div className="px-3 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Conversion Rate:</span>
            <strong className="font-mono font-bold text-emerald-300">{conversionRate}%</strong>
          </div>
        </div>
      </div>

      {/* Funnel Visual Bars */}
      <div className="space-y-2.5">
        {STAGES.map((stage) => {
          const count = leads.filter((l) => l.stage === stage).length;
          const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;

          return (
            <div key={stage} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">{stage}</span>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span>{count} candidates</span>
                  <span className="text-slate-500">({percentage}%)</span>
                </div>
              </div>

              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.max(percentage, count > 0 ? 5 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
