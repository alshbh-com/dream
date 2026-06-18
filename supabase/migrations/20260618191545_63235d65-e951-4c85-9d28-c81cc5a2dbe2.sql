
-- 1) RLS policies for user_roles (admin/owner can manage)
CREATE POLICY "admin manage user_roles insert" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "admin manage user_roles delete" ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "admin manage user_roles update" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.is_admin_or_owner(auth.uid()));

-- 2) Add profit column to wallets
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS profit numeric NOT NULL DEFAULT 0;

-- 3) Backfill profit from existing wallet_transactions commissions
UPDATE public.wallets w
SET profit = COALESCE((
  SELECT SUM(commission) FROM public.wallet_transactions
  WHERE wallet_id = w.id AND status = 'approved'
), 0);
