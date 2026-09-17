'use client';

import React from 'react';
import { FunnelChart } from '@/components/crm/FunnelChart';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { Building2, Sliders, CheckCircle2 } from 'lucide-react';

export default function AdminPage() {
  const { leads } = useSupabaseRealtime();
  const stalledCount = leads.filter((l) => l.is_stalled).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agency Super-Admin Governance</h1>
            <p className="text-xs text-slate-500">Executive Leadership • Institutional Agreements & SLA Configurations</p>
          </div>
          <span className="text-xs font-mono text-purple-700 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200 font-medium">
            Platform Director Mode
          </span>
        </div>

        {/* Analytics Summary */}
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
            <div className="text-2xl font-bold text-red-600 font-mono mt-1">{stalledCount}</div>
            <div className="text-[11px] text-red-500 mt-1 font-medium">Monitored via pg_cron</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Consultant Conversion Avg</div>
            <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">16.8%</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">Target: &gt;15.0%</div>
          </div>
        </div>

        <FunnelChart leads={leads} />

        {/* SLA Threshold Matrix */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                Dynamic Stage SLA Inactivity Thresholds
              </h3>
              <p className="text-xs text-slate-500">
                Inactivity hours before pg_cron marks a lead as stalled and triggers a counselor alert
              </p>
            </div>
            <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-medium">
              pg_cron: * * * * *
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

        {/* Partner Universities */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Partner University Directory
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
    </div>
  );
}
