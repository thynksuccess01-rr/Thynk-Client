import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useDropdown } from "../lib/dropdowns";
import { fmtDate, fmtINR } from "../lib/format";
import type { DataEntry, Lead } from "../lib/types";
import type { RootStackParamList } from "../nav";
import LeadCard from "../LeadCard";
import { C, Card, Empty, Field, Loading, Screen, Segmented } from "../ui";

// Client users: they only ever see their own client's data (enforced by database rules),
// and can only change lead status + add notes.
export default function ClientHomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuth();
  const statuses = useDropdown("lead_status");
  const [tab, setTab] = useState("leads");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [entries, setEntries] = useState<DataEntry[]>([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const clientId = profile?.client_id;

  useFocusEffect(useCallback(() => {
    if (!clientId) { setLeads([]); return; }
    supabase.from("leads").select("*").eq("client_id", clientId).order("created_at", { ascending: false })
      .then(r => setLeads((r.data as Lead[]) ?? []));
    supabase.from("data_entries").select("*").eq("client_id", clientId).order("period_start", { ascending: false })
      .then(r => setEntries((r.data as DataEntry[]) ?? []));
  }, [clientId]));

  if (!clientId) return <Screen><Empty text="Your account isn't linked to a client yet. Please contact Thynk Success." /></Screen>;

  const all = leads ?? [];
  const list = all.filter(l => {
    if (filter !== "all" && l.status !== filter) return false;
    const s = q.toLowerCase();
    return !s || l.name.toLowerCase().includes(s) || (l.institute_name ?? "").toLowerCase().includes(s) ||
      (l.location ?? "").toLowerCase().includes(s) || (l.state ?? "").toLowerCase().includes(s) || (l.program_name ?? "").toLowerCase().includes(s);
  });
  const active = all.filter(l => !["won", "lost"].includes(l.status));
  const won = all.filter(l => l.status === "won");

  return (
    <Screen>
      <Segmented value={tab} onChange={setTab} options={[{ value: "leads", label: "Leads" }, { value: "summary", label: "Periods" }]} />
      {tab === "leads" ? (
        <>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            {[["Total", String(all.length), C.ink], ["Active", String(active.length), C.amber], ["Won", String(won.length), C.green]].map(([k, v, c]) => (
              <Card key={k} style={{ flex: 1, marginBottom: 0, alignItems: "center", paddingVertical: 10 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: c }}>{v}</Text>
                <Text style={{ fontSize: 11, color: C.muted }}>{k}</Text>
              </Card>
            ))}
          </View>
          <Field label="Search" value={q} onChangeText={setQ} placeholder="Lead, institute, city…" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {[{ value: "all", label: "All" }, ...statuses].map(s => (
              <Pressable key={s.value} onPress={() => setFilter(s.value)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, borderWidth: 1,
                  borderColor: filter === s.value ? C.accent : C.line, backgroundColor: filter === s.value ? "#FFF7ED" : "#fff" }}>
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: filter === s.value ? C.accent : C.muted }}>{s.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {leads === null ? <Loading /> : list.length === 0 ? <Empty text="No leads found." /> :
            list.map(l => <LeadCard key={l.id} lead={l} statuses={statuses} onPress={() => nav.navigate("LeadDetail", { leadId: l.id })} />)}
        </>
      ) : entries.length === 0 ? <Empty text="No periods yet." /> : entries.map(e => (
        <Card key={e.id}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{e.entry_label || fmtDate(e.period_start)}</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{fmtDate(e.period_start)} → {fmtDate(e.period_end)}</Text>
          <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
            <Text style={{ color: C.green, fontWeight: "700", fontSize: 12.5 }}>{fmtINR(e.total_revenue_collected)} collected</Text>
            <Text style={{ color: C.amber, fontWeight: "700", fontSize: 12.5 }}>{fmtINR(e.expected_collection)} expected</Text>
          </View>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
            📧 {e.email_sent ?? 0} · 💬 {e.whatsapp_sent ?? 0} · 📞 {e.calls_made ?? 0} · 📦 {e.total_licences ?? 0} licences
          </Text>
        </Card>
      ))}
    </Screen>
  );
}
