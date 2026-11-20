-- =======================================================
-- MIGRATION: Grant Public Insert Permission on Visitors
-- =======================================================

-- 1. Grant table level INSERT permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.visitors TO anon, authenticated;
GRANT SELECT ON public.visitors TO authenticated;
GRANT UPDATE ON public.visitors TO authenticated;
GRANT DELETE ON public.visitors TO authenticated;

-- 2. Ensure Row Level Security is enabled
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow anon to insert new visitor registration records
DROP POLICY IF EXISTS "Allow anon insert on visitors" ON public.visitors;
CREATE POLICY "Allow anon insert on visitors"
ON public.visitors
FOR INSERT
TO anon
WITH CHECK (true);

-- 4. Policy: Allow authenticated staff full access to visitors
DROP POLICY IF EXISTS "Allow authenticated full access on visitors" ON public.visitors;
CREATE POLICY "Allow authenticated full access on visitors"
ON public.visitors
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Ensure active_branches view is accessible
GRANT SELECT ON public.active_branches TO anon, authenticated;
