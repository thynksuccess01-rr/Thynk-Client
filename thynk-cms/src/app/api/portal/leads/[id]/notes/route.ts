import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getCaller } from "@/lib/supabase/route-auth";

// Adds a note to a lead. Notes are visible to both admin and the owning
// client (see lead_notes RLS in schema_v4.sql). Works for both admin and
// client callers — each note is stamped with the real author name/role so
// everyone sees "who said what, when" regardless of which side added it.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { note } = await req.json();
    if (!note || typeof note !== "string" || !note.trim()) {
      return NextResponse.json({ error: "note is required" }, { status: 400 });
    }

    const { admin, user, profile } = await getCaller(req);
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 });

    const { data: lead, error: leadErr } = await admin
      .from("leads").select("id, client_id").eq("id", params.id).single();
    if (leadErr || !lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const isAdmin = profile.role === "admin";
    if (!isAdmin && lead.client_id !== profile.client_id) {
      return NextResponse.json({ error: "Not your lead" }, { status: 403 });
    }

    const authorName = profile.full_name || user.email;
    const authorRole = isAdmin ? "admin" : "client";

    const { data: created, error: noteErr } = await admin.from("lead_notes").insert({
      lead_id: params.id,
      author_id: user.id,
      author_name: authorName,
      author_role: authorRole,
      note: note.trim(),
    }).select().single();
    if (noteErr) return NextResponse.json({ error: noteErr.message }, { status: 500 });

    // Notes count as an update to the lead too, so "last updated by" reflects it.
    await admin.from("leads").update({
      last_updated_by: user.id,
      last_updated_by_name: authorName,
      last_updated_by_role: authorRole,
      updated_at: new Date().toISOString(),
    }).eq("id", params.id);

    return NextResponse.json({ ok: true, note: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );
    const { data, error } = await supabase
      .from("lead_notes").select("*").eq("lead_id", params.id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ notes: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
