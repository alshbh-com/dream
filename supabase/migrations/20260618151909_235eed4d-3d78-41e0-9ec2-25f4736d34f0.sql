-- =========================================================
-- DREAM PHONE ERP — FULL SCHEMA
-- =========================================================

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'cashier', 'accountant', 'agent', 'branch_manager');
CREATE TYPE public.wallet_provider AS ENUM ('vodafone_cash', 'etisalat_cash', 'orange_cash', 'we_pay');
CREATE TYPE public.wallet_tx_type AS ENUM ('withdrawal', 'transfer', 'deposit', 'pos_payment', 'adjustment');
CREATE TYPE public.wallet_tx_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.payment_method AS ENUM ('cash', 'wallet', 'mixed', 'installment');
CREATE TYPE public.imei_status AS ENUM ('available', 'sold', 'returned', 'damaged');
CREATE TYPE public.installment_status AS ENUM ('pending', 'paid', 'overdue', 'partial');

-- =========================================================
-- BRANCHES
-- =========================================================
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  username TEXT UNIQUE,
  branch_id UUID REFERENCES public.branches(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- USER ROLES (separate table — never on profiles)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function — bypasses RLS, prevents recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND role IN ('owner','admin'))
$$;

-- =========================================================
-- WALLETS
-- =========================================================
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  provider public.wallet_provider NOT NULL,
  phone_number TEXT NOT NULL,
  label TEXT,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  daily_withdrawal_limit NUMERIC(14,2) NOT NULL DEFAULT 60000,
  daily_transfer_limit NUMERIC(14,2) NOT NULL DEFAULT 60000,
  daily_deposit_limit NUMERIC(14,2) NOT NULL DEFAULT 60000,
  used_withdrawal_today NUMERIC(14,2) NOT NULL DEFAULT 0,
  used_transfer_today NUMERIC(14,2) NOT NULL DEFAULT 0,
  used_deposit_today NUMERIC(14,2) NOT NULL DEFAULT 0,
  limits_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  tx_type public.wallet_tx_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  commission NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.wallet_tx_status NOT NULL DEFAULT 'approved',
  notes TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  customer_phone TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- CUSTOMERS
-- =========================================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  national_id TEXT,
  address TEXT,
  loyalty_points INT NOT NULL DEFAULT 0,
  total_debt NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_phone ON public.customers(phone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- PRODUCTS + IMEI
-- =========================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  color TEXT,
  storage_size TEXT,
  barcode TEXT UNIQUE,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 2,
  supplier TEXT,
  is_phone BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.product_imeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  imei TEXT NOT NULL UNIQUE,
  serial_number TEXT,
  status public.imei_status NOT NULL DEFAULT 'available',
  purchase_price NUMERIC(12,2),
  sold_at TIMESTAMPTZ,
  sale_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_imeis TO authenticated;
GRANT ALL ON public.product_imeis TO service_role;
ALTER TABLE public.product_imeis ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- SALES (POS)
-- =========================================================
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number SERIAL UNIQUE,
  branch_id UUID REFERENCES public.branches(id),
  customer_id UUID REFERENCES public.customers(id),
  cashier_id UUID REFERENCES auth.users(id),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  profit NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  wallet_id UUID REFERENCES public.wallets(id),
  cash_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  wallet_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  imei_id UUID REFERENCES public.product_imeis(id),
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- AGENTS + INSTALLMENTS
-- =========================================================
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  custody_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  collected_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  sale_id UUID REFERENCES public.sales(id),
  agent_id UUID REFERENCES public.agents(id),
  total_amount NUMERIC(14,2) NOT NULL,
  down_payment NUMERIC(14,2) NOT NULL DEFAULT 0,
  installment_count INT NOT NULL,
  installment_amount NUMERIC(14,2) NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  frequency_days INT NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installment_plans TO authenticated;
GRANT ALL ON public.installment_plans TO service_role;
ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.installment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.installment_plans(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id),
  due_date DATE NOT NULL,
  amount_due NUMERIC(14,2) NOT NULL,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  status public.installment_status NOT NULL DEFAULT 'pending',
  penalty NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installment_payments TO authenticated;
GRANT ALL ON public.installment_payments TO service_role;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- TREASURY (daily closing)
-- =========================================================
CREATE TABLE public.treasury_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  day_date DATE NOT NULL,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_withdrawals NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_transfers NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deposits NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_sales NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_expenses NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_commissions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(14,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, day_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasury_days TO authenticated;
GRANT ALL ON public.treasury_days TO service_role;
ALTER TABLE public.treasury_days ENABLE ROW LEVEL SECURITY;

-- Trigger: prevent edits on closed days
CREATE OR REPLACE FUNCTION public.prevent_closed_day_edit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.is_closed = true AND NEW.is_closed = true THEN
    RAISE EXCEPTION 'لا يمكن تعديل يوم مقفل';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_prevent_closed_day_edit
  BEFORE UPDATE ON public.treasury_days
  FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_day_edit();

-- =========================================================
-- EXPENSES
-- =========================================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- AUDIT LOGS
-- =========================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- updated_at trigger function
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_agents_updated BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- AUTO-CREATE PROFILE ON SIGNUP + first user becomes owner
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cashier');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- branches
CREATE POLICY "auth read branches" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage branches" ON public.branches FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid())) WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- profiles
CREATE POLICY "self read profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin_or_owner(auth.uid()));
CREATE POLICY "self update profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin_or_owner(auth.uid()));
CREATE POLICY "admin insert profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin_or_owner(auth.uid()));
CREATE POLICY "admin delete profile" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- user_roles
CREATE POLICY "auth read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_owner(auth.uid()));

-- wallets
CREATE POLICY "auth read wallets" ON public.wallets FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert wallets" ON public.wallets FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "auth update wallets" ON public.wallets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete wallets" ON public.wallets FOR DELETE TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- wallet_transactions
CREATE POLICY "auth read wallet tx" ON public.wallet_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert wallet tx" ON public.wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "admin update wallet tx" ON public.wallet_transactions FOR UPDATE TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "admin delete wallet tx" ON public.wallet_transactions FOR DELETE TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- customers
CREATE POLICY "auth all customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- products
CREATE POLICY "auth read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage products" ON public.products FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()) OR public.has_role(auth.uid(),'branch_manager'))
  WITH CHECK (public.is_admin_or_owner(auth.uid()) OR public.has_role(auth.uid(),'branch_manager'));

-- product_imeis
CREATE POLICY "auth read imeis" ON public.product_imeis FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage imeis" ON public.product_imeis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sales
CREATE POLICY "auth read sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sales" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (cashier_id = auth.uid());
CREATE POLICY "admin update sales" ON public.sales FOR UPDATE TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "admin delete sales" ON public.sales FOR DELETE TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- sale_items
CREATE POLICY "auth read sale items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sale items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin manage sale items" ON public.sale_items FOR UPDATE TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "admin delete sale items" ON public.sale_items FOR DELETE TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- agents
CREATE POLICY "auth read agents" ON public.agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage agents" ON public.agents FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid())) WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- installment_plans
CREATE POLICY "auth read plans" ON public.installment_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert plans" ON public.installment_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin manage plans" ON public.installment_plans FOR UPDATE TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "admin delete plans" ON public.installment_plans FOR DELETE TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- installment_payments
CREATE POLICY "auth read payments" ON public.installment_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage payments" ON public.installment_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- treasury_days
CREATE POLICY "auth read treasury" ON public.treasury_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "accountant manage treasury" ON public.treasury_days FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()) OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.is_admin_or_owner(auth.uid()) OR public.has_role(auth.uid(),'accountant'));

-- expenses
CREATE POLICY "auth read expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "admin manage expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));
CREATE POLICY "admin delete expenses" ON public.expenses FOR DELETE TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- audit_logs
CREATE POLICY "auth read audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_owner(auth.uid()));
CREATE POLICY "auth insert audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- SEED default branch
-- =========================================================
INSERT INTO public.branches (name, address, phone) VALUES ('الفرع الرئيسي', 'مصر', '01000000000');