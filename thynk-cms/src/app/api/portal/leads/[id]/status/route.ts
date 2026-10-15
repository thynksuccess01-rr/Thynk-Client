import { NextRequest, NextResponse } from "next/server";
import { getCaller } from "@/lib/supabase/route-auth";

// Client-portal users are only ever allowed to change a lead's status
// (plus notes, handled by /notes). Every other column on `leads` — revenue,
// volume, contact info, program, etc — must stay admin-only. RLS is row-level
// only, so we enforce the column restriction here in code: read the request
// body, discard everything except `status`, verify the caller actually owns
// this lead's client_id, then write with the service role.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status } = await req.json();
    if (!status || typeof status !== "string") {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const { admin, user, profile } = await getCaller(req);
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 403 });

    const { data: lead, error: leadErr } = await admin
      .from("leads").select("id, client_id, status").eq("id", params.id).single();
    if (leadErr || !lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const isAdmin = profile.role === "admin";
    if (!isAdmin && lead.client_id !== profile.client_id) {
      return NextResponse.json({ error: "Not your lead" }, { status: 403 });
    }

    const previousStatus = lead.status;
    const { error: updateErr } = await admin.from("leads").update({
      status,
      previous_status: previousStatus,
      status_updated_at: new Date().toISOString(),
      is_updated_this_cycle: true,
      last_updated_by: user.id,
      last_updated_by_name: profile.full_name || user.email,
      last_updated_by_role: isAdmin ? "admin" : "client",
      updated_at: new Date().toISOString(),
    }).eq("id", params.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
