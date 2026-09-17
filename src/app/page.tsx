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
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<Lead | null>(null);

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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
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
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/30 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Section 13 Side-by-Side Presentation Mode</h3>
                  <p className="text-xs text-slate-300">
                    Left Panel captures B2C student inquiries. Right Panel receives instant &lt;100ms updates via Supabase Realtime without page refresh.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-blue-300 bg-blue-900/40 px-3 py-1 rounded-lg border border-blue-500/20">
                <span>POST /public.leads</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
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
                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Pipeline Kanban Board</h4>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
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
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">Student Placement & Advisory Portal</h2>
                <p className="text-xs text-slate-400">Welcome, Aryan Verma • Target Destination: Canada</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-500/30">
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
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">Consultant Operations Desk</h2>
                <p className="text-xs text-slate-400">Portfolio: Counselor Priya Sharma (New Delhi Branch) • 6-Stage Realtime Pipeline</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <span className="text-slate-400">Active Pipeline:</span>{' '}
                  <strong className="text-white font-mono">{leads.length} Students</strong>
                </div>
                {stalledLeads.length > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-red-950/50 border border-red-500/50 text-xs text-red-300 flex items-center gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
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
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">Agency Super-Admin Governance</h2>
                <p className="text-xs text-slate-400">Executive Director: Dr. Alistair Finch • Global Institutional Oversight</p>
              </div>
              <span className="text-xs font-mono text-purple-400 bg-purple-950/40 px-3 py-1 rounded-xl border border-purple-500/30">
                Global Platform Oversight
              </span>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400 font-medium">Total Registered Candidates</div>
                <div className="text-2xl font-bold text-white font-mono mt-1">{leads.length}</div>
                <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>+18% intake growth</span>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400 font-medium">Partner Universities</div>
                <div className="text-2xl font-bold text-white font-mono mt-1">48 Institutions</div>
                <div className="text-[11px] text-blue-400 mt-1">UK, Canada, Germany, Australia</div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400 font-medium">Active SLA Inactivity Breaches</div>
                <div className="text-2xl font-bold text-red-400 font-mono mt-1">{stalledLeads.length}</div>
                <div className="text-[11px] text-red-300 mt-1">Monitored via pg_cron (every 1m)</div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400 font-medium">Consultant Conversion Avg</div>
                <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">16.8%</div>
                <div className="text-[11px] text-slate-400 mt-1">Target: &gt;15.0%</div>
              </div>
            </div>

            <FunnelChart leads={leads} />

            {/* Dynamic SLA Threshold Manager */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    Dynamic Stage SLA Inactivity Thresholds (Work 4 Engine)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Custom hours before pg_cron marks lead as stalled and pushes realtime alarm to counselor
                  </p>
                </div>
                <span className="text-xs font-mono text-blue-400 bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-500/30">
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
                  <div key={s.stage} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{s.stage}</div>
                      <div className="text-slate-400 font-mono text-[11px] mt-0.5">SLA: {s.threshold}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      s.severity === 'CRITICAL'
                        ? 'bg-red-950/60 text-red-400 border border-red-500/40'
                        : s.severity === 'HIGH'
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                        : s.severity === 'MEDIUM'
                        ? 'bg-blue-950/60 text-blue-400 border border-blue-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {s.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* University Institutional Contracts */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Partner Educational Institutions Directory
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: 'University of Toronto', country: 'Canada', tier: 'Direct Agreement', ranking: '#21 Global' },
                  { name: 'University of Oxford', country: 'United Kingdom', tier: 'Preferred Partner', ranking: '#1 Global' },
                  { name: 'University of Melbourne', country: 'Australia', tier: 'Direct Agreement', ranking: '#14 Global' },
                  { name: 'Technical University of Munich', country: 'Germany', tier: 'Preferred Partner', ranking: '#37 Global' },
                ].map((u) => (
                  <div key={u.name} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-slate-400 text-[11px]">{u.country} • {u.ranking}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
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
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>GlobalStudy B2B2C Educational Placement Agency CRM • Next.js 15 + Supabase Architecture</p>
      </footer>
    </div>
  );
}
