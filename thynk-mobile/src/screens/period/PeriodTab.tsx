import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { Btn, Field, Loading, NumField } from "../../ui";

const EMPTY = {
  period_start: "", period_end: "", entry_label: "", total_licences: "0",
  total_revenue_collected: "0", expected_collection: "0",
  email_summary: "", whatsapp_summary: "", calls_summary: "",
};

export default function PeriodTab({ clientId, entryId, onCreated }:
  { clientId: string; entryId?: string; onCreated: (id: string) => void }) {
  const nav = useNavigation();
  const [f, setF] = useState(EMPTY);
  const [loading, setLoading] = useState(!!entryId);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (v: string) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!entryId) return;
    supabase.from("data_entries").select("*").eq("id", entryId).single().then(({ data }) => {
      if (data) setF({
        period_start: data.period_start ?? "", period_end: data.period_end ?? "", entry_label: data.entry_label ?? "",
        total_licences: String(data.total_licences ?? 0), total_revenue_collected: String(data.total_revenue_collected ?? 0),
        expected_collection: String(data.expected_collection ?? 0),
        email_summary: data.email_summary ?? "", whatsapp_summary: data.whatsapp_summary ?? "", calls_summary: data.calls_summary ?? "",
      });
      setLoading(false);
    });
  }, [entryId]);

  async function save() {
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(f.period_start) || !re.test(f.period_end)) { Alert.alert("Dates needed", "Enter dates as YYYY-MM-DD, e.g. 2026-04-01"); return; }
    setBusy(true);
    const payload = {
      client_id: clientId, period_start: f.period_start, period_end: f.period_end, entry_label: f.entry_label || null,
      total_licences: Number(f.total_licences) || 0, total_revenue_collected: Number(f.total_revenue_collected) || 0,
      expected_collection: Number(f.expected_collection) || 0,
      email_summary: f.email_summary || null, whatsapp_summary: f.whatsapp_summary || null, calls_summary: f.calls_summary || null,
      updated_at: new Date().toISOString(),
    };
    if (entryId) {
      const { error } = await supabase.from("data_entries").update(payload).eq("id", entryId);
      Alert.alert(error ? "Error" : "Saved", error ? error.message : "Period saved");
    } else {
      const { data, error } = await supabase.from("data_entries").insert({ ...payload, created_at: new Date().toISOString() }).select().single();
      if (error) Alert.alert("Error", error.message);
      else { onCreated(data.id); Alert.alert("Created", "Period created. You can now add campaigns and leads."); }
    }
    setBusy(false);
  }

  function remove() {
    if (!entryId) return;
    Alert.alert("Delete period?", "This deletes the period and all its campaign data. Leads are kept but unlinked.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await supabase.from("campaign_updates").delete().eq("data_entry_id", entryId);
        await supabase.from("leads").update({ data_entry_id: null }).eq("data_entry_id", entryId);
        await supabase.from("data_entries").delete().eq("id", entryId);
        nav.goBack();
      } },
    ]);
  }

  if (loading) return <Loading />;
  return (
    <>
      <Field label="Label (optional)" value={f.entry_label} onChangeText={set("entry_label")} placeholder="e.g. April 2026" />
      <Field label="Period start * (YYYY-MM-DD)" value={f.period_start} onChangeText={set("period_start")} placeholder="2026-04-01" autoCapitalize="none" />
      <Field label="Period end * (YYYY-MM-DD)" value={f.period_end} onChangeText={set("period_end")} placeholder="2026-04-30" autoCapitalize="none" />
      <NumField label="Total licences" value={f.total_licences} onChange={set("total_licences")} />
      <NumField label="Revenue collected (₹)" value={f.total_revenue_collected} onChange={set("total_revenue_collected")} />
      <NumField label="Expected collection (₹)" value={f.expected_collection} onChange={set("expected_collection")} />
      <Field label="Email summary" value={f.email_summary} onChangeText={set("email_summary")} multiline />
      <Field label="WhatsApp summary" value={f.whatsapp_summary} onChangeText={set("whatsapp_summary")} multiline />
      <Field label="Calls summary" value={f.calls_summary} onChangeText={set("calls_summary")} multiline />
      <Btn title={entryId ? "Save period" : "Create period"} onPress={save} loading={busy} />
      {entryId && <Btn title="Delete period" kind="danger" onPress={remove} />}
    </>
  );
}
