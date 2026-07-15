-- ============================================================
-- SCHEMA V4 — Run this in Supabase SQL Editor (additions only)
-- ============================================================
-- Adds:
--   1. "Added by" tracking on leads (who created it, when — already have created_at)
--   2. "Last updated by" tracking on leads (status/notes changes, by admin or client)
--   3. A lead_notes table so both admin and client users can leave notes
--      that are visible to everyone, each stamped with author + date.
--   4. RLS so clients can update ONLY their own leads' status (writes are still
--      funneled through /api/portal/leads/[id]/status so we can restrict which
--      columns actually change — Postgres RLS can't do column-level checks).
-- ============================================================

-- ── Added-by tracking ───────────────────────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_by_name  TEXT,
  ADD COLUMN IF NOT EXISTS created_by_role  TEXT; -- 'admin' | 'client'

-- ── Last-updated-by tracking (status changes / edits) ───────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_updated_by       UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_updated_by_name  TEXT,
  ADD COLUMN IF NOT EXISTS last_updated_by_role  TEXT; -- 'admin' | 'client'

-- ── Lead notes (visible to admin + client, author + date shown) ─────────────
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id      UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id    UUID REFERENCES auth.users(id),
  author_name  TEXT NOT NULL,
  author_role  TEXT NOT NULL CHECK (author_role IN ('admin','client')),
  note         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON public.lead_notes(lead_id);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin full lead_notes" ON public.lead_notes
  FOR ALL USING (public.is_admin());

CREATE POLICY "client reads own lead_notes" ON public.lead_notes
  FOR SELECT USING (
    lead_id IN (SELECT id FROM public.leads WHERE client_id = public.my_client_id())
  );

CREATE POLICY "client inserts notes on own leads" ON public.lead_notes
  FOR INSERT WITH CHECK (
    lead_id IN (SELECT id FROM public.leads WHERE client_id = public.my_client_id())
    AND author_role = 'client'
  );

-- ── Allow clients to update rows on their own leads ─────────────────────────
-- NOTE: RLS is row-level, not column-level. This policy alone would let a
-- client update ANY column on their own lead if called directly from the
-- browser. To keep clients from editing revenue/volume/etc, all client-side
-- status/notes updates MUST go through /api/portal/leads/[id]/status, which
-- uses the service-role key and only ever writes status + tracking columns.
-- This policy exists as a safety net for that server route (which otherwise
-- would need the service role for everything) and is intentionally still
-- restrictive at the row level.
CREATE POLICY "client updates own lead status" ON public.leads
  FOR UPDATE USING (client_id = public.my_client_id())
  WITH CHECK (client_id = public.my_client_id());

-- Helpful index for the new admin summary / drill-down views
CREATE INDEX IF NOT EXISTS idx_leads_client_status ON public.leads(client_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_program_status ON public.leads(program_name, status);
