import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { DropdownOption } from "./types";

const o = (value: string, label: string, bg: string | null, text: string | null, icon: string | null = null): DropdownOption =>
  ({ value, label, color_bg: bg, color_text: text, icon });

const FALLBACKS: Record<string, DropdownOption[]> = {
  lead_status: [
    o("new", "New", "#EEF2FF", "#4338CA"), o("contacted", "Contacted", "#FFFBEB", "#B45309"),
    o("qualified", "Qualified", "#FFF7ED", "#C2410C"), o("proposal", "Proposal", "#F5F3FF", "#6D28D9"),
    o("negotiation", "Negotiation", "#FEF3C7", "#92400E"), o("won", "Won", "#DCFCE7", "#15803D"),
    o("lost", "Lost", "#FEE2E2", "#B91C1C"),
  ],
  campaign_channel: [
    o("email", "Email", null, null, "📧"), o("whatsapp", "WhatsApp", null, null, "💬"), o("calls", "Calls", null, null, "📞"),
  ],
};

// Same admin-editable dropdowns the website uses (Dropdown Manager), with safe defaults.
export function useDropdown(key: string) {
  const [options, setOptions] = useState<DropdownOption[]>(FALLBACKS[key] ?? []);
  useEffect(() => {
    supabase.from("dropdown_options")
      .select("value,label,color_bg,color_text,icon")
      .eq("dropdown_key", key).eq("is_active", true).order("sort_order", { ascending: true })
      .then(({ data, error }) => { if (!error && data && data.length) setOptions(data as DropdownOption[]); });
  }, [key]);
  return options;
}

export function optionMeta(options: DropdownOption[], value: string): DropdownOption {
  return options.find(x => x.value === value) ??
    { value, label: value ? value[0].toUpperCase() + value.slice(1) : "—", color_bg: "#F5F4F0", color_text: "#78716C", icon: null };
}
