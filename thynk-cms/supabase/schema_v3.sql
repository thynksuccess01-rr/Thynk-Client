-- ============================================================
-- SCHEMA V3 — Run this in Supabase SQL Editor (additions only)
-- ============================================================

-- Some clients run multiple projects/programs at once (e.g. separate
-- admission drives, grade bands, or product lines under one account).
-- This lets a lead be tagged with which program/project it belongs to.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS program_name TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_program_name ON public.leads(program_name);
