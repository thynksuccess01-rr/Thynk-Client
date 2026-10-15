import React, { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { fmtINR } from "../../lib/format";
import type { Lead } from "../../lib/types";
import { Btn, C, Card, Empty, Loading, NumField } from "../../ui";

type Edit = { licences: string; revenue: string; expected: string };

export default function RevenueTab({ clientId, entryId }: { clientId: string; entryId: string }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    supabase.from("leads").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).then(r => {
      const rows = (r.data as Lead[]) ?? [];
      setLeads(rows);
      const init: Record<string, Edit> = {};
      rows.forEach(l => { init[l.id] = {
        licences: l.total_licences_allocated != null ? String(l.total_licences_allocated) : "",
        revenue: l.revenue_collected && l.revenue_collected > 0 ? String(l.revenue_collected) : "",
        expected: l.expected_revenue != null ? String(l.expected_revenue) : "",
      }; });
      setEdits(init);
    });
  }, [clientId]);
  useFocusEffect(load);

  const set = (id: string, k: keyof Edit) => (v: string) => setEdits(p => ({ ...p, [id]: { ...p[id], [k]: v } }));
  const totals = Object.values(edits).reduce((t, v) => ({
    rev: t.rev + (Number(v.revenue) || 0), exp: t.exp + (Number(v.expected) || 0), lic: t.lic + (Number(v.licences) || 0),
  }), { rev: 0, exp: 0, lic: 0 });

  async function save() {
    setBusy(true);
    for (const [id, v] of Object.entries(edits)) {
      await supabase.from("leads").update({
        total_licences_allocated: v.licences ? Number(v.licences) : null,
        revenue_collected: v.revenue ? Number(v.revenue) : 0,
        expected_revenue: v.expected ? Number(v.expected) : null,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
    }
    const { data: all } = await supabase.from("leads").select("revenue_collected,expected_revenue,status").eq("client_id", clientId);
    const rows = (all ?? []) as any[];
    const totalRev = rows.reduce((s, l) => s + (l.revenue_collected ?? 0), 0);
    const totalExp = rows.filter(l => l.status !== "lost").reduce((s, l) => s + (l.expected_revenue ?? 0), 0);
    const { data: entry } = await supabase.from("data_entries").select("total_licences").eq("id", entryId).single();
    await supabase.from("data_entries").update({
      total_revenue_collected: totalRev, expected_collection: totalExp,
      total_licences: totals.lic || (entry as any)?.total_licences || 0, updated_at: new Date().toISOString(),
    }).eq("id", entryId);
    setBusy(false);
    Alert.alert("Saved", "Revenue & licences saved");
    load();
  }

  if (leads === null) return <Loading />;
  if (leads.length === 0) return <Empty text="Add leads first — then enter revenue here." />;
  return (
    <View>
      <Card>
        <Text style={{ color: C.green, fontWeight: "800" }}>💰 {fmtINR(totals.rev)} collected</Text>
        <Text style={{ color: C.amber, fontWeight: "800", marginTop: 2 }}>🔮 {fmtINR(totals.exp)} expected</Text>
        <Text style={{ color: "#2563EB", fontWeight: "800", marginTop: 2 }}>📦 {totals.lic} licences</Text>
      </Card>
      <Btn title="Save all" onPress={save} loading={busy} />
      {leads.map(l => (
        <Card key={l.id}>
          <Text style={{ fontWeight: "700", color: C.ink }}>{l.name}</Text>
          {!!l.institute_name && <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>{l.institute_name}</Text>}
          <NumField label="Licences" value={edits[l.id]?.licences ?? ""} onChange={set(l.id, "licences")} />
          <NumField label="Revenue collected (₹)" value={edits[l.id]?.revenue ?? ""} onChange={set(l.id, "revenue")} />
          <NumField label="Expected revenue (₹)" value={edits[l.id]?.expected ?? ""} onChange={set(l.id, "expected")} />
        </Card>
      ))}
      <Btn title="Save all" onPress={save} loading={busy} />
    </View>
  );
}
