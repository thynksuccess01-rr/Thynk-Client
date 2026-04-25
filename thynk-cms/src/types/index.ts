export type Role = "admin" | "client";

export interface Profile {
  id: string;
  email: string;
  role: Role;
  full_name: string | null;
  client_id: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  font_family: string;
  industry: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DataEntry {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  email_summary: string | null;
  email_sent: number;
  email_opened: number;
  email_clicked: number;
  whatsapp_summary: string | null;
  whatsapp_sent: number;
  whatsapp_delivered: number;
  whatsapp_replied: number;
  calls_summary: string | null;
  calls_made: number;
  calls_connected: number;
  calls_converted: number;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  client_id: string;
  data_entry_id: string | null;
  name: string;
  location: string | null;
  expected_volume: number | null;
  expected_revenue: number | null;
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  notes: string | null;
  cycle_label: string | null;
  created_at: string;
  updated_at: string;
}
