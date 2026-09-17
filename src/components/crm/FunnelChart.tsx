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
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Agency Placement Funnel & Velocity
          </h3>
          <p className="text-xs text-slate-500">Conversion across the 6 relational brokerage admission stages</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600">Total Leads:</span>
            <strong className="text-slate-900 font-mono">{totalLeads}</strong>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Conversion Rate:</span>
            <strong className="font-mono font-bold text-emerald-700">{conversionRate}%</strong>
          </div>
        </div>
      </div>

      {/* Funnel Visual Bars */}
      <div className="space-y-3">
        {STAGES.map((stage) => {
          const count = leads.filter((l) => l.stage === stage).length;
          const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;

          return (
            <div key={stage} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{stage}</span>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                  <span>{count} candidates</span>
                  <span className="text-slate-400">({percentage}%)</span>
                </div>
              </div>

              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-500 rounded-full"
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
