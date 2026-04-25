-- ============================================================
-- SCHEMA V2 — Run this in Supabase SQL Editor (additions only)
-- ============================================================

-- Allow multiple campaign entries per period (not just one data_entry)
-- Rename data_entries → campaign_entries for clarity, but keep backward compat

-- Add revenue fields to data_entries
ALTER TABLE public.data_entries 
  ADD COLUMN IF NOT EXISTS total_licences INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_revenue_collected NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_collection NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entry_label TEXT,
  ADD COLUMN IF NOT EXISTS entry_date DATE;

-- Allow multiple campaign sub-entries per data_entry (email/whatsapp/calls updates)
CREATE TABLE IF NOT EXISTS public.campaign_updates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_entry_id UUID NOT NULL REFERENCES public.data_entries(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL CHECK (channel IN ('email','whatsapp','calls')),
  update_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Email
  email_sent        INT DEFAULT 0,
  email_opened      INT DEFAULT 0,
  email_clicked     INT DEFAULT 0,
  -- WhatsApp
  whatsapp_sent      INT DEFAULT 0,
  whatsapp_delivered INT DEFAULT 0,
  whatsapp_replied   INT DEFAULT 0,
  -- Calls
  calls_made       INT DEFAULT 0,
  calls_connected  INT DEFAULT 0,
  calls_converted  INT DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add lead tracking across cycles
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS previous_status TEXT,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_updated_this_cycle BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_cycle_label TEXT;

-- RLS for campaign_updates
ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin full campaign_updates" ON public.campaign_updates FOR ALL USING (public.is_admin());
CREATE POLICY "client reads own campaign_updates" ON public.campaign_updates FOR SELECT USING (client_id = public.my_client_id());

-- Index
CREATE INDEX IF NOT EXISTS idx_campaign_updates_entry ON public.campaign_updates(data_entry_id);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_client ON public.campaign_updates(client_id);

