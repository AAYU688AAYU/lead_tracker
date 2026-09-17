'use client';

import React, { useState } from 'react';
import { Mail, MessageSquare, CheckCheck, Clock } from 'lucide-react';
import { CommunicationLog } from '@/types/database';

interface SandboxProps {
  logs: CommunicationLog[];
}

export function AutoResponseSandbox({ logs }: SandboxProps) {
  const [activeChannel, setActiveChannel] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');

  const filteredLogs = logs.filter((l) => l.channel === activeChannel);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            Instant Auto-Response Delivery Sandbox (Work 2)
          </h3>
          <p className="text-xs text-slate-500">
            Database Webhooks intercept new leads and trigger Supabase Edge Functions in &lt;3s
          </p>
        </div>

        {/* Channel Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveChannel('EMAIL')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
              activeChannel === 'EMAIL'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Resend HTML Email</span>
          </button>

          <button
            onClick={() => setActiveChannel('WHATSAPP')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
              activeChannel === 'WHATSAPP'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Twilio WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
            No {activeChannel.toLowerCase()} notifications logged yet. Submit a new lead to trigger dispatches!
          </div>
        ) : (
          filteredLogs.slice(0, 3).map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      log.channel === 'EMAIL'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {log.channel}
                  </span>
                  <span className="text-slate-700 font-medium">To: {log.recipient}</span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-mono font-semibold">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{log.status}</span>
                </div>
              </div>

              {log.subject && (
                <div className="font-semibold text-slate-900">
                  Subject: {log.subject}
                </div>
              )}

              <p className="text-slate-700 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 font-mono shadow-sm">
                {log.content_snippet}
              </p>

              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Clock className="w-3 h-3" />
                <span>Dispatched at: {log.sent_at}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
