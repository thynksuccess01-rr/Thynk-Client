-- ============================================================
-- SCHEMA V5 — Run this in Supabase SQL Editor (additions only)
-- Adds an "Institute name" to each lead (shown in Data Panel > Lead Details)
-- ============================================================
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS institute_name TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_institute_name ON public.leads(institute_name);
