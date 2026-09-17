'use client';

import React, { useState } from 'react';
import { Phone, MessageSquare, Users, X, CheckCircle2 } from 'lucide-react';
import { Lead } from '@/types/database';

interface InteractionModalProps {
  lead: Lead | null;
  onClose: () => void;
  onLog: (leadId: string, channel: 'PHONE' | 'WHATSAPP' | 'MEETING', notes: string) => void;
}

export function InteractionLoggerModal({ lead, onClose, onLog }: InteractionModalProps) {
  const [channel, setChannel] = useState<'PHONE' | 'WHATSAPP' | 'MEETING'>('PHONE');
  const [notes, setNotes] = useState('Completed advisory review. Clarified tuition fee structure and intake deadlines.');

  if (!lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLog(lead.id, channel, notes);
    onClose();
  };

  const studentName = lead.metadata?.student_name || 'Student Candidate';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
            Advisory Interaction Logger
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1.5">Log Advisory Session</h2>
          <p className="text-xs text-slate-500">
            For <span className="text-slate-900 font-semibold">{studentName}</span> ({lead.target_country} • {lead.stage})
          </p>
        </div>

        {lead.is_stalled && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
            <span>Logging an interaction will instantly resolve the SLA breach and reset the inactivity timer.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Communication Channel</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('PHONE')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition ${
                  channel === 'PHONE'
                    ? 'bg-blue-50 border-blue-600 text-blue-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Phone className="w-4 h-4 mb-1 text-blue-600" />
                <span>Phone Call</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('WHATSAPP')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition ${
                  channel === 'WHATSAPP'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4 mb-1 text-emerald-600" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('MEETING')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition ${
                  channel === 'MEETING'
                    ? 'bg-purple-50 border-purple-600 text-purple-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4 mb-1 text-purple-600" />
                <span>Meeting</span>
              </button>
            </div>
          </div>

          {/* Notes Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Consultation Notes & Outcomes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              placeholder="Detail candidate feedback, university preferences, or document follow-ups..."
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save &amp; Resolve Stall</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
