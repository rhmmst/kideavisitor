-- =======================================================
-- MIGRATION: Multi-Branch Support for TK Kidea
-- =======================================================

-- 1. Create branches table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_name TEXT UNIQUE NOT NULL,
    admin_phone TEXT,
    admin_email TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Insert initial branches
INSERT INTO public.branches (id, branch_name, admin_phone, admin_email, is_active)
VALUES 
    ('b1000000-0000-0000-0000-000000000001', 'Kidea Cawang', NULL, NULL, true),
    ('b2000000-0000-0000-0000-000000000002', 'Kidea Galaxy', NULL, NULL, true),
    ('b3000000-0000-0000-0000-000000000003', 'Kidea Bekasi Timur', NULL, NULL, true),
    ('b4000000-0000-0000-0000-000000000004', 'Kidea Tangerang Selatan', NULL, NULL, true)
ON CONFLICT (branch_name) DO NOTHING;

-- 3. Add branch_id to visitors table without deleting existing records
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'visitors') THEN
        ALTER TABLE public.visitors 
        ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Set up Row Level Security (RLS)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Authenticated admins have full management access
CREATE POLICY "Admins have full access on branches"
ON public.branches
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Public visitors can only view active branches
CREATE POLICY "Public can view active branches"
ON public.branches
FOR SELECT
TO anon
USING (is_active = true);

-- 5. Public secure view: exposes only active branch IDs and names (no private admin phone/email)
CREATE OR REPLACE VIEW public.public_active_branches AS
SELECT id, branch_name, is_active
FROM public.branches
WHERE is_active = true;

GRANT SELECT ON public.public_active_branches TO anon, authenticated;
