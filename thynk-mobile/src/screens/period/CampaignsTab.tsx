import React, { useCallback, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../../lib/supabase";
import { resyncEntry } from "../../lib/data";
import { useDropdown, optionMeta } from "../../lib/dropdowns";
import { fmtDate } from "../../lib/format";
import type { CampaignUpdate } from "../../lib/types";
import type { RootStackParamList } from "../../nav";
import { Btn, Card, C, Empty, Loading } from "../../ui";

function summary(u: CampaignUpdate) {
  if (u.channel === "email") return `Sent ${u.email_sent} · Opened ${u.email_opened} · Clicked ${u.email_clicked}`;
  if (u.channel === "whatsapp") return `Sent ${u.whatsapp_sent} · Delivered ${u.whatsapp_delivered} · Replied ${u.whatsapp_replied}`;
  return `Made ${u.calls_made} · Connected ${u.calls_connected} · Converted ${u.calls_converted} · Demos ${u.demo_scheduled}/${u.demo_completed}`;
}

export default function CampaignsTab({ clientId, entryId }: { clientId: string; entryId: string }) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const channels = useDropdown("campaign_channel");
  const [rows, setRows] = useState<CampaignUpdate[] | null>(null);

  const load = useCallback(() => {
    supabase.from("campaign_updates").select("*").eq("data_entry_id", entryId)
      .order("update_date", { ascending: false }).order("created_at", { ascending: false })
      .then(r => setRows((r.data as CampaignUpdate[]) ?? []));
  }, [entryId]);
  useFocusEffect(load);

  function remove(id: string) {
    Alert.alert("Delete this entry?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await supabase.from("campaign_updates").delete().eq("id", id);
        await resyncEntry(entryId); load();
      } },
    ]);
  }

  return (
    <View>
      <Btn title="+ Add campaign entry" onPress={() => nav.navigate("CampaignForm", { clientId, entryId })} />
      {rows === null ? <Loading /> : rows.length === 0 ? <Empty text="No entries yet. Log email, WhatsApp or call data." /> :
        rows.map(u => {
          const m = optionMeta(channels, u.channel);
          return (
            <Card key={u.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "700", color: C.ink }}>{m.icon ?? ""} {m.label}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{fmtDate(u.update_date)}</Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 6 }}>{summary(u)}</Text>
              {!!u.notes && <Text style={{ color: C.ink, fontSize: 12.5, marginTop: 6 }}>{u.notes}</Text>}
              <Pressable onPress={() => remove(u.id)} style={{ marginTop: 8 }}>
                <Text style={{ color: C.red, fontWeight: "700", fontSize: 12 }}>Delete</Text>
              </Pressable>
            </Card>
          );
        })}
    </View>
  );
}
