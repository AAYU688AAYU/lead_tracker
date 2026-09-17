'use client';

import React from 'react';
import { StudentForm } from '@/components/portal/StudentForm';
import { AutoResponseSandbox } from '@/components/demo/AutoResponseSandbox';
import { PipelineKanban } from '@/components/crm/PipelineKanban';
import { StallAlertsBanner } from '@/components/crm/StallAlertsBanner';
import { FunnelChart } from '@/components/crm/FunnelChart';
import { DemoToolbar } from '@/components/demo/DemoToolbar';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function SplitDemoPage() {
  const {
    leads,
    addLead,
    updateStage,
    ageLead,
    triggerStallCheck,
    logContact,
    seedLeads,
    commLogs,
  } = useSupabaseRealtime();

  const stalledLeads = leads.filter((l) => l.is_stalled);

  const handleAgeLead = () => {
    const targetLead = leads.find((l) => l.stage === 'Counseling') || leads[0];
    if (targetLead) {
      ageLead(targetLead.id, 3);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <DemoToolbar
        onSeed={seedLeads}
        onAgeLead={handleAgeLead}
        onRunStallCheck={triggerStallCheck}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Banner */}
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Section 13 Side-by-Side Presentation Mode</h1>
              <p className="text-xs text-slate-600">
                Left: Student Form submission. Right: Live Consultant CRM with &lt;100ms sync &amp; audio alerts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm font-medium">
            <span>POST /public.leads</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
            <span>WAL WebSocket Push</span>
          </div>
        </div>

        {/* Dual Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-6">
            <StudentForm onSubmitLead={addLead} />
            <AutoResponseSandbox logs={commLogs} />
          </div>

          <div className="lg:col-span-7 space-y-6">
            <StallAlertsBanner
              stalledLeads={stalledLeads}
              onLogCallForLead={(lead) => logContact(lead.id, 'PHONE', 'Advisory session recorded.')}
            />
            <FunnelChart leads={leads} />
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <PipelineKanban
                leads={leads}
                onUpdateStage={updateStage}
                onLogContact={logContact}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
