import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useDropdown } from "../lib/dropdowns";
import { numOrNull } from "../lib/format";
import type { RootStackParamList } from "../nav";
import { Btn, Field, Loading, NumField, Screen, Select } from "../ui";

const EMPTY = {
  name: "", institute_name: "", country: "", state: "", location: "",
  expected_volume: "", expected_revenue: "", status: "new", notes: "", cycle_label: "", program_name: "",
};

export default function LeadFormScreen() {
  const nav = useNavigation();
  const { profile } = useAuth();
  const { params } = useRoute<RouteProp<RootStackParamList, "LeadForm">>();
  const statuses = useDropdown("lead_status");
  const [f, setF] = useState(EMPTY);
  const [origStatus, setOrigStatus] = useState("new");
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!params.leadId);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (v: string) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    supabase.from("client_products").select("products(id,name)").eq("client_id", params.clientId).then(({ data }) =>
      setProjects(((data ?? []) as any[]).map(r => r.products?.name).filter(Boolean)));
    if (!params.leadId) return;
    supabase.from("leads").select("*").eq("id", params.leadId).single().then(({ data }) => {
      if (data) {
        setOrigStatus(data.status);
        setF({
          name: data.name ?? "", institute_name: data.institute_name ?? "", country: data.country ?? "",
          state: data.state ?? "", location: data.location ?? "",
          expected_volume: data.expected_volume != null ? String(data.expected_volume) : "",
          expected_revenue: data.expected_revenue != null ? String(data.expected_revenue) : "",
          status: data.status, notes: data.notes ?? "", cycle_label: data.cycle_label ?? "", program_name: data.program_name ?? "",
        });
      }
      setLoading(false);
    });
  }, [params.leadId, params.clientId]);

  async function save() {
    if (!f.name.trim()) { Alert.alert("Lead name required"); return; }
    setBusy(true);
    const who = { id: profile?.id ?? null, name: profile?.full_name || profile?.email || "Admin" };
    const base = {
      name: f.name.trim(), institute_name: f.institute_name.trim() || null,
      country: f.country.trim() || null, state: f.state.trim() || null, location: f.location.trim() || null,
      expected_volume: numOrNull(f.expected_volume), expected_revenue: numOrNull(f.expected_revenue),
      status: f.status, notes: f.notes.trim() || null, cycle_label: f.cycle_label.trim() || null,
      program_name: f.program_name.trim() || null,
    };
    let error;
    if (params.leadId) {
      const statusChanged = f.status !== origStatus;
      ({ error } = await supabase.from("leads").update({
        ...base,
        ...(statusChanged ? { previous_status: origStatus, status_updated_at: new Date().toISOString(), is_updated_this_cycle: true } : {}),
        last_updated_by: who.id, last_updated_by_name: who.name, last_updated_by_role: "admin",
        updated_at: new Date().toISOString(),
      }).eq("id", params.leadId));
    } else {
      ({ error } = await supabase.from("leads").insert({
        ...base, client_id: params.clientId, data_entry_id: params.entryId ?? null,
        created_by: who.id, created_by_name: who.name, created_by_role: "admin",
      }));
    }
    setBusy(false);
    if (error) Alert.alert("Error", error.message); else nav.goBack();
  }

  function remove() {
    if (!params.leadId) return;
    Alert.alert("Delete this lead?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await supabase.from("leads").delete().eq("id", params.leadId!);
        // Lead detail screen (if open underneath) would be stale, so go back to the list.
        nav.goBack(); nav.goBack();
      } },
    ]);
  }

  if (loading) return <Loading />;
  return (
    <Screen>
      <Field label="Lead name *" value={f.name} onChangeText={set("name")} />
      <Field label="Institute name" value={f.institute_name} onChangeText={set("institute_name")} placeholder="e.g. Delhi Public School" />
      <Field label="Country" value={f.country} onChangeText={set("country")} placeholder="India" />
      <Field label="State" value={f.state} onChangeText={set("state")} />
      <Field label="City / location" value={f.location} onChangeText={set("location")} />
      <NumField label="Expected volume" value={f.expected_volume} onChange={set("expected_volume")} />
      <NumField label="Expected revenue (₹)" value={f.expected_revenue} onChange={set("expected_revenue")} />
      <Select label="Status" value={f.status} onChange={set("status")} options={statuses.map(s => ({ value: s.value, label: s.label }))} />
      <Field label="Cycle label" value={f.cycle_label} onChangeText={set("cycle_label")} placeholder="e.g. Apr 2026" />
      {projects.length > 1 && (
        <Select label="Program / project" value={f.program_name} onChange={set("program_name")}
          options={[{ value: "", label: "— None —" }, ...projects.map(p => ({ value: p, label: p }))]} />
      )}
      <Field label="Notes" value={f.notes} onChangeText={set("notes")} multiline />
      <Btn title={params.leadId ? "Save changes" : "Save lead"} onPress={save} loading={busy} />
      {params.leadId && <Btn title="Delete lead" kind="danger" onPress={remove} />}
    </Screen>
  );
}
