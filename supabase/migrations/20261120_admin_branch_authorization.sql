-- =======================================================
-- MIGRATION: Admin Role & Branch-Level Authorization
-- =======================================================
-- Admins:
-- 1. Super Admin (All Branches): itsupport@harapanprestasi.sch.id (2fc4ca25-476a-449d-9769-98f2e6f7f9a8)
-- 2. Kidea Cawang: kidea.school@gmail.com (f970825f-31c6-4f51-a00c-0879de391755)
-- 3. Kidea Bekasi Timur: kidea.bekasitimur@gmail.com (f2a2734e-0347-46fb-8bbe-02e625fe0acb)
-- 4. Kidea Galaxy: kideagalaxy.kindergarten@gmail.com (aa7d64f6-82ac-40af-9e35-52c0df728f79)
-- 5. Kidea Tangerang Selatan: kidea.tangsel@gmail.com (d2e34d6c-179e-4704-955f-b5fa05084abf)

-- 1. Add role and branch_id columns to public.admin_users
ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'branch_admin' CHECK (role IN ('super_admin', 'branch_admin'));

ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- 2. Assign roles and branches to the 5 administrator accounts
-- Super Admin: itsupport@harapanprestasi.sch.id
UPDATE public.admin_users
SET role = 'super_admin', branch_id = NULL, is_active = true
WHERE user_id = '2fc4ca25-476a-449d-9769-98f2e6f7f9a8';

-- Kidea Cawang: kidea.school@gmail.com
UPDATE public.admin_users
SET role = 'branch_admin', branch_id = '90bad582-f074-4924-a4c3-3ca62609f663', is_active = true
WHERE user_id = 'f970825f-31c6-4f51-a00c-0879de391755';

-- Kidea Bekasi Timur: kidea.bekasitimur@gmail.com
UPDATE public.admin_users
SET role = 'branch_admin', branch_id = '378ed2bd-e50f-4723-ae80-c36aec82868b', is_active = true
WHERE user_id = 'f2a2734e-0347-46fb-8bbe-02e625fe0acb';

-- Kidea Galaxy: kideagalaxy.kindergarten@gmail.com
UPDATE public.admin_users
SET role = 'branch_admin', branch_id = '06216cb7-2b45-4546-851f-7d8319b9a23f', is_active = true
WHERE user_id = 'aa7d64f6-82ac-40af-9e35-52c0df728f79';

-- Kidea Tangerang Selatan: kidea.tangsel@gmail.com
UPDATE public.admin_users
SET role = 'branch_admin', branch_id = '55bb5bfe-8b6b-4bea-8e45-77b6ee156ca3', is_active = true
WHERE user_id = 'd2e34d6c-179e-4704-955f-b5fa05084abf';

-- 3. Helper functions for RLS evaluation
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
      AND is_active = true
      AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_branch_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT branch_id FROM public.admin_users
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

-- 4. Update Row-Level Security (RLS) on public.visitors for branch isolation
DROP POLICY IF EXISTS "Allow authenticated full access on visitors" ON public.visitors;
DROP POLICY IF EXISTS "Admin branch scoped access on visitors" ON public.visitors;

CREATE POLICY "Admin branch scoped access on visitors"
ON public.visitors
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR branch_id = public.get_admin_branch_id()
)
WITH CHECK (
  public.is_super_admin()
  OR branch_id = public.get_admin_branch_id()
);
