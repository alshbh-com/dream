
-- 1. Add supervisor to app_role enum (must run separately from usage)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';

-- 2. Role permissions table (role as TEXT to avoid same-tx enum usage)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role TEXT NOT NULL,
  gateway TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role, gateway)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all authenticated can read role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "owner/admin manage role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- 3. Seed defaults
INSERT INTO public.role_permissions (role, gateway) VALUES
  ('owner','dashboard'),('owner','pos'),('owner','wallets'),('owner','treasury'),('owner','inventory'),('owner','customers'),('owner','installments'),('owner','agents'),('owner','expenses'),('owner','users'),
  ('admin','dashboard'),('admin','pos'),('admin','wallets'),('admin','treasury'),('admin','inventory'),('admin','customers'),('admin','installments'),('admin','agents'),('admin','expenses'),('admin','users'),
  ('supervisor','dashboard'),('supervisor','pos'),('supervisor','wallets'),('supervisor','treasury'),('supervisor','inventory'),('supervisor','customers'),('supervisor','installments'),('supervisor','agents'),('supervisor','expenses'),
  ('cashier','dashboard'),('cashier','pos'),('cashier','customers'),('cashier','installments'),
  ('accountant','dashboard'),('accountant','treasury'),('accountant','expenses'),('accountant','wallets'),('accountant','installments'),
  ('agent','dashboard'),('agent','customers'),('agent','installments'),
  ('branch_manager','dashboard'),('branch_manager','pos'),('branch_manager','wallets'),('branch_manager','treasury'),('branch_manager','inventory'),('branch_manager','customers'),('branch_manager','installments'),('branch_manager','agents'),('branch_manager','expenses')
ON CONFLICT DO NOTHING;

-- 4. Helper: gateways a user can access (union of their roles)
CREATE OR REPLACE FUNCTION public.user_gateways(_uid uuid)
RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT rp.gateway
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role::text
  WHERE ur.user_id = _uid
$$;
