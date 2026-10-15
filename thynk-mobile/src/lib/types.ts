export type Role = "admin" | "client";

export interface Profile {
  id: string;
  email: string;
  role: Role;
  full_name: string | null;
  client_id: string | null;
}

export interface Client {
  id: string;
  name: string;
  is_active?: boolean | null;
}

export interface DataEntry {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  entry_label: string | null;
  total_licences: number | null;
  total_revenue_collected: number | null;
  expected_collection: number | null;
  email_summary: string | null;
  whatsapp_summary: string | null;
  calls_summary: string | null;
  email_sent?: number; email_opened?: number; email_clicked?: number;
  whatsapp_sent?: number; whatsapp_delivered?: number; whatsapp_replied?: number;
  calls_made?: number; calls_connected?: number; calls_converted?: number;
}

export type Channel = "email" | "whatsapp" | "calls";

export interface CampaignUpdate {
  id: string;
  data_entry_id: string;
  client_id: string;
  channel: Channel;
  update_date: string;
  email_sent: number; email_opened: number; email_clicked: number;
  whatsapp_sent: number; whatsapp_delivered: number; whatsapp_replied: number;
  calls_made: number; calls_connected: number; calls_converted: number;
  follow_up_calls_made: number; demo_scheduled: number; demo_completed: number;
  demo_rescheduled: number; follow_up_meeting_done: number;
  notes: string | null;
}

export interface Lead {
  id: string;
  client_id: string;
  data_entry_id: string | null;
  name: string;
  institute_name: string | null;
  country: string | null;
  state: string | null;
  location: string | null;
  expected_volume: number | null;
  expected_revenue: number | null;
  revenue_collected: number | null;
  total_licences_allocated: number | null;
  status: string;
  previous_status: string | null;
  notes: string | null;
  cycle_label: string | null;
  program_name: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  created_at: string;
  created_by_name: string | null;
  last_updated_by_name: string | null;
  last_updated_by_role: string | null;
  data_entries?: { period_start: string; period_end: string; entry_label: string | null } | null;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_name: string;
  author_role: "admin" | "client";
  note: string;
  created_at: string;
}

export interface DropdownOption {
  value: string;
  label: string;
  color_bg: string | null;
  color_text: string | null;
  icon: string | null;
}
