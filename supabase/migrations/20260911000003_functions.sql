-- ==============================================================================
-- DATABASE TRIGGERS, STORED PROCEDURES & PROCEDURAL FUNCTIONS
-- ==============================================================================

-- 1. Automatic Timestamp & Stage Transition Audit Trigger
CREATE OR REPLACE FUNCTION public.fn_audit_lead_changes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    
    -- Detect stage change and record audit log
    IF (OLD.stage IS DISTINCT FROM NEW.stage) THEN
        INSERT INTO public.activity_logs (
            lead_id, 
            actor_id, 
            action_type, 
            details,
            change_payload
        ) VALUES (
            NEW.id,
            auth.uid(),
            'STAGE_TRANSITION',
            FORMAT('Stage moved from %s to %s', OLD.stage, NEW.stage),
            jsonb_build_object('old_stage', OLD.stage, 'new_stage', NEW.stage)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_lead_changes ON public.leads;
CREATE TRIGGER tr_audit_lead_changes
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_audit_lead_changes();

-- 2. Stored Procedure: Inactivity & Stall Evaluator
CREATE OR REPLACE FUNCTION public.fn_detect_stalled_leads()
RETURNS void AS $$
DECLARE
    r RECORD;
    v_threshold INTEGER;
    v_hours_inactive NUMERIC;
    v_now TIMESTAMPTZ := TIMEZONE('utc', NOW());
BEGIN
    FOR r IN 
        SELECT l.id, l.student_id, l.assigned_consultant_id, l.stage,
               p.full_name AS student_name,
               COALESCE(l.last_contacted_at, l.updated_at) AS reference_time
        FROM public.leads l
        JOIN public.profiles p ON l.student_id = p.id
        WHERE l.stage != 'Admitted' AND l.is_stalled = FALSE
    LOOP
        SELECT threshold_hours INTO v_threshold
        FROM public.stage_threshold_configs
        WHERE stage = r.stage;

        IF v_threshold IS NOT NULL THEN
            v_hours_inactive := ROUND(EXTRACT(EPOCH FROM (v_now - r.reference_time)) / 3600.0, 1);

            IF v_hours_inactive >= v_threshold THEN
                -- Mark lead as stalled
                UPDATE public.leads 
                SET is_stalled = TRUE, 
                    reminder_status = 'PENDING',
                    updated_at = v_now
                WHERE id = r.id;

                -- Insert reminder if unresolved one doesn't exist
                IF NOT EXISTS (
                    SELECT 1 FROM public.reminders 
                    WHERE lead_id = r.id AND stage_at_stall = r.stage AND is_resolved = FALSE
                ) THEN
                    INSERT INTO public.reminders (
                        lead_id,
                        consultant_id,
                        stage_at_stall,
                        hours_inactive,
                        message
                    ) VALUES (
                        r.id,
                        r.assigned_consultant_id,
                        r.stage,
                        v_hours_inactive,
                        FORMAT('SLA Breach: %s has been inactive in %s for %s hours. Urgent advisory contact required.', 
                               r.student_name, r.stage, v_hours_inactive)
                    );

                    INSERT INTO public.activity_logs (
                        lead_id,
                        actor_id,
                        action_type,
                        details
                    ) VALUES (
                        r.id,
                        NULL,
                        'STALL_TRIGGERED',
                        FORMAT('Automated SLA breach detected: %s hrs inactive in %s', v_hours_inactive, r.stage)
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Stored Procedure: Counselor Log Interaction & Clear Stall
CREATE OR REPLACE FUNCTION public.fn_log_interaction(
    p_lead_id UUID,
    p_channel comm_channel,
    p_notes TEXT
)
RETURNS void AS $$
DECLARE
    v_now TIMESTAMPTZ := TIMEZONE('utc', NOW());
BEGIN
    -- Update lead contact timestamp and clear stall
    UPDATE public.leads
    SET last_contacted_at = v_now,
        is_stalled = FALSE,
        reminder_status = 'RESOLVED',
        updated_at = v_now
    WHERE id = p_lead_id;

    -- Resolve pending reminders
    UPDATE public.reminders
    SET is_resolved = TRUE,
        resolved_at = v_now
    WHERE lead_id = p_lead_id AND is_resolved = FALSE;

    -- Record in activity log
    INSERT INTO public.activity_logs (
        lead_id,
        actor_id,
        action_type,
        details
    ) VALUES (
        p_lead_id,
        auth.uid(),
        'CONTACT_RECORDED',
        FORMAT('Interaction via %s logged: %s', p_channel, p_notes)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable Supabase Realtime Publication for WAL streaming
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;
