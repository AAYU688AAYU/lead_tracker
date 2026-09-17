'use client';

import React from 'react';
import { AlertCircle, Clock, PhoneCall } from 'lucide-react';
import { Lead } from '@/types/database';

interface StallAlertsProps {
  stalledLeads: Lead[];
  onLogCallForLead: (lead: Lead) => void;
}

export function StallAlertsBanner({ stalledLeads, onLogCallForLead }: StallAlertsProps) {
  if (stalledLeads.length === 0) return null;

  return (
    <div className="bg-red-950/40 border border-red-500/50 rounded-2xl p-4 shadow-lg animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <h3 className="text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-400" />
            Active SLA Inactivity Breaches ({stalledLeads.length})
          </h3>
        </div>
        <span className="text-[11px] text-red-400">pg_cron threshold breached • Urgent action required</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {stalledLeads.map((lead) => {
          const studentName = lead.metadata?.student_name || 'Candidate';
          return (
            <div
              key={lead.id}
              className="bg-slate-900/90 border border-red-500/40 p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-sm"
            >
              <div>
                <div className="text-xs font-semibold text-white truncate">{studentName}</div>
                <div className="flex items-center gap-1 text-[10px] text-red-300 font-mono mt-0.5">
                  <Clock className="w-3 h-3 text-red-400" />
                  <span>Stage: {lead.stage} (Inactivity Threshold Exceeded)</span>
                </div>
              </div>

              <button
                onClick={() => onLogCallForLead(lead)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold transition shrink-0 shadow-sm"
              >
                <PhoneCall className="w-3 h-3" />
                <span>Resolve</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
