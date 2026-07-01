"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface DropdownOption {
  id: string;
  dropdown_key: string;
  value: string;
  label: string;
  color_bg: string | null;
  color_text: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

/**
 * Registry of every dropdown in the app that's backed by the
 * `dropdown_options` table. Add an entry here whenever a new
 * page starts using useDropdownOptions() with a new key — this
 * is what makes it show up (grouped by page) in
 * Admin → Dropdown Manager, so editors know what they're editing.
 */
export const DROPDOWN_REGISTRY: {
  key: string;
  label: string;
  description: string;
  pages: string[];
  hasColor: boolean;
}[] = [
  {
    key: "lead_status",
    label: "Lead Status",
    description: "Stages a lead moves through, from first contact to won/lost.",
    pages: ["Leads", "Data Panel", "Client Portal → Leads", "Dashboards", "Lead Aging Report"],
    hasColor: true,
  },
  {
    key: "campaign_channel",
    label: "Campaign Update Channel",
    description: "Channel used for a campaign activity entry (email, WhatsApp, calls...).",
    pages: ["Data Panel"],
    hasColor: false,
  },
  {
    key: "document_category",
    label: "Document Category",
    description: "Category tag applied to files uploaded to a client's document library.",
    pages: ["Clients → Client Detail → Documents"],
    hasColor: false,
  },
  {
    key: "notification_type",
    label: "Notification Type",
    description: "Type tag shown on notifications sent to clients.",
    pages: ["Notifications", "Clients → Client Detail → Notifications"],
    hasColor: true,
  },
];

const FALLBACKS: Record<string, DropdownOption[]> = {
  lead_status: [
    { id: "f1", dropdown_key: "lead_status", value: "new", label: "New", color_bg: "#EEF2FF", color_text: "#4338CA", icon: null, sort_order: 1, is_active: true },
    { id: "f2", dropdown_key: "lead_status", value: "contacted", label: "Contacted", color_bg: "#FFFBEB", color_text: "#B45309", icon: null, sort_order: 2, is_active: true },
    { id: "f3", dropdown_key: "lead_status", value: "qualified", label: "Qualified", color_bg: "#FFF7ED", color_text: "#C2410C", icon: null, sort_order: 3, is_active: true },
    { id: "f4", dropdown_key: "lead_status", value: "proposal", label: "Proposal", color_bg: "#F5F3FF", color_text: "#6D28D9", icon: null, sort_order: 4, is_active: true },
    { id: "f5", dropdown_key: "lead_status", value: "negotiation", label: "Negotiation", color_bg: "#FEF3C7", color_text: "#92400E", icon: null, sort_order: 5, is_active: true },
    { id: "f6", dropdown_key: "lead_status", value: "won", label: "Won", color_bg: "#DCFCE7", color_text: "#15803D", icon: null, sort_order: 6, is_active: true },
    { id: "f7", dropdown_key: "lead_status", value: "lost", label: "Lost", color_bg: "#FEE2E2", color_text: "#B91C1C", icon: null, sort_order: 7, is_active: true },
  ],
  campaign_channel: [
    { id: "f1", dropdown_key: "campaign_channel", value: "email", label: "Email", color_bg: null, color_text: null, icon: "📧", sort_order: 1, is_active: true },
    { id: "f2", dropdown_key: "campaign_channel", value: "whatsapp", label: "WhatsApp", color_bg: null, color_text: null, icon: "💬", sort_order: 2, is_active: true },
    { id: "f3", dropdown_key: "campaign_channel", value: "calls", label: "Calls", color_bg: null, color_text: null, icon: "📞", sort_order: 3, is_active: true },
  ],
  document_category: [
    { id: "f1", dropdown_key: "document_category", value: "general", label: "General", color_bg: null, color_text: null, icon: null, sort_order: 1, is_active: true },
    { id: "f2", dropdown_key: "document_category", value: "report", label: "Report", color_bg: null, color_text: null, icon: null, sort_order: 2, is_active: true },
    { id: "f3", dropdown_key: "document_category", value: "contract", label: "Contract", color_bg: null, color_text: null, icon: null, sort_order: 3, is_active: true },
    { id: "f4", dropdown_key: "document_category", value: "invoice", label: "Invoice", color_bg: null, color_text: null, icon: null, sort_order: 4, is_active: true },
    { id: "f5", dropdown_key: "document_category", value: "media", label: "Media", color_bg: null, color_text: null, icon: null, sort_order: 5, is_active: true },
  ],
  notification_type: [
    { id: "f1", dropdown_key: "notification_type", value: "admin_message", label: "Admin Message", color_bg: "#EEF2FF", color_text: "#4338CA", icon: "💬", sort_order: 1, is_active: true },
    { id: "f2", dropdown_key: "notification_type", value: "data_update", label: "Data Update", color_bg: "#DCFCE7", color_text: "#15803D", icon: "📊", sort_order: 2, is_active: true },
    { id: "f3", dropdown_key: "notification_type", value: "document", label: "Document", color_bg: "#F5F3FF", color_text: "#7C3AED", icon: "📎", sort_order: 3, is_active: true },
    { id: "f4", dropdown_key: "notification_type", value: "lead_update", label: "Lead Update", color_bg: "#FFFBEB", color_text: "#B45309", icon: "🎯", sort_order: 4, is_active: true },
    { id: "f5", dropdown_key: "notification_type", value: "system", label: "System", color_bg: "#ECFEFF", color_text: "#0891B2", icon: "🔔", sort_order: 5, is_active: true },
  ],
};

/**
 * Fetches the live, admin-editable list of options for a given
 * dropdown key. Falls back to sane defaults if the table is
 * empty/unreachable so pages never render with a blank dropdown.
 *
 * Re-fetches on every mount, so any option added/edited/removed
 * in Admin → Dropdown Manager shows up next time a page using
 * that key loads.
 */
export function useDropdownOptions(key: string) {
  const [options, setOptions] = useState<DropdownOption[]>(FALLBACKS[key] ?? []);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dropdown_options")
      .select("*")
      .eq("dropdown_key", key)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (!error && data && data.length > 0) {
      setOptions(data as DropdownOption[]);
    } else if (FALLBACKS[key]) {
      setOptions(FALLBACKS[key]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { options, loading, reload };
}

/** Look up display label + colors for a stored value, with a safe default. */
export function getOptionMeta(options: DropdownOption[], value: string) {
  const found = options.find(o => o.value === value);
  if (found) return found;
  return {
    id: value,
    dropdown_key: "",
    value,
    label: value ? value.charAt(0).toUpperCase() + value.slice(1) : "—",
    color_bg: "#F5F4F0",
    color_text: "#78716C",
    icon: null,
    sort_order: 999,
    is_active: true,
  } as DropdownOption;
}
