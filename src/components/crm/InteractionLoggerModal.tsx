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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Advisory Interaction Logger
          </span>
          <h2 className="text-lg font-bold text-white mt-1">Log Advisory Session</h2>
          <p className="text-xs text-slate-400">
            For <span className="text-white font-medium">{studentName}</span> ({lead.target_country} • {lead.stage})
          </p>
        </div>

        {lead.is_stalled && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <span>Logging an interaction will instantly resolve the SLA breach and reset the inactivity timer.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Communication Channel</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('PHONE')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition ${
                  channel === 'PHONE'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Phone className="w-4 h-4 mb-1 text-blue-400" />
                <span>Phone Call</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('WHATSAPP')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition ${
                  channel === 'WHATSAPP'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4 mb-1 text-emerald-400" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('MEETING')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition ${
                  channel === 'MEETING'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4 mb-1 text-purple-400" />
                <span>Meeting</span>
              </button>
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Consultation Notes & Guidance Given</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="Record points discussed, student queries, and next milestones..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Record & Resolve SLA</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
