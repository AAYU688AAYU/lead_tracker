'use client';

import React from 'react';
import { 
  Compass, 
  Radio, 
  Users, 
  UserCheck, 
  ShieldCheck, 
  Columns, 
  Volume2 
} from 'lucide-react';
import { useAudioAlert } from '@/hooks/useAudioAlert';

interface NavbarProps {
  activeTab: 'split' | 'student' | 'crm' | 'admin';
  setActiveTab: (tab: 'split' | 'student' | 'crm' | 'admin') => void;
  stalledCount: number;
}

export function Navbar({ activeTab, setActiveTab, stalledCount }: NavbarProps) {
  const { playChime } = useAudioAlert();

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Compass className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">GLOBALSTUDY</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                B2B2C CRM
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Educational Placement & Advisory Brokerage</p>
          </div>
        </div>

        {/* Persona Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'split'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split Presentation</span>
          </button>

          <button
            onClick={() => setActiveTab('student')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'student'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Student Portal</span>
          </button>

          <button
            onClick={() => setActiveTab('crm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition relative ${
              activeTab === 'crm'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Consultant CRM</span>
            {stalledCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'admin'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </nav>

        {/* Realtime Status Indicator & Sound Check */}
        <div className="flex items-center gap-3">
          <button
            onClick={playChime}
            title="Test Audio Chime Alert"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-blue-400 transition"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
            <span className="hidden md:inline">REALTIME WAL ACTIVE</span>
            <span className="md:hidden">LIVE</span>
          </div>
        </div>

      </div>
    </header>
  );
}
