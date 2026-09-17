'use client';

import React from 'react';
import { MilestoneTracker } from '@/components/portal/MilestoneTracker';
import { DocumentUploader } from '@/components/portal/DocumentUploader';
import { StudentForm } from '@/components/portal/StudentForm';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

export default function StudentPortalPage() {
  const { addLead } = useSupabaseRealtime();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Student Placement & Advisory Portal</h1>
            <p className="text-xs text-slate-500">Manage your university applications, academic portfolios, and offer letters</p>
          </div>
          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 font-medium">
            Student Verified
          </span>
        </div>

        <MilestoneTracker currentStage="Counseling" />
        <DocumentUploader />
        <StudentForm onSubmitLead={addLead} />
      </div>
    </div>
  );
}
