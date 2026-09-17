'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, Globe, GraduationCap, Award, BookOpen } from 'lucide-react';
import { Lead } from '@/types/database';

interface StudentFormProps {
  onSubmitLead: (leadData: Partial<Lead>) => Lead;
}

const COUNTRIES = [
  'Canada',
  'United Kingdom',
  'Australia',
  'Germany',
  'United States',
  'Singapore',
  'Ireland',
];

const PROGRAMS = [
  'MSc Applied Computing & Artificial Intelligence',
  'Master of Data Science & Big Data Analytics',
  'MBA in Global Strategy & Tech Leadership',
  'BSc Robotics, Mechatronics & Embedded Systems',
  'Master of Public Health & Epidemiology',
  'BEng Software Engineering & Cloud Infrastructure',
];

export function StudentForm({ onSubmitLead }: StudentFormProps) {
  const [formData, setFormData] = useState({
    name: 'Aryan Verma',
    email: 'aryan.verma@example.com',
    phone: '+1 (555) 382-9912',
    target_country: 'Canada',
    target_program: 'MSc Applied Computing & Artificial Intelligence',
    gpa: '3.85',
    ielts_overall: '7.5',
    target_intake: 'Fall 2027',
    notes: 'Seeking scholarship eligibility and post-study work visa opportunities.',
  });

  const [submittedLead, setSubmittedLead] = useState<Lead | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const created = onSubmitLead({
      target_country: formData.target_country,
      notes: formData.notes,
      metadata: {
        student_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        target_program: formData.target_program,
        gpa: formData.gpa,
        ielts_overall: formData.ielts_overall,
        target_intake: formData.target_intake,
      },
    });

    setSubmittedLead(created);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Role 1: Prospective Student
          </span>
          <span className="text-xs text-slate-500">• B2C Client Portal</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">International Admission Application</h2>
        <p className="text-xs text-slate-400 mt-1">
          Submit your candidate dossier. Direct PostgreSQL ingestion will immediately notify your designated advisor.
        </p>
      </div>

      {submittedLead ? (
        <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-6 text-center space-y-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Application Dossier Successfully Submitted!</h3>
            <p className="text-xs text-slate-300 mt-1">
              Your placement profile has been registered with reference ID:
            </p>
            <div className="mt-2 font-mono text-xs font-bold text-emerald-300 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 inline-block">
              {submittedLead.id}
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-left text-xs space-y-1.5 text-slate-300">
            <div className="flex items-center gap-2 text-blue-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span>Instant Edge Function Auto-Response Triggered:</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              • <strong>Resend HTML Email</strong> sent to {submittedLead.metadata?.email}
            </p>
            <p className="text-slate-400 text-[11px]">
              • <strong>Twilio WhatsApp Alert</strong> sent to {submittedLead.metadata?.phone}
            </p>
            <p className="text-slate-400 text-[11px]">
              • <strong>Supabase Realtime</strong> streamed this record to the consultant&apos;s Kanban in &lt;100ms.
            </p>
          </div>

          <button
            onClick={() => setSubmittedLead(null)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            Submit Another Application
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Personal Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp Phone Number</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Destination & Academic Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Target Destination Country
              </label>
              <select
                value={formData.target_country}
                onChange={(e) => setFormData({ ...formData, target_country: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Target Degree Program
              </label>
              <select
                value={formData.target_program}
                onChange={(e) => setFormData({ ...formData, target_program: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
              >
                {PROGRAMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Academic Scores Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                Undergraduate GPA
              </label>
              <input
                type="text"
                placeholder="e.g. 3.85 / 4.0"
                value={formData.gpa}
                onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                IELTS / TOEFL Score
              </label>
              <input
                type="text"
                placeholder="e.g. IELTS 7.5"
                value={formData.ielts_overall}
                onChange={(e) => setFormData({ ...formData, ielts_overall: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Intake Season</label>
              <input
                type="text"
                value={formData.target_intake}
                onChange={(e) => setFormData({ ...formData, target_intake: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Specific Queries & Preferences</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              placeholder="Campus housing preferences, scholarship aspirations, etc."
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition"
          >
            <Send className="w-4 h-4" />
            <span>Submit Application & Broadcast to Advisor</span>
          </button>

        </form>
      )}

    </div>
  );
}
