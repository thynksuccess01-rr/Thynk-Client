import { supabase } from "./supabase";

// Recompute a period's campaign totals from all its campaign entries (same as the web Data Panel).
export async function resyncEntry(entryId: string) {
  const { data } = await supabase.from("campaign_updates").select("*").eq("data_entry_id", entryId);
  const all = (data ?? []) as any[];
  const by = (ch: string) => all.filter(u => u.channel === ch);
  const sum = (rows: any[], k: string) => rows.reduce((s, u) => s + (u[k] ?? 0), 0);
  const e = by("email"), w = by("whatsapp"), c = by("calls");
  await supabase.from("data_entries").update({
    email_sent: sum(e, "email_sent"), email_opened: sum(e, "email_opened"), email_clicked: sum(e, "email_clicked"),
    whatsapp_sent: sum(w, "whatsapp_sent"), whatsapp_delivered: sum(w, "whatsapp_delivered"), whatsapp_replied: sum(w, "whatsapp_replied"),
    calls_made: sum(c, "calls_made"), calls_connected: sum(c, "calls_connected"), calls_converted: sum(c, "calls_converted"),
    follow_up_calls_made: sum(c, "follow_up_calls_made"), demo_scheduled: sum(c, "demo_scheduled"),
    demo_completed: sum(c, "demo_completed"), demo_rescheduled: sum(c, "demo_rescheduled"),
    follow_up_meeting_done: sum(c, "follow_up_meeting_done"),
    updated_at: new Date().toISOString(),
  }).eq("id", entryId);
}
