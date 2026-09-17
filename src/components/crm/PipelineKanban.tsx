'use client';

import React, { useState } from 'react';
import { 
  ArrowRight, 
  PhoneCall, 
  AlertTriangle, 
  MapPin, 
  GraduationCap, 
  Award,
  Sparkles
} from 'lucide-react';
import { Lead, AdmissionStage } from '@/types/database';
import { InteractionLoggerModal } from './InteractionLoggerModal';

const STAGES: AdmissionStage[] = [
  'Inquiry',
  'Counseling',
  'Document Collection',
  'Application',
  'Fee/Verification',
  'Admitted',
];

interface KanbanProps {
  leads: Lead[];
  onUpdateStage: (leadId: string, newStage: AdmissionStage) => void;
  onLogContact: (leadId: string, channel: 'PHONE' | 'WHATSAPP' | 'MEETING', notes: string) => void;
}

export function PipelineKanban({ leads, onUpdateStage, onLogContact }: KanbanProps) {
  const [selectedLeadForContact, setSelectedLeadForContact] = useState<Lead | null>(null);

  const handleAdvance = (lead: Lead) => {
    const currentIndex = STAGES.indexOf(lead.stage);
    if (currentIndex < STAGES.length - 1) {
      onUpdateStage(lead.id, STAGES[currentIndex + 1]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage);
          const stalledInStage = stageLeads.filter((l) => l.is_stalled).length;

          return (
            <div
              key={stage}
              className="bg-slate-100/80 rounded-2xl p-3 border border-slate-200 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{stage}</h3>
                  {stalledInStage > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white text-slate-700 font-bold border border-slate-200 shadow-sm">
                  {stageLeads.length}
                </span>
              </div>

              {/* Column Body */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                {stageLeads.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl bg-white/40">
                    <span>No active leads</span>
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const studentName = lead.metadata?.student_name || 'Applicant';
                    const gpa = lead.metadata?.gpa;
                    const ielts = lead.metadata?.ielts_overall;

                    return (
                      <div
                        key={lead.id}
                        className={`p-3.5 rounded-xl border transition-all duration-200 ${
                          lead.is_stalled
                            ? 'bg-red-50/70 border-red-300 shadow-sm ring-1 ring-red-200'
                            : 'bg-white hover:border-blue-400 border-slate-200/90 shadow-sm hover:shadow-md'
                        }`}
                      >
                        {/* Stall Breach Banner */}
                        {lead.is_stalled && (
                          <div className="mb-2 px-2 py-1 rounded-lg bg-red-100 border border-red-200 flex items-center justify-between text-[10px] font-bold text-red-800">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-600 animate-bounce" />
                              SLA BREACH ALERT
                            </span>
                            <span className="font-mono text-red-700">INACTIVE</span>
                          </div>
                        )}

                        {/* Student Name & Destination */}
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{studentName}</h4>
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-200 shrink-0">
                            <MapPin className="w-2.5 h-2.5 text-blue-600" />
                            {lead.target_country}
                          </span>
                        </div>

                        {/* Academic Summary */}
                        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-slate-600">
                          {gpa && (
                            <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              <GraduationCap className="w-3 h-3 text-slate-500" />
                              <span>GPA: <strong className="text-slate-800 font-mono">{gpa}</strong></span>
                            </div>
                          )}
                          {ielts && (
                            <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              <Award className="w-3 h-3 text-slate-500" />
                              <span>IELTS: <strong className="text-slate-800 font-mono">{ielts}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Intake & Notes */}
                        {lead.metadata?.target_intake && (
                          <div className="mt-1.5 text-[10px] text-slate-500 font-mono">
                            Target: {lead.metadata.target_intake}
                          </div>
                        )}

                        {lead.notes && (
                          <p className="mt-1.5 text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            &ldquo;{lead.notes}&rdquo;
                          </p>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-3 flex items-center gap-1.5 pt-2.5 border-t border-slate-100">
                          <button
                            onClick={() => setSelectedLeadForContact(lead)}
                            title="Log Call / Contact to resolve stall"
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium transition ${
                              lead.is_stalled
                                ? 'bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>{lead.is_stalled ? 'Log Call (Resolve)' : 'Log Call'}</span>
                          </button>

                          {stage !== 'Admitted' && (
                            <button
                              onClick={() => handleAdvance(lead)}
                              title="Advance to next admission stage"
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 transition flex items-center justify-center"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {stage === 'Admitted' && (
                            <span className="p-1 text-emerald-600" title="Enrolled Successfully">
                              <Sparkles className="w-4 h-4" />
                            </span>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Contact Logging Modal */}
      <InteractionLoggerModal
        lead={selectedLeadForContact}
        onClose={() => setSelectedLeadForContact(null)}
        onLog={onLogContact}
      />
    </div>
  );
}
