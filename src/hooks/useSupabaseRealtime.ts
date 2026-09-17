'use client';

import { useEffect, useState } from 'react';
import { Lead } from '@/types/database';
import { mockStore } from '@/services/mockStore';
import { useAudioAlert } from './useAudioAlert';

interface RealtimeConfig {
  consultantId?: string;
  onLeadInsert?: (lead: Lead) => void;
  onLeadUpdate?: (lead: Lead) => void;
  onStallBreach?: (lead: Lead) => void;
}

export function useSupabaseRealtime(config?: RealtimeConfig) {
  const [leads, setLeads] = useState<Lead[]>(() => mockStore.getLeads());
  const [isConnected, setIsConnected] = useState(true);
  const { playChime } = useAudioAlert();

  useEffect(() => {
    // Initial sync
    setLeads(mockStore.getLeads());

    // Subscribe to updates
    const unsubscribe = mockStore.subscribe(() => {
      const updated = mockStore.getLeads();
      setLeads(updated);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const addLead = (leadData: Partial<Lead>) => {
    const newLead = mockStore.addLead(leadData);
    playChime();
    config?.onLeadInsert?.(newLead);
    return newLead;
  };

  const updateStage = (leadId: string, newStage: Lead['stage']) => {
    mockStore.updateStage(leadId, newStage);
  };

  const ageLead = (leadId: string, daysAgo: number = 3) => {
    return mockStore.ageLead(leadId, daysAgo);
  };

  const triggerStallCheck = () => {
    const result = mockStore.evaluateStalls();
    if (result.breachedCount > 0) {
      playChime();
    }
    return result;
  };

  const logContact = (leadId: string, channel: 'PHONE' | 'WHATSAPP' | 'MEETING', notes: string) => {
    return mockStore.logContact(leadId, channel, notes);
  };

  const seedLeads = () => {
    mockStore.seedRealisticLeads();
  };

  return {
    leads,
    isConnected,
    addLead,
    updateStage,
    ageLead,
    triggerStallCheck,
    logContact,
    seedLeads,
    commLogs: mockStore.getCommLogs(),
    reminders: mockStore.getReminders(),
  };
}
