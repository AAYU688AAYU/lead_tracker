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
              className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{stage}</h3>
                  {stalledInStage > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-semibold border border-slate-700/50">
                  {stageLeads.length}
                </span>
              </div>

              {/* Column Body */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                {stageLeads.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-600 text-xs border border-dashed border-slate-800 rounded-xl">
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
                        className={`p-3 rounded-xl border transition-all duration-200 ${
                          lead.is_stalled
                            ? 'bg-gradient-to-b from-red-950/50 to-slate-900/90 border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.25)] ring-1 ring-red-500/50'
                            : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/70 hover:border-slate-600 shadow-sm'
                        }`}
                      >
                        {/* Stall Breach Banner */}
                        {lead.is_stalled && (
                          <div className="mb-2 px-2 py-1 rounded bg-red-900/60 border border-red-500/40 flex items-center justify-between text-[10px] font-bold text-red-200">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-400 animate-bounce" />
                              SLA BREACH ALERT
                            </span>
                            <span className="font-mono text-red-300">INACTIVE</span>
                          </div>
                        )}

                        {/* Student Name & Destination */}
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-sm font-semibold text-white truncate">{studentName}</h4>
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-900/80 text-blue-400 font-mono border border-slate-700/60 shrink-0">
                            <MapPin className="w-2.5 h-2.5 text-blue-400" />
                            {lead.target_country}
                          </span>
                        </div>

                        {/* Academic Summary */}
                        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-slate-300">
                          {gpa && (
                            <div className="flex items-center gap-1 bg-slate-900/40 px-1.5 py-0.5 rounded border border-slate-800">
                              <GraduationCap className="w-3 h-3 text-slate-400" />
                              <span>GPA: <strong className="text-white font-mono">{gpa}</strong></span>
                            </div>
                          )}
                          {ielts && (
                            <div className="flex items-center gap-1 bg-slate-900/40 px-1.5 py-0.5 rounded border border-slate-800">
                              <Award className="w-3 h-3 text-slate-400" />
                              <span>IELTS: <strong className="text-white font-mono">{ielts}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Intake & Notes */}
                        {lead.metadata?.target_intake && (
                          <div className="mt-1.5 text-[10px] text-slate-400 font-mono">
                            Target: {lead.metadata.target_intake}
                          </div>
                        )}

                        {lead.notes && (
                          <p className="mt-1.5 text-[11px] text-slate-300 line-clamp-2 italic bg-slate-900/50 p-1.5 rounded border border-slate-800/80">
                            &ldquo;{lead.notes}&rdquo;
                          </p>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-slate-700/50">
                          <button
                            onClick={() => setSelectedLeadForContact(lead)}
                            title="Log Call / Contact to resolve stall"
                            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-medium transition ${
                              lead.is_stalled
                                ? 'bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md shadow-red-500/20'
                                : 'bg-slate-700/60 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>{lead.is_stalled ? 'Log Call (Resolve)' : 'Log Call'}</span>
                          </button>

                          {stage !== 'Admitted' && (
                            <button
                              onClick={() => handleAdvance(lead)}
                              title="Advance to next admission stage"
                              className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition flex items-center justify-center"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {stage === 'Admitted' && (
                            <span className="p-1 text-emerald-400" title="Enrolled Successfully">
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
