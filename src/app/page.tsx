'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { DemoToolbar } from '@/components/demo/DemoToolbar';
import { PipelineKanban } from '@/components/crm/PipelineKanban';
import { FunnelChart } from '@/components/crm/FunnelChart';
import { StallAlertsBanner } from '@/components/crm/StallAlertsBanner';
import { StudentForm } from '@/components/portal/StudentForm';
import { DocumentUploader } from '@/components/portal/DocumentUploader';
import { MilestoneTracker } from '@/components/portal/MilestoneTracker';
import { AutoResponseSandbox } from '@/components/demo/AutoResponseSandbox';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { Lead } from '@/types/database';
import { 
  Building2, 
  Users2, 
  Sliders, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'split' | 'student' | 'crm' | 'admin'>('split');

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

  // Demo helper: Age a counseling lead to trigger an SLA breach
  const handleAgeLead = () => {
    const targetLead = leads.find((l) => l.stage === 'Counseling') || leads[0];
    if (targetLead) {
      ageLead(targetLead.id, 3);
    }
  };

  const handleResolveLeadCall = (lead: Lead) => {
    logContact(lead.id, 'PHONE', 'Advisory follow-up completed. Clarified requirements.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stalledCount={stalledLeads.length}
      />

      {/* Demo Controls Toolbar */}
      <DemoToolbar
        onSeed={seedLeads}
        onAgeLead={handleAgeLead}
        onRunStallCheck={triggerStallCheck}
      />

      {/* Main Presentation Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* =================================================================== */}
        {/* TAB 1: SPLIT PRESENTATION MODE (SECTION 13 COMPLIANCE)             */}
        {/* =================================================================== */}
        {activeTab === 'split' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Presentation Stage Explanation Banner */}
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Section 13 Side-by-Side Presentation Mode</h3>
                  <p className="text-xs text-slate-600">
                    Left Panel captures B2C student inquiries. Right Panel receives instant &lt;100ms updates via Supabase Realtime without page refresh.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm font-medium">
                <span>POST /public.leads</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                <span>WAL WebSocket Push</span>
              </div>
            </div>

            {/* Split Screen Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Panel: Student Intake (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <StudentForm onSubmitLead={addLead} />
                <AutoResponseSandbox logs={commLogs} />
              </div>

              {/* Right Panel: Consultant Real-Time CRM (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <StallAlertsBanner
                  stalledLeads={stalledLeads}
                  onLogCallForLead={handleResolveLeadCall}
                />
                <FunnelChart leads={leads} />
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Live Pipeline Kanban Board</h4>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                      Auto-sync active
                    </span>
                  </div>
                  <PipelineKanban
                    leads={leads}
                    onUpdateStage={updateStage}
                    onLogContact={logContact}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: STUDENT B2C PORTAL (/portal/student)                         */}
        {/* =================================================================== */}
        {activeTab === 'student' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Student Placement & Advisory Portal</h2>
                <p className="text-xs text-slate-500">Welcome, Aryan Verma • Target Destination: Canada</p>
              </div>
              <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 font-medium">
                Milestone 02: Counseling
              </span>
            </div>

            <MilestoneTracker currentStage="Counseling" />
            <DocumentUploader />
            <StudentForm onSubmitLead={addLead} />
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: CONSULTANT CRM (/crm/consultant)                             */}
        {/* =================================================================== */}
        {activeTab === 'crm' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Consultant Operations Desk</h2>
                <p className="text-xs text-slate-500">Portfolio: Counselor Priya Sharma (New Delhi Branch) • 6-Stage Realtime Pipeline</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-sm">
                  <span className="text-slate-500">Active Pipeline:</span>{' '}
                  <strong className="text-slate-900 font-mono">{leads.length} Students</strong>
                </div>
                {stalledLeads.length > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span>{stalledLeads.length} SLA Breaches</span>
                  </div>
                )}
              </div>
            </div>

            <StallAlertsBanner
              stalledLeads={stalledLeads}
              onLogCallForLead={handleResolveLeadCall}
            />

            <PipelineKanban
              leads={leads}
              onUpdateStage={updateStage}
              onLogContact={logContact}
            />

            <FunnelChart leads={leads} />
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: SUPER-ADMIN GOVERNANCE (/admin)                              */}
        {/* =================================================================== */}
        {activeTab === 'admin' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Agency Super-Admin Governance</h2>
                <p className="text-xs text-slate-500">Executive Director: Dr. Alistair Finch • Global Institutional Oversight</p>
              </div>
              <span className="text-xs font-mono text-purple-700 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200 font-medium">
                Global Platform Oversight
              </span>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Total Registered Candidates</div>
                <div className="text-2xl font-bold text-slate-900 font-mono mt-1">{leads.length}</div>
                <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>+18% intake growth</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Partner Universities</div>
                <div className="text-2xl font-bold text-slate-900 font-mono mt-1">48 Institutions</div>
                <div className="text-[11px] text-blue-600 mt-1 font-medium">UK, Canada, Germany, Australia</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Active SLA Inactivity Breaches</div>
                <div className="text-2xl font-bold text-red-600 font-mono mt-1">{stalledLeads.length}</div>
                <div className="text-[11px] text-red-500 mt-1 font-medium">Monitored via pg_cron (every 1m)</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Consultant Conversion Avg</div>
                <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">16.8%</div>
                <div className="text-[11px] text-slate-500 mt-1">Target: &gt;15.0%</div>
              </div>
            </div>

            <FunnelChart leads={leads} />

            {/* Dynamic SLA Threshold Manager */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    Dynamic Stage SLA Inactivity Thresholds (Work 4 Engine)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Custom hours before pg_cron marks lead as stalled and pushes realtime alarm to counselor
                  </p>
                </div>
                <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-medium">
                  pg_cron schedule: * * * * *
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { stage: 'Inquiry', threshold: '24 Hours', severity: 'HIGH' },
                  { stage: 'Counseling', threshold: '48 Hours', severity: 'MEDIUM' },
                  { stage: 'Document Collection', threshold: '72 Hours', severity: 'MEDIUM' },
                  { stage: 'Application', threshold: '48 Hours', severity: 'HIGH' },
                  { stage: 'Fee/Verification', threshold: '24 Hours', severity: 'CRITICAL' },
                  { stage: 'Admitted', threshold: 'Infinite (Terminal)', severity: 'NONE' },
                ].map((s) => (
                  <div key={s.stage} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{s.stage}</div>
                      <div className="text-slate-500 font-mono text-[11px] mt-0.5">SLA: {s.threshold}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      s.severity === 'CRITICAL'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : s.severity === 'HIGH'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : s.severity === 'MEDIUM'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {s.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* University Institutional Contracts */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Partner Educational Institutions Directory
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: 'University of Toronto', country: 'Canada', tier: 'Direct Agreement', ranking: '#21 Global' },
                  { name: 'University of Oxford', country: 'United Kingdom', tier: 'Preferred Partner', ranking: '#1 Global' },
                  { name: 'University of Melbourne', country: 'Australia', tier: 'Direct Agreement', ranking: '#14 Global' },
                  { name: 'Technical University of Munich', country: 'Germany', tier: 'Preferred Partner', ranking: '#37 Global' },
                ].map((u) => (
                  <div key={u.name} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-slate-500 text-[11px]">{u.country} • {u.ranking}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                      {u.tier}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>GlobalStudy B2B2C Educational Placement Agency CRM • Next.js 15 + Supabase Architecture</p>
      </footer>
    </div>
  );
}
