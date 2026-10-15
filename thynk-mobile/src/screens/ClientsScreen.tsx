import React, { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import type { Client } from "../lib/types";
import type { RootStackParamList } from "../nav";
import { Card, C, Empty, Field, Loading, Screen } from "../ui";

export default function ClientsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [q, setQ] = useState("");

  useFocusEffect(useCallback(() => {
    supabase.from("clients").select("id,name,is_active").order("name").then(r => setClients((r.data as Client[]) ?? []));
  }, []));

  const list = (clients ?? []).filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen>
      <Field label="Search clients" value={q} onChangeText={setQ} placeholder="Type a client name" />
      {clients === null ? <Loading /> : list.length === 0 ? <Empty text="No clients found" /> :
        list.map(c => (
          <Card key={c.id} onPress={() => nav.navigate("Periods", { clientId: c.id, clientName: c.name })}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{c.name}</Text>
            {c.is_active === false && <Text style={{ color: C.faint, fontSize: 12, marginTop: 2 }}>Inactive</Text>}
          </Card>
        ))}
    </Screen>
  );
}
