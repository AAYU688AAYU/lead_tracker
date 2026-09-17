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
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Consultant Operations Desk</h1>
            <p className="text-xs text-slate-500">Assigned Pipeline & 6-Stage Real-Time Advisory Workflow</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 font-semibold shadow-sm">
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
