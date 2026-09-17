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
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <h3 className="text-xs font-bold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-600" />
            Active SLA Inactivity Breaches ({stalledLeads.length})
          </h3>
        </div>
        <span className="text-[11px] text-red-700 font-medium">pg_cron threshold breached • Action required</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {stalledLeads.map((lead) => {
          const studentName = lead.metadata?.student_name || 'Candidate';
          return (
            <div
              key={lead.id}
              className="bg-white border border-red-200 p-3 rounded-xl flex items-center justify-between gap-2 shadow-sm"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 truncate">{studentName}</div>
                <div className="flex items-center gap-1 text-[10px] text-red-600 font-mono mt-0.5">
                  <Clock className="w-3 h-3 text-red-500" />
                  <span>Stage: {lead.stage} (Threshold Exceeded)</span>
                </div>
              </div>

              <button
                onClick={() => onLogCallForLead(lead)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold transition shrink-0 shadow-sm"
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
