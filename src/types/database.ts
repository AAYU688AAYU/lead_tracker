export type UserRole = 'student' | 'consultant' | 'super_admin';

export type AdmissionStage = 
  | 'Inquiry'
  | 'Counseling'
  | 'Document Collection'
  | 'Application'
  | 'Fee/Verification'
  | 'Admitted';

export type DocType = 'TRANSCRIPT' | 'IELTS_SCORECARD' | 'PASSPORT' | 'STATEMENT_OF_PURPOSE' | 'RESUME';
export type DocStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type CommChannel = 'EMAIL' | 'WHATSAPP' | 'SMS';
export type CommStatus = 'QUEUED' | 'DELIVERED' | 'FAILED' | 'READ';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  branch_location?: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface University {
  id: string;
  name: string;
  country: string;
  city: string;
  ranking_global?: number;
  partnership_tier: string;
  is_active: boolean;
}

export interface Program {
  id: string;
  university_id: string;
  program_name: string;
  degree_level: string;
  annual_tuition_usd: number;
  intake_seasons: string[];
}

export interface LeadMetadata {
  student_name?: string;
  email?: string;
  phone?: string;
  gpa?: string | null;
  ielts_overall?: string | null;
  target_intake?: string;
  budget_range_usd?: string;
  [key: string]: unknown;
}

export interface Lead {
  id: string;
  student_id: string;
  assigned_consultant_id?: string | null;
  program_id?: string | null;
  target_country: string;
  stage: AdmissionStage;
  is_stalled: boolean;
  reminder_status: 'NONE' | 'PENDING' | 'RESOLVED';
  notes?: string | null;
  metadata?: LeadMetadata;
  last_contacted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  lead_id: string;
  document_type: DocType;
  file_name: string;
  storage_path: string;
  file_size_bytes: number;
  mime_type: string;
  verification_status: DocStatus;
  review_notes?: string | null;
  uploaded_at: string;
}

export interface ActivityLog {
  id: string;
  lead_id: string;
  actor_id?: string | null;
  action_type: string;
  details: string;
  change_payload?: Record<string, unknown>;
  created_at: string;
}

export interface CommunicationLog {
  id: string;
  lead_id: string;
  channel: CommChannel;
  recipient: string;
  subject?: string | null;
  content_snippet: string;
  external_message_id?: string | null;
  status: CommStatus;
  sent_at: string;
}

export interface Reminder {
  id: string;
  lead_id: string;
  consultant_id: string;
  stage_at_stall: AdmissionStage;
  hours_inactive: number;
  message: string;
  is_resolved: boolean;
  created_at: string;
  resolved_at?: string | null;
}

export interface StageThresholdConfig {
  stage: AdmissionStage;
  threshold_hours: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NONE';
}
