import React, { useState } from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../nav";
import { Screen, Segmented } from "../ui";
import PeriodTab from "./period/PeriodTab";
import CampaignsTab from "./period/CampaignsTab";
import LeadsTab from "./period/LeadsTab";
import RevenueTab from "./period/RevenueTab";

export default function PeriodScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "Period">>();
  const [entryId, setEntryId] = useState<string | undefined>(params.entryId);
  const [tab, setTab] = useState("period");
  const saved = !!entryId;

  return (
    <Screen>
      <Segmented value={tab} onChange={setTab} options={[
        { value: "period", label: "Period" },
        { value: "campaigns", label: "Campaigns", disabled: !saved },
        { value: "leads", label: "Leads", disabled: !saved },
        { value: "revenue", label: "Revenue", disabled: !saved },
      ]} />
      {tab === "period" && <PeriodTab clientId={params.clientId} entryId={entryId} onCreated={setEntryId} />}
      {tab === "campaigns" && entryId && <CampaignsTab clientId={params.clientId} entryId={entryId} />}
      {tab === "leads" && entryId && <LeadsTab clientId={params.clientId} entryId={entryId} />}
      {tab === "revenue" && entryId && <RevenueTab clientId={params.clientId} entryId={entryId} />}
    </Screen>
  );
}
