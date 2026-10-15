import React, { useCallback, useLayoutEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import type { DataEntry } from "../lib/types";
import type { RootStackParamList } from "../nav";
import { fmtDate, fmtINR } from "../lib/format";
import { Card, C, Empty, Loading, Screen } from "../ui";

export default function PeriodsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, "Periods">>();
  const [entries, setEntries] = useState<DataEntry[] | null>(null);

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <Pressable onPress={() => nav.navigate("Period", { clientId: params.clientId, clientName: params.clientName })} hitSlop={10}>
          <Text style={{ color: C.accent, fontWeight: "800" }}>+ New period</Text>
        </Pressable>
      ),
    });
  }, [nav, params]);

  useFocusEffect(useCallback(() => {
    supabase.from("data_entries").select("*").eq("client_id", params.clientId)
      .order("period_start", { ascending: false }).then(r => setEntries((r.data as DataEntry[]) ?? []));
  }, [params.clientId]));

  return (
    <Screen>
      {entries === null ? <Loading /> : entries.length === 0 ? <Empty text="No periods yet. Tap “+ New period”." /> :
        entries.map(e => (
          <Card key={e.id} onPress={() => nav.navigate("Period", { clientId: params.clientId, clientName: params.clientName, entryId: e.id })}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{e.entry_label || fmtDate(e.period_start)}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{fmtDate(e.period_start)} → {fmtDate(e.period_end)}</Text>
            <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
              <Text style={{ color: C.green, fontWeight: "700", fontSize: 12.5 }}>{fmtINR(e.total_revenue_collected)} collected</Text>
              <Text style={{ color: C.amber, fontWeight: "700", fontSize: 12.5 }}>{fmtINR(e.expected_collection)} expected</Text>
            </View>
          </Card>
        ))}
    </Screen>
  );
}
