-- ==============================================================================
-- PG_CRON SCHEDULE FOR INACTIVITY STALL EVALUATION
-- ==============================================================================

-- Schedule the stall detector to run every 1 minute
SELECT cron.schedule(
    'evaluate-stalled-leads-every-minute',
    '* * * * *',
    'SELECT public.fn_detect_stalled_leads();'
);
