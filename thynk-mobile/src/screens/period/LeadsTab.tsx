import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../../lib/supabase";
import { useDropdown } from "../../lib/dropdowns";
import type { Lead } from "../../lib/types";
import type { RootStackParamList } from "../../nav";
import { Btn, Empty, Field, Loading } from "../../ui";
import LeadCard from "../../LeadCard";

export default function LeadsTab({ clientId, entryId }: { clientId: string; entryId: string }) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const statuses = useDropdown("lead_status");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [q, setQ] = useState("");

  useFocusEffect(useCallback(() => {
    supabase.from("leads").select("*").eq("client_id", clientId).order("created_at", { ascending: false })
      .then(r => setLeads((r.data as Lead[]) ?? []));
  }, [clientId]));

  const list = (leads ?? []).filter(l => {
    const s = q.toLowerCase();
    return !s || l.name.toLowerCase().includes(s) || (l.institute_name ?? "").toLowerCase().includes(s) ||
      (l.location ?? "").toLowerCase().includes(s) || (l.state ?? "").toLowerCase().includes(s);
  });

  return (
    <View>
      <Btn title="+ Add lead" onPress={() => nav.navigate("LeadForm", { clientId, entryId })} />
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Lead, institute, city…" />
      {leads === null ? <Loading /> : list.length === 0 ? <Empty text="No leads found." /> :
        list.map(l => (
          <LeadCard key={l.id} lead={l} statuses={statuses} thisPeriod={l.data_entry_id === entryId}
            onPress={() => nav.navigate("LeadDetail", { leadId: l.id })} />
        ))}
      {leads && leads.length > 0 && <Text style={{ textAlign: "center", color: "#A8A29E", fontSize: 12 }}>{list.length} of {leads.length} leads</Text>}
    </View>
  );
}
