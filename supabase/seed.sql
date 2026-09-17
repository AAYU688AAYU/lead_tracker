-- ==============================================================================
-- COMPREHENSIVE SEED DATA: B2B2C EDUCATIONAL PLACEMENT AGENCY CRM
-- ==============================================================================

-- 1. Profiles (Super Admin, Consultants, Students)
INSERT INTO public.profiles (id, email, full_name, role, phone, branch_location) VALUES
('00000000-0000-0000-0000-000000000001', 'director@agencybroker.com', 'Dr. Alistair Finch', 'super_admin', '+44 20 7946 0911', 'London HQ'),
('00000000-0000-0000-0000-000000000002', 'priya.sharma@agencybroker.com', 'Counselor Priya Sharma', 'consultant', '+91 98112 34567', 'New Delhi Branch'),
('00000000-0000-0000-0000-000000000003', 'marcus.vance@agencybroker.com', 'Counselor Marcus Vance', 'consultant', '+1 416 555 0199', 'Toronto Branch'),
('00000000-0000-0000-0000-000000000010', 'aryan.verma@example.com', 'Aryan Verma', 'student', '+91 98765 43210', 'Global Online'),
('00000000-0000-0000-0000-000000000011', 'elena.rostova@example.com', 'Elena Rostova', 'student', '+49 151 23456789', 'Global Online'),
('00000000-0000-0000-0000-000000000012', 'kwame.mensah@example.com', 'Kwame Mensah', 'student', '+233 24 123 4567', 'Global Online'),
('00000000-0000-0000-0000-000000000013', 'mei.ling@example.com', 'Mei Ling Chen', 'student', '+65 9123 4567', 'Global Online'),
('00000000-0000-0000-0000-000000000014', 'santiago.morales@example.com', 'Santiago Morales', 'student', '+52 55 1234 5678', 'Global Online'),
('00000000-0000-0000-0000-000000000015', 'fatima.zahra@example.com', 'Fatima Zahra', 'student', '+971 50 123 4567', 'Global Online')
ON CONFLICT (id) DO NOTHING;

-- 2. Partner Universities
INSERT INTO public.universities (id, name, country, city, ranking_global, partnership_tier) VALUES
('10000000-0000-0000-0000-000000000001', 'University of Toronto', 'Canada', 'Toronto', 21, 'Direct Agreement'),
('10000000-0000-0000-0000-000000000002', 'University of Oxford', 'United Kingdom', 'Oxford', 1, 'Preferred'),
('10000000-0000-0000-0000-000000000003', 'University of Melbourne', 'Australia', 'Melbourne', 14, 'Direct Agreement'),
('10000000-0000-0000-0000-000000000004', 'Technical University of Munich', 'Germany', 'Munich', 37, 'Preferred'),
('10000000-0000-0000-0000-000000000005', 'National University of Singapore', 'Singapore', 'Singapore', 8, 'Standard')
ON CONFLICT (id) DO NOTHING;

-- 3. Academic Programs
INSERT INTO public.programs (id, university_id, program_name, degree_level, annual_tuition_usd) VALUES
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'MSc Applied Computing (AI Specialization)', 'MSc', 42000.00),
('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'MBA International Business Strategy', 'MBA', 78000.00),
('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Master of Data Science & Analytics', 'MSc', 36000.00),
('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'BSc Robotics & Embedded Systems', 'BSc', 1500.00),
('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'Master of Public Health & Global Health', 'MSc', 32000.00)
ON CONFLICT (id) DO NOTHING;

-- 4. Sample Leads across all 6 Stages
INSERT INTO public.leads (
    id, student_id, assigned_consultant_id, program_id, target_country, stage, is_stalled, reminder_status, notes, metadata, last_contacted_at, created_at, updated_at
) VALUES
-- Stage 1: Inquiry
('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Canada', 'Inquiry', false, 'NONE', 'Interested in AI Co-op work permits.', '{"student_name": "Aryan Verma", "gpa": "3.85", "ielts_overall": "7.5", "target_intake": "Fall 2027"}'::jsonb, null, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),

-- Stage 2: Counseling (Simulated Stalled Lead)
('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'Germany', 'Counseling', true, 'PENDING', 'Student considering DAAD scholarship eligibility.', '{"student_name": "Elena Rostova", "gpa": "3.92", "ielts_overall": "8.0", "target_intake": "Winter 2027"}'::jsonb, NOW() - INTERVAL '74 hours', NOW() - INTERVAL '80 hours', NOW() - INTERVAL '74 hours'),

-- Stage 3: Document Collection
('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'Australia', 'Document Collection', false, 'NONE', 'Awaiting verified degree certificate from university registrar.', '{"student_name": "Kwame Mensah", "gpa": "3.60", "ielts_overall": "7.0", "target_intake": "Spring 2027"}'::jsonb, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '5 days', NOW() - INTERVAL '12 hours'),

-- Stage 4: Application
('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'United Kingdom', 'Application', false, 'NONE', 'Application dossier submitted to Oxford admissions committee.', '{"student_name": "Mei Ling Chen", "gpa": "3.98", "ielts_overall": "8.5", "target_intake": "Fall 2027"}'::jsonb, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 hours'),

-- Stage 5: Fee/Verification
('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Canada', 'Fee/Verification', false, 'NONE', 'Conditional offer letter received. Wire transfer verification in progress.', '{"student_name": "Santiago Morales", "gpa": "3.75", "ielts_overall": "7.5", "target_intake": "Fall 2027"}'::jsonb, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '18 days', NOW() - INTERVAL '6 hours'),

-- Stage 6: Admitted
('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005', 'Singapore', 'Admitted', false, 'NONE', 'Student visa approved! Tuition deposit confirmed.', '{"student_name": "Fatima Zahra", "gpa": "3.90", "ielts_overall": "8.0", "target_intake": "Fall 2026"}'::jsonb, NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- 5. Active Stall Reminder for Elena Rostova
INSERT INTO public.reminders (
    id, lead_id, consultant_id, stage_at_stall, hours_inactive, message, is_resolved, created_at
) VALUES (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'Counseling',
    74.0,
    'SLA Breach: Elena Rostova has been inactive in Counseling for 74.0 hours. Urgent advisory contact required.',
    false,
    NOW() - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;
