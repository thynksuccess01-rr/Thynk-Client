import { API_BASE_URL } from "../config";
import { supabase } from "./supabase";

// Status changes and notes go through the website's secure API routes (same ones the
// web portal uses) so a client user can only ever change status/notes, never revenue etc.
async function call(path: string, method: string, body: unknown) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  let json: any = {};
  try { json = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export const updateLeadStatus = (leadId: string, status: string) =>
  call(`/api/portal/leads/${leadId}/status`, "PATCH", { status });

export const addLeadNote = (leadId: string, note: string) =>
  call(`/api/portal/leads/${leadId}/notes`, "POST", { note });
