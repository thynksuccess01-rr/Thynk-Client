import React, { useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { resyncEntry } from "../lib/data";
import { useDropdown } from "../lib/dropdowns";
import { today } from "../lib/format";
import type { RootStackParamList } from "../nav";
import { Btn, Field, NumField, Screen, Select, H } from "../ui";

const NUM_KEYS = [
  "email_sent", "email_opened", "email_clicked", "whatsapp_sent", "whatsapp_delivered", "whatsapp_replied",
  "calls_made", "calls_connected", "calls_converted", "follow_up_calls_made", "demo_scheduled",
  "demo_completed", "demo_rescheduled", "follow_up_meeting_done",
] as const;
type NumKey = typeof NUM_KEYS[number];

const LABELS: Record<NumKey, string> = {
  email_sent: "Emails sent", email_opened: "Opened", email_clicked: "Clicked",
  whatsapp_sent: "WhatsApp sent", whatsapp_delivered: "Delivered", whatsapp_replied: "Replied",
  calls_made: "Calls made", calls_connected: "Connected", calls_converted: "Converted",
  follow_up_calls_made: "Follow-up calls made", demo_scheduled: "Demos scheduled", demo_completed: "Demos completed",
  demo_rescheduled: "Demos rescheduled", follow_up_meeting_done: "Follow-up meetings done",
};
const BY_CHANNEL: Record<string, NumKey[]> = {
  email: ["email_sent", "email_opened", "email_clicked"],
  whatsapp: ["whatsapp_sent", "whatsapp_delivered", "whatsapp_replied"],
  calls: ["calls_made", "calls_connected", "calls_converted", "follow_up_calls_made", "demo_scheduled", "demo_completed", "demo_rescheduled", "follow_up_meeting_done"],
};

export default function CampaignFormScreen() {
  const nav = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "CampaignForm">>();
  const channels = useDropdown("campaign_channel");
  const [channel, setChannel] = useState("email");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [nums, setNums] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { Alert.alert("Date needed", "Use YYYY-MM-DD"); return; }
    setBusy(true);
    const payload: Record<string, any> = {
      data_entry_id: params.entryId, client_id: params.clientId, channel, update_date: date,
      notes: notes || null, created_at: new Date().toISOString(),
    };
    NUM_KEYS.forEach(k => { payload[k] = Number(nums[k]) || 0; });
    // Only keep the metrics that belong to the chosen channel; zero the rest.
    NUM_KEYS.forEach(k => { if (!BY_CHANNEL[channel].includes(k)) payload[k] = 0; });
    const { error } = await supabase.from("campaign_updates").insert(payload);
    if (error) { Alert.alert("Error", error.message); setBusy(false); return; }
    await resyncEntry(params.entryId);
    setBusy(false);
    nav.goBack();
  }

  return (
    <Screen>
      <Select label="Channel" value={channel} onChange={setChannel} options={channels.map(c => ({ value: c.value, label: `${c.icon ?? ""} ${c.label}`.trim() }))} />
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} autoCapitalize="none" />
      <H>Numbers</H>
      {(BY_CHANNEL[channel] ?? []).map(k => (
        <NumField key={k} label={LABELS[k]} value={nums[k] ?? ""} onChange={v => setNums(p => ({ ...p, [k]: v }))} />
      ))}
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Btn title="Save entry" onPress={save} loading={busy} />
    </Screen>
  );
}
