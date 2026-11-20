-- =======================================================
-- MIGRATION: Email Notifications Tracking for TK Kidea
-- =======================================================

-- 1. Add email status tracking columns to visitors table
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'visitors') THEN
        -- Admin email status
        ALTER TABLE public.visitors 
        ADD COLUMN IF NOT EXISTS admin_email_status TEXT DEFAULT 'pending';

        -- Visitor email status
        ALTER TABLE public.visitors 
        ADD COLUMN IF NOT EXISTS visitor_email_status TEXT DEFAULT 'pending';

        -- Timestamps of successful email delivery
        ALTER TABLE public.visitors 
        ADD COLUMN IF NOT EXISTS admin_email_sent_at TIMESTAMPTZ;

        ALTER TABLE public.visitors 
        ADD COLUMN IF NOT EXISTS visitor_email_sent_at TIMESTAMPTZ;

        -- Detailed error message if sending failed
        ALTER TABLE public.visitors 
        ADD COLUMN IF NOT EXISTS email_error TEXT;

        -- Apply status constraints
        ALTER TABLE public.visitors 
        DROP CONSTRAINT IF EXISTS visitors_admin_email_status_check;
        ALTER TABLE public.visitors 
        ADD CONSTRAINT visitors_admin_email_status_check 
        CHECK (admin_email_status IN ('pending', 'sent', 'failed', 'skipped'));

        ALTER TABLE public.visitors 
        DROP CONSTRAINT IF EXISTS visitors_visitor_email_status_check;
        ALTER TABLE public.visitors 
        ADD CONSTRAINT visitors_visitor_email_status_check 
        CHECK (visitor_email_status IN ('pending', 'sent', 'failed', 'skipped'));

        -- Set status for existing records where visitor email is absent
        UPDATE public.visitors
        SET visitor_email_status = 'skipped'
        WHERE email IS NULL OR trim(email) = '';
    END IF;
END $$;
