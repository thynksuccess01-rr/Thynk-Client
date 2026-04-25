-- ============================================================
-- THYNK CMS — SUPABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── CLIENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  logo_url        TEXT,
  primary_color   TEXT NOT NULL DEFAULT '#2C1A0F',
  accent_color    TEXT NOT NULL DEFAULT '#A86035',
  font_family     TEXT NOT NULL DEFAULT 'DM Sans',
  industry        TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PROFILES (extends auth.users) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PRODUCTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CLIENT ↔ PRODUCT MAPPING ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, product_id)
);

-- ── DATA ENTRIES (campaigns per period) ────────────────────
CREATE TABLE IF NOT EXISTS public.data_entries (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  -- Email
  email_summary       TEXT,
  email_sent          INT NOT NULL DEFAULT 0,
  email_opened        INT NOT NULL DEFAULT 0,
  email_clicked       INT NOT NULL DEFAULT 0,
  -- WhatsApp
  whatsapp_summary    TEXT,
  whatsapp_sent       INT NOT NULL DEFAULT 0,
  whatsapp_delivered  INT NOT NULL DEFAULT 0,
  whatsapp_replied    INT NOT NULL DEFAULT 0,
  -- Calls
  calls_summary       TEXT,
  calls_made          INT NOT NULL DEFAULT 0,
  calls_connected     INT NOT NULL DEFAULT 0,
  calls_converted     INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── LEADS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  data_entry_id     UUID REFERENCES public.data_entries(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  location          TEXT,
  expected_volume   NUMERIC,
  expected_revenue  NUMERIC,
  status            TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','contacted','qualified','proposal','negotiation','won','lost')),
  notes             TEXT,
  cycle_label       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── THEME CONFIG ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.theme_config (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default theme
INSERT INTO public.theme_config (key, value) VALUES
  ('admin_primary', '#2C1A0F'),
  ('admin_accent', '#A86035'),
  ('admin_bg', '#FDFAF5'),
  ('admin_sidebar', '#2C1A0F'),
  ('admin_gold', '#D4A843'),
  ('portal_default_primary', '#2C1A0F'),
  ('portal_default_accent', '#A86035'),
  ('portal_default_bg', '#FDFAF5'),
  ('portal_default_font', 'DM Sans'),
  ('brand_name', 'Thynk CMS'),
  ('brand_tagline', 'Client Management Platform'),
  ('logo_url', '')
ON CONFLICT (key) DO NOTHING;

-- ── ROW LEVEL SECURITY ─────────────────────────────────────

ALTER TABLE public.clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_config   ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper: get current user's client_id
CREATE OR REPLACE FUNCTION public.my_client_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid();
$$;

-- PROFILES
CREATE POLICY "users can read own profile" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admins can update profiles" ON public.profiles FOR UPDATE USING (public.is_admin());
CREATE POLICY "admins can delete profiles" ON public.profiles FOR DELETE USING (public.is_admin());

-- CLIENTS — admin full access, client can read own
CREATE POLICY "admin full access clients" ON public.clients FOR ALL USING (public.is_admin());
CREATE POLICY "client reads own" ON public.clients FOR SELECT USING (id = public.my_client_id());

-- PRODUCTS — admin full, clients read
CREATE POLICY "admin full access products" ON public.products FOR ALL USING (public.is_admin());
CREATE POLICY "clients read active products" ON public.products FOR SELECT USING (is_active = TRUE);

-- CLIENT PRODUCTS
CREATE POLICY "admin full access mappings" ON public.client_products FOR ALL USING (public.is_admin());
CREATE POLICY "client reads own mappings" ON public.client_products FOR SELECT USING (client_id = public.my_client_id());

-- DATA ENTRIES
CREATE POLICY "admin full access entries" ON public.data_entries FOR ALL USING (public.is_admin());
CREATE POLICY "client reads own entries" ON public.data_entries FOR SELECT USING (client_id = public.my_client_id());

-- LEADS
CREATE POLICY "admin full access leads" ON public.leads FOR ALL USING (public.is_admin());
CREATE POLICY "client reads own leads" ON public.leads FOR SELECT USING (client_id = public.my_client_id());

-- THEME CONFIG — admin write, all read
CREATE POLICY "admin manages theme" ON public.theme_config FOR ALL USING (public.is_admin());
CREATE POLICY "all read theme" ON public.theme_config FOR SELECT USING (TRUE);

-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON public.profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_data_entries_client_id ON public.data_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON public.leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_data_entry ON public.leads(data_entry_id);
CREATE INDEX IF NOT EXISTS idx_client_products_client ON public.client_products(client_id);

-- ── TRIGGER: auto-update updated_at ────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_data_entries_updated_at BEFORE UPDATE ON public.data_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── FIRST ADMIN SETUP ──────────────────────────────────────
-- After running this schema, create your first admin user via Supabase Auth
-- dashboard (Authentication → Users → Invite user), then run:
--
-- INSERT INTO public.profiles (id, email, role, full_name)
-- VALUES ('<your-auth-user-id>', 'admin@thynksuccess.com', 'admin', 'Super Admin');
