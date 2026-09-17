'use client';

import { Lead, AdmissionStage, CommunicationLog, Reminder } from '@/types/database';

export const INITIAL_LEADS: Lead[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    student_id: '00000000-0000-0000-0000-000000000010',
    assigned_consultant_id: '00000000-0000-0000-0000-000000000002',
    target_country: 'Canada',
    stage: 'Inquiry',
    is_stalled: false,
    reminder_status: 'NONE',
    notes: 'Interested in AI Co-op work permits.',
    metadata: {
      student_name: 'Aryan Verma',
      email: 'aryan.verma@example.com',
      phone: '+91 98765 43210',
      gpa: '3.85',
      ielts_overall: '7.5',
      target_intake: 'Fall 2027',
    },
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    last_contacted_at: null,
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    student_id: '00000000-0000-0000-0000-000000000011',
    assigned_consultant_id: '00000000-0000-0000-0000-000000000002',
    target_country: 'Germany',
    stage: 'Counseling',
    is_stalled: true,
    reminder_status: 'PENDING',
    notes: 'Student evaluating DAAD scholarship eligibility.',
    metadata: {
      student_name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      phone: '+49 151 23456789',
      gpa: '3.92',
      ielts_overall: '8.0',
      target_intake: 'Winter 2027',
    },
    created_at: new Date(Date.now() - 80 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 74 * 3600 * 1000).toISOString(),
    last_contacted_at: new Date(Date.now() - 74 * 3600 * 1000).toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    student_id: '00000000-0000-0000-0000-000000000012',
    assigned_consultant_id: '00000000-0000-0000-0000-000000000002',
    target_country: 'Australia',
    stage: 'Document Collection',
    is_stalled: false,
    reminder_status: 'NONE',
    notes: 'Waiting for official transcript notarization.',
    metadata: {
      student_name: 'Kwame Mensah',
      email: 'kwame.mensah@example.com',
      phone: '+233 24 123 4567',
      gpa: '3.60',
      ielts_overall: '7.0',
      target_intake: 'Spring 2027',
    },
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    last_contacted_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000004',
    student_id: '00000000-0000-0000-0000-000000000013',
    assigned_consultant_id: '00000000-0000-0000-0000-000000000002',
    target_country: 'United Kingdom',
    stage: 'Application',
    is_stalled: false,
    reminder_status: 'NONE',
    notes: 'Submitted to Oxford admissions committee.',
    metadata: {
      student_name: 'Mei Ling Chen',
      email: 'mei.ling@example.com',
      phone: '+65 9123 4567',
      gpa: '3.98',
      ielts_overall: '8.5',
      target_intake: 'Fall 2027',
    },
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    last_contacted_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000005',
    student_id: '00000000-0000-0000-0000-000000000014',
    assigned_consultant_id: '00000000-0000-0000-0000-000000000002',
    target_country: 'Canada',
    stage: 'Fee/Verification',
    is_stalled: false,
    reminder_status: 'NONE',
    notes: 'Conditional offer received. Tuition deposit pending.',
    metadata: {
      student_name: 'Santiago Morales',
      email: 'santiago.morales@example.com',
      phone: '+52 55 1234 5678',
      gpa: '3.75',
      ielts_overall: '7.5',
      target_intake: 'Fall 2027',
    },
    created_at: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    last_contacted_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000006',
    student_id: '00000000-0000-0000-0000-000000000015',
    assigned_consultant_id: '00000000-0000-0000-0000-000000000002',
    target_country: 'Singapore',
    stage: 'Admitted',
    is_stalled: false,
    reminder_status: 'NONE',
    notes: 'Student visa granted! Enrollment finalized.',
    metadata: {
      student_name: 'Fatima Zahra',
      email: 'fatima.zahra@example.com',
      phone: '+971 50 123 4567',
      gpa: '3.90',
      ielts_overall: '8.0',
      target_intake: 'Fall 2026',
    },
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    last_contacted_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

export const STAGE_THRESHOLDS: Record<AdmissionStage, number> = {
  Inquiry: 24,
  Counseling: 48,
  'Document Collection': 72,
  Application: 48,
  'Fee/Verification': 24,
  Admitted: 999999,
};

type Listener = () => void;

class PlacementStore {
  private leads: Lead[] = INITIAL_LEADS;
  private commLogs: CommunicationLog[] = [
    {
      id: 'log-1',
      lead_id: '30000000-0000-0000-0000-000000000001',
      channel: 'EMAIL',
      recipient: 'aryan.verma@example.com',
      subject: 'Application Dossier Received – Welcome to Agency Broker, Aryan Verma',
      content_snippet: 'Welcome dossier dispatched for destination: Canada',
      status: 'DELIVERED',
      sent_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    },
    {
      id: 'log-2',
      lead_id: '30000000-0000-0000-0000-000000000001',
      channel: 'WHATSAPP',
      recipient: '+91 98765 43210',
      subject: 'WhatsApp Immediate Acknowledgement',
      content_snippet: 'Application Reference confirmed for Canada.',
      status: 'DELIVERED',
      sent_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    },
  ];
  private reminders: Reminder[] = [
    {
      id: '40000000-0000-0000-0000-000000000001',
      lead_id: '30000000-0000-0000-0000-000000000002',
      consultant_id: '00000000-0000-0000-0000-000000000002',
      stage_at_stall: 'Counseling',
      hours_inactive: 74.0,
      message: 'SLA Breach: Elena Rostova has been inactive in Counseling for 74.0 hours.',
      is_resolved: false,
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
  ];
  private listeners: Set<Listener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('placement_crm_leads');
      if (stored) {
        try {
          this.leads = JSON.parse(stored);
        } catch {
          // fallback to initial
        }
      }
    }
  }

  private persist() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('placement_crm_leads', JSON.stringify(this.leads));
    }
    this.notify();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  getLeads(): Lead[] {
    return [...this.leads];
  }

  getCommLogs(): CommunicationLog[] {
    return [...this.commLogs];
  }

  getReminders(): Reminder[] {
    return [...this.reminders];
  }

  addLead(leadData: Partial<Lead>): Lead {
    const newLead: Lead = {
      id: 'lead-' + Math.random().toString(36).substring(2, 9),
      student_id: 'student-' + Math.random().toString(36).substring(2, 7),
      assigned_consultant_id: '00000000-0000-0000-0000-000000000002',
      target_country: leadData.target_country || 'United Kingdom',
      stage: 'Inquiry',
      is_stalled: false,
      reminder_status: 'NONE',
      notes: leadData.notes || '',
      metadata: leadData.metadata || {
        student_name: 'Prospective Student',
        email: 'student@example.com',
        phone: '+1 555 123 4567',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_contacted_at: null,
    };

    this.leads = [newLead, ...this.leads];

    // Trigger instant mock auto-response logs
    const studentName = newLead.metadata?.student_name || 'Applicant';
    const email = newLead.metadata?.email || 'applicant@example.com';
    const phone = newLead.metadata?.phone || '+1 555 000 0000';

    this.commLogs.unshift({
      id: 'log-' + Math.random().toString(36).substring(2, 7),
      lead_id: newLead.id,
      channel: 'EMAIL',
      recipient: email,
      subject: `Application Dossier Received – Welcome, ${studentName}`,
      content_snippet: `Welcome dossier dispatched for destination: ${newLead.target_country}`,
      status: 'DELIVERED',
      sent_at: new Date().toISOString(),
    });

    this.commLogs.unshift({
      id: 'log-' + Math.random().toString(36).substring(2, 7),
      lead_id: newLead.id,
      channel: 'WHATSAPP',
      recipient: phone,
      subject: 'WhatsApp Immediate Acknowledgement',
      content_snippet: `Application Reference #${newLead.id.substring(0, 8)} confirmed for ${newLead.target_country}.`,
      status: 'DELIVERED',
      sent_at: new Date().toISOString(),
    });

    this.persist();
    return newLead;
  }

  updateStage(leadId: string, newStage: AdmissionStage): boolean {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) return false;

    lead.stage = newStage;
    lead.updated_at = new Date().toISOString();
    this.persist();
    return true;
  }

  ageLead(leadId: string, daysAgo: number = 3): boolean {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) return false;

    const agedTime = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
    lead.updated_at = agedTime;
    lead.last_contacted_at = agedTime;
    this.persist();
    return true;
  }

  evaluateStalls(): { breachedCount: number } {
    const now = Date.now();
    let count = 0;

    this.leads.forEach((lead) => {
      if (lead.stage === 'Admitted') return;

      const refTime = new Date(lead.last_contacted_at || lead.updated_at).getTime();
      const diffHours = (now - refTime) / (3600 * 1000);
      const threshold = STAGE_THRESHOLDS[lead.stage] || 48;

      if (diffHours >= threshold) {
        lead.is_stalled = true;
        lead.reminder_status = 'PENDING';
        count++;

        if (!this.reminders.some((r) => r.lead_id === lead.id && !r.is_resolved)) {
          this.reminders.unshift({
            id: 'rem-' + Math.random().toString(36).substring(2, 7),
            lead_id: lead.id,
            consultant_id: lead.assigned_consultant_id || '00000000-0000-0000-0000-000000000002',
            stage_at_stall: lead.stage,
            hours_inactive: Math.round(diffHours * 10) / 10,
            message: `SLA Breach: ${lead.metadata?.student_name || 'Student'} has been inactive in ${lead.stage} for ${Math.round(diffHours)} hours.`,
            is_resolved: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    });

    this.persist();
    return { breachedCount: count };
  }

  logContact(leadId: string, channel: 'PHONE' | 'WHATSAPP' | 'MEETING', notes: string): boolean {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) return false;

    const nowIso = new Date().toISOString();
    lead.last_contacted_at = nowIso;
    lead.is_stalled = false;
    lead.reminder_status = 'RESOLVED';
    lead.notes = notes;
    lead.updated_at = nowIso;

    this.reminders.forEach((r) => {
      if (r.lead_id === leadId && !r.is_resolved) {
        r.is_resolved = true;
        r.resolved_at = nowIso;
      }
    });

    this.persist();
    return true;
  }

  seedRealisticLeads(): void {
    this.leads = [...INITIAL_LEADS];
    this.persist();
  }
}

export const mockStore = new PlacementStore();
