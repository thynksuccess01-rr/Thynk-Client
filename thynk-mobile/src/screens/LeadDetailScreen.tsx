import React, { useCallback, useLayoutEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { addLeadNote, updateLeadStatus } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useDropdown, optionMeta } from "../lib/dropdowns";
import { fmtDate, fmtINR } from "../lib/format";
import type { Lead, LeadNote } from "../lib/types";
import type { RootStackParamList } from "../nav";
import { Badge, Btn, C, Card, Field, H, Loading, Screen } from "../ui";

function Row({ k, v }: { k: string; v?: string | number | null }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <View style={{ flexDirection: "row", paddingVertical: 5 }}>
      <Text style={{ width: 120, color: C.muted, fontSize: 12.5 }}>{k}</Text>
      <Text style={{ flex: 1, color: C.ink, fontSize: 13.5 }}>{v}</Text>
    </View>
  );
}

export default function LeadDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, "LeadDetail">>();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const statuses = useDropdown("lead_status");
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("leads")
      .select("*, data_entries(period_start, period_end, entry_label)").eq("id", params.leadId).single();
    setLead((data as Lead) ?? null);
    const n = await supabase.from("lead_notes").select("*").eq("lead_id", params.leadId).order("created_at", { ascending: false });
    setNotes((n.data as LeadNote[]) ?? []);
  }, [params.leadId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useLayoutEffect(() => {
    if (!isAdmin || !lead) return;
    nav.setOptions({
      headerRight: () => (
        <Pressable hitSlop={10} onPress={() => nav.navigate("LeadForm", { clientId: lead.client_id, entryId: lead.data_entry_id, leadId: lead.id })}>
          <Text style={{ color: C.accent, fontWeight: "800" }}>Edit</Text>
        </Pressable>
      ),
    });
  }, [nav, isAdmin, lead]);

  async function changeStatus(value: string) {
    if (!lead || value === lead.status) return;
    setBusy("status");
    try { await updateLeadStatus(lead.id, value); await load(); }
    catch (e: any) { Alert.alert("Could not update status", e.message); }
    setBusy(null);
  }
  async function addNote() {
    if (!lead || !draft.trim()) return;
    setBusy("note");
    try { await addLeadNote(lead.id, draft.trim()); setDraft(""); await load(); }
    catch (e: any) { Alert.alert("Could not add note", e.message); }
    setBusy(null);
  }

  if (!lead) return <Loading />;
  const m = optionMeta(statuses, lead.status);
  const place = [lead.location, lead.state, lead.country].filter(Boolean).join(", ");
  const period = lead.data_entries ? (lead.data_entries.entry_label || `${fmtDate(lead.data_entries.period_start)} → ${fmtDate(lead.data_entries.period_end)}`) : null;

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: "800", color: C.ink }}>{lead.name}</Text>
        {!!lead.institute_name && <Text style={{ fontSize: 13.5, color: "#57534E", marginTop: 2 }}>🏫 {lead.institute_name}</Text>}
        <View style={{ marginTop: 8 }}><Badge text={m.label} bg={m.color_bg} color={m.color_text} /></View>
      </Card>

      <H>Update status</H>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {statuses.map(s => {
          const active = s.value === lead.status;
          return (
            <Pressable key={s.value} disabled={busy === "status"} onPress={() => changeStatus(s.value)}
              style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1,
                borderColor: active ? (s.color_text ?? C.accent) : C.line, backgroundColor: active ? (s.color_bg ?? "#FFF7ED") : "#fff", opacity: busy === "status" ? 0.5 : 1 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: active ? (s.color_text ?? C.accent) : C.muted }}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <Row k="Location" v={place} />
        <Row k="Program" v={lead.program_name} />
        <Row k="Period" v={period} />
        <Row k="Cycle" v={lead.cycle_label} />
        <Row k="Expected volume" v={lead.expected_volume} />
        <Row k="Expected revenue" v={lead.expected_revenue ? fmtINR(lead.expected_revenue) : null} />
        <Row k="Revenue collected" v={lead.revenue_collected ? fmtINR(lead.revenue_collected) : null} />
        <Row k="Licences" v={lead.total_licences_allocated} />
        <Row k="Contact" v={lead.contact_person} />
        <Row k="Email" v={lead.contact_email} />
        <Row k="Phone" v={lead.contact_phone} />
        <Row k="Remarks" v={lead.notes} />
        <Row k="Added" v={lead.created_by_name ? `${lead.created_by_name} · ${fmtDate(lead.created_at)}` : fmtDate(lead.created_at)} />
        <Row k="Last update" v={lead.last_updated_by_name ? `${lead.last_updated_by_name}${lead.last_updated_by_role === "client" ? " (client)" : ""}` : null} />
      </Card>

      <H>Notes ({notes.length})</H>
      <Field label="Add a note" value={draft} onChangeText={setDraft} multiline placeholder="Write an update everyone on this lead can see…" />
      <Btn title="Add note" onPress={addNote} loading={busy === "note"} disabled={!draft.trim()} />
      {notes.map(n => (
        <Card key={n.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontWeight: "700", color: C.ink, fontSize: 12.5 }}>{n.author_name}{n.author_role === "client" ? " · client" : ""}</Text>
            <Text style={{ color: C.faint, fontSize: 11.5 }}>{fmtDate(n.created_at)}</Text>
          </View>
          <Text style={{ color: C.ink, fontSize: 13.5 }}>{n.note}</Text>
        </Card>
      ))}
    </Screen>
  );
}
