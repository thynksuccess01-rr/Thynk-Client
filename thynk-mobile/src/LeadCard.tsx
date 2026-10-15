import React from "react";
import { Text, View } from "react-native";
import type { DropdownOption, Lead } from "./lib/types";
import { optionMeta } from "./lib/dropdowns";
import { fmtINR } from "./lib/format";
import { Badge, C, Card } from "./ui";

export default function LeadCard({ lead, statuses, onPress, thisPeriod }:
  { lead: Lead; statuses: DropdownOption[]; onPress: () => void; thisPeriod?: boolean }) {
  const m = optionMeta(statuses, lead.status);
  const place = [lead.location, lead.state, lead.country].filter(Boolean).join(", ");
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{lead.name}</Text>
          {!!lead.institute_name && <Text style={{ fontSize: 12.5, color: "#57534E", marginTop: 1 }}>🏫 {lead.institute_name}</Text>}
        </View>
        <Badge text={m.label} bg={m.color_bg} color={m.color_text} />
      </View>
      {!!place && <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>📍 {place}</Text>}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 6, alignItems: "center" }}>
        {!!lead.expected_revenue && <Text style={{ color: C.amber, fontSize: 12, fontWeight: "700" }}>{fmtINR(lead.expected_revenue)} exp.</Text>}
        {!!lead.revenue_collected && <Text style={{ color: C.green, fontSize: 12, fontWeight: "700" }}>{fmtINR(lead.revenue_collected)} collected</Text>}
        {!!lead.program_name && <Badge text={lead.program_name} bg="#FFF7ED" color="#C2410C" />}
        {thisPeriod && <Badge text="This period" bg="#DBEAFE" color="#1D4ED8" />}
      </View>
    </Card>
  );
}
