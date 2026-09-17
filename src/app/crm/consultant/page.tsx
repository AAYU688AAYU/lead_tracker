'use client';

import React from 'react';
import { PipelineKanban } from '@/components/crm/PipelineKanban';
import { StallAlertsBanner } from '@/components/crm/StallAlertsBanner';
import { FunnelChart } from '@/components/crm/FunnelChart';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

export default function ConsultantCRMPage() {
  const { leads, updateStage, logContact } = useSupabaseRealtime();
  const stalledLeads = leads.filter((l) => l.is_stalled);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white">Consultant Operations Desk</h1>
            <p className="text-xs text-slate-400">Assigned Pipeline & 6-Stage Real-Time Advisory Workflow</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-blue-400 bg-blue-950/40 px-3 py-1 rounded-xl border border-blue-500/30">
              {leads.length} Candidates Assigned
            </span>
          </div>
        </div>

        <StallAlertsBanner
          stalledLeads={stalledLeads}
          onLogCallForLead={(lead) => logContact(lead.id, 'PHONE', 'Advisory session conducted.')}
        />

        <PipelineKanban
          leads={leads}
          onUpdateStage={updateStage}
          onLogContact={logContact}
        />

        <FunnelChart leads={leads} />
      </div>
    </div>
  );
}
