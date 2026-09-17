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
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            Instant Auto-Response Delivery Sandbox (Work 2)
          </h3>
          <p className="text-xs text-slate-400">
            Database Webhooks intercept new leads and trigger Supabase Edge Functions in &lt;3s
          </p>
        </div>

        {/* Channel Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveChannel('EMAIL')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
              activeChannel === 'EMAIL'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Resend HTML Email</span>
          </button>

          <button
            onClick={() => setActiveChannel('WHATSAPP')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
              activeChannel === 'WHATSAPP'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
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
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No {activeChannel.toLowerCase()} notifications logged yet. Submit a new lead to trigger dispatches!
          </div>
        ) : (
          filteredLogs.slice(0, 3).map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      log.channel === 'EMAIL'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {log.channel}
                  </span>
                  <span className="text-slate-300 font-medium">To: {log.recipient}</span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{log.status}</span>
                </div>
              </div>

              {log.subject && (
                <div className="font-semibold text-slate-200">
                  Subject: {log.subject}
                </div>
              )}

              <p className="text-slate-400 text-[11px] bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                {log.content_snippet}
              </p>

              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Clock className="w-3 h-3" />
                <span>Dispatched: {new Date(log.sent_at).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
