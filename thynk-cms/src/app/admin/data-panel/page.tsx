"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Plus, ChevronDown, Save, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

const LEAD_STATUSES = ["new","contacted","qualified","proposal","negotiation","won","lost"];
const STATUS_COLORS: Record<string, string> = {
  new: "badge-blue", contacted: "badge-yellow", qualified: "badge-yellow",
  proposal: "badge-blue", negotiation: "badge-yellow", won: "badge-green", lost: "badge-red",
};

const EMPTY_ENTRY = {
  period_start: "", period_end: "",
  email_summary: "", email_sent: 0, email_opened: 0, email_clicked: 0,
  whatsapp_summary: "", whatsapp_sent: 0, whatsapp_delivered: 0, whatsapp_replied: 0,
  calls_summary: "", calls_made: 0, calls_connected: 0, calls_converted: 0,
};

const EMPTY_LEAD = { name: "", location: "", expected_volume: "", expected_revenue: "", status: "new", notes: "", cycle_label: "" };

export default function DataPanelPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [entries, setEntries] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activeEntry, setActiveEntry] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_ENTRY);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newLead, setNewLead] = useState<any>(EMPTY_LEAD);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("clients").select("id,name,primary_color").order("name").then(r => setClients(r.data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedClient) { setEntries([]); setLeads([]); return; }
    loadEntries(); loadLeads();
  }, [selectedClient]);

  async function loadEntries() {
    const { data } = await supabase.from("data_entries").select("*").eq("client_id", selectedClient).order("period_start", { ascending: false });
    setEntries(data ?? []);
  }

  async function loadLeads() {
    const { data } = await supabase.from("leads").select("*").eq("client_id", selectedClient).order("created_at", { ascending: false });
    setLeads(data ?? []);
  }

  async function saveEntry() {
    setSaving(true);
    const payload = { ...form, client_id: selectedClient, updated_at: new Date().toISOString() };
    let entryId = activeEntry;
    if (activeEntry && activeEntry !== "new") {
      const { error } = await supabase.from("data_entries").update(payload).eq("id", activeEntry);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Entry updated");
    } else {
      const { data, error } = await supabase.from("data_entries").insert({ ...payload, created_at: new Date().toISOString() }).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      entryId = data.id;
      setActiveEntry(data.id);
      toast.success("Entry created");
    }
    setSaving(false);
    loadEntries();
  }

  async function saveLead() {
    if (!newLead.name) { toast.error("Lead name required"); return; }
    const payload = {
      ...newLead,
      client_id: selectedClient,
      data_entry_id: activeEntry && activeEntry !== "new" ? activeEntry : null,
      expected_volume: newLead.expected_volume ? Number(newLead.expected_volume) : null,
      expected_revenue: newLead.expected_revenue ? Number(newLead.expected_revenue) : null,
    };
    const { error } = await supabase.from("leads").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Lead added"); setNewLead(EMPTY_LEAD); setShowLeadForm(false); loadLeads(); }
  }

  async function updateLeadStatus(id: string, status: string) {
    await supabase.from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    loadLeads();
  }

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead?")) return;
    await supabase.from("leads").delete().eq("id", id);
    loadLeads();
  }

  function selectEntry(e: any) {
    setActiveEntry(e.id);
    setForm({
      period_start: e.period_start, period_end: e.period_end,
      email_summary: e.email_summary ?? "", email_sent: e.email_sent, email_opened: e.email_opened, email_clicked: e.email_clicked,
      whatsapp_summary: e.whatsapp_summary ?? "", whatsapp_sent: e.whatsapp_sent, whatsapp_delivered: e.whatsapp_delivered, whatsapp_replied: e.whatsapp_replied,
      calls_summary: e.calls_summary ?? "", calls_made: e.calls_made, calls_connected: e.calls_connected, calls_converted: e.calls_converted,
    });
    setShowNewEntry(false);
  }

  const client = clients.find(c => c.id === selectedClient);

  return (
    <div>
      <PageHeader title="Data Panel" subtitle="Enter campaign and lead data per client per period" />

      {/* Client selector */}
      <div className="mb-6 max-w-sm">
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Select Client</label>
        <select className="input" value={selectedClient} onChange={e => { setSelectedClient(e.target.value); setActiveEntry(null); setForm(EMPTY_ENTRY); }}>
          <option value="">Choose a client...</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {selectedClient && (
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Entry list */}
          <div className="col-span-3">
            <div className="card overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#EDD9B0", background: "#FAF4E8" }}>
                <h3 className="text-sm font-semibold" style={{ color: "#1A0F08" }}>Periods</h3>
                <button onClick={() => { setShowNewEntry(true); setActiveEntry("new"); setForm(EMPTY_ENTRY); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#A86035" }}>
                  <Plus size={14} color="white" />
                </button>
              </div>
              <div className="divide-y" style={{ divideColor: "#FAF4E8" }}>
                {entries.length === 0 && !showNewEntry && (
                  <p className="text-xs text-center py-8" style={{ color: "#A86035" }}>No entries yet</p>
                )}
                {showNewEntry && (
                  <button className="w-full text-left px-4 py-3 text-sm transition-colors"
                    style={{ background: activeEntry === "new" ? "#FAF4E8" : "transparent", color: "#A86035", borderLeft: activeEntry === "new" ? "3px solid #A86035" : "none" }}>
                    + New Entry
                  </button>
                )}
                {entries.map(e => (
                  <button key={e.id} onClick={() => selectEntry(e)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-amber-50 transition-colors"
                    style={{ background: activeEntry === e.id ? "#FAF4E8" : "transparent", borderLeft: activeEntry === e.id ? "3px solid #A86035" : "3px solid transparent" }}>
                    <p className="font-medium text-xs" style={{ color: "#1A0F08" }}>
                      {new Date(e.period_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} –{" "}
                      {new Date(e.period_end).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#A86035" }}>{e.email_sent + e.whatsapp_sent + e.calls_made} activities</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="col-span-9 space-y-5">
            {activeEntry ? (
              <>
                {/* A: Period */}
                <div className="card p-5">
                  <h3 className="font-semibold mb-4 text-sm flex items-center gap-2" style={{ color: "#1A0F08" }}>
                    <span className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold text-white" style={{ background: "#A86035" }}>A</span>
                    Reporting Period
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Start Date</label>
                      <input type="date" className="input" value={form.period_start} onChange={e => setForm({ ...form, period_start: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>End Date</label>
                      <input type="date" className="input" value={form.period_end} onChange={e => setForm({ ...form, period_end: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* B: Email Campaign */}
                <div className="card p-5">
                  <h3 className="font-semibold mb-4 text-sm flex items-center gap-2" style={{ color: "#1A0F08" }}>
                    <span className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold text-white" style={{ background: "#2D5A3D" }}>B</span>
                    Email Campaign Summary
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    {[["Sent","email_sent"],["Opened","email_opened"],["Clicked","email_clicked"]].map(([l,k]) => (
                      <div key={k}>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>{l}</label>
                        <input type="number" className="input" value={form[k]} onChange={e => setForm({ ...form, [k]: Number(e.target.value) })} min={0} />
                      </div>
                    ))}
                  </div>
                  <textarea className="input resize-none" rows={3} placeholder="Campaign notes and observations..."
                    value={form.email_summary} onChange={e => setForm({ ...form, email_summary: e.target.value })} />
                </div>

                {/* C: WhatsApp */}
                <div className="card p-5">
                  <h3 className="font-semibold mb-4 text-sm flex items-center gap-2" style={{ color: "#1A0F08" }}>
                    <span className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold text-white" style={{ background: "#1E40AF" }}>C</span>
                    WhatsApp Campaign Summary
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    {[["Sent","whatsapp_sent"],["Delivered","whatsapp_delivered"],["Replied","whatsapp_replied"]].map(([l,k]) => (
                      <div key={k}>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>{l}</label>
                        <input type="number" className="input" value={form[k]} onChange={e => setForm({ ...form, [k]: Number(e.target.value) })} min={0} />
                      </div>
                    ))}
                  </div>
                  <textarea className="input resize-none" rows={3} placeholder="WhatsApp notes..."
                    value={form.whatsapp_summary} onChange={e => setForm({ ...form, whatsapp_summary: e.target.value })} />
                </div>

                {/* D: Calls */}
                <div className="card p-5">
                  <h3 className="font-semibold mb-4 text-sm flex items-center gap-2" style={{ color: "#1A0F08" }}>
                    <span className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold text-white" style={{ background: "#7C2D12" }}>D</span>
                    Calls Interaction Summary
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    {[["Made","calls_made"],["Connected","calls_connected"],["Converted","calls_converted"]].map(([l,k]) => (
                      <div key={k}>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>{l}</label>
                        <input type="number" className="input" value={form[k]} onChange={e => setForm({ ...form, [k]: Number(e.target.value) })} min={0} />
                      </div>
                    ))}
                  </div>
                  <textarea className="input resize-none" rows={3} placeholder="Call interaction notes..."
                    value={form.calls_summary} onChange={e => setForm({ ...form, calls_summary: e.target.value })} />
                </div>

                <div className="flex justify-end">
                  <button onClick={saveEntry} disabled={saving || !form.period_start || !form.period_end}
                    className="btn-primary flex items-center gap-2">
                    <Save size={16} /> {saving ? "Saving..." : "Save Entry"}
                  </button>
                </div>

                {/* E: Leads */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: "#1A0F08" }}>
                      <span className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold text-white" style={{ background: "#D4A843" }}>E</span>
                      Lead Details
                      <span className="badge badge-yellow ml-1">{leads.length} total</span>
                    </h3>
                    <button onClick={() => setShowLeadForm(true)} className="btn-primary flex items-center gap-2 text-xs py-2">
                      <Plus size={14} /> Add Lead
                    </button>
                  </div>

                  {showLeadForm && (
                    <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: "#FAF4E8", border: "1px solid #EDD9B0" }}>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: "#A86035" }}>Lead Name *</label>
                          <input className="input" value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} placeholder="John Doe" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: "#A86035" }}>Location</label>
                          <input className="input" value={newLead.location} onChange={e => setNewLead({ ...newLead, location: e.target.value })} placeholder="Mumbai, India" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: "#A86035" }}>Expected Volume</label>
                          <input type="number" className="input" value={newLead.expected_volume} onChange={e => setNewLead({ ...newLead, expected_volume: e.target.value })} placeholder="100" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: "#A86035" }}>Expected Revenue (₹)</label>
                          <input type="number" className="input" value={newLead.expected_revenue} onChange={e => setNewLead({ ...newLead, expected_revenue: e.target.value })} placeholder="50000" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: "#A86035" }}>Status</label>
                          <select className="input" value={newLead.status} onChange={e => setNewLead({ ...newLead, status: e.target.value })}>
                            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: "#A86035" }}>Cycle Label</label>
                          <input className="input" value={newLead.cycle_label} onChange={e => setNewLead({ ...newLead, cycle_label: e.target.value })} placeholder="e.g. Q1 2025" />
                        </div>
                      </div>
                      <textarea className="input resize-none" rows={2} placeholder="Notes..." value={newLead.notes} onChange={e => setNewLead({ ...newLead, notes: e.target.value })} />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowLeadForm(false)} className="btn-secondary text-xs">Cancel</button>
                        <button onClick={saveLead} className="btn-primary text-xs">Save Lead</button>
                      </div>
                    </div>
                  )}

                  {leads.length === 0 ? (
                    <p className="text-sm text-center py-8" style={{ color: "#A86035" }}>No leads yet for this client.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: "1px solid #EDD9B0" }}>
                            {["Lead","Location","Volume","Revenue","Status","Cycle","Actions"].map(h => (
                              <th key={h} className="text-left pb-2 text-xs font-medium" style={{ color: "#A86035" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {leads.map(l => (
                            <tr key={l.id} style={{ borderBottom: "1px solid #FAF4E8" }} className="hover:bg-amber-50 transition-colors">
                              <td className="py-2.5 font-medium" style={{ color: "#1A0F08" }}>{l.name}</td>
                              <td className="py-2.5 text-xs" style={{ color: "#3D2314" }}>{l.location ?? "—"}</td>
                              <td className="py-2.5 text-xs">{l.expected_volume ?? "—"}</td>
                              <td className="py-2.5 text-xs">{l.expected_revenue ? `₹${l.expected_revenue.toLocaleString("en-IN")}` : "—"}</td>
                              <td className="py-2.5">
                                <select value={l.status}
                                  onChange={e => updateLeadStatus(l.id, e.target.value)}
                                  className={`badge ${STATUS_COLORS[l.status]} cursor-pointer border-none outline-none bg-transparent text-xs`}>
                                  {LEAD_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                </select>
                              </td>
                              <td className="py-2.5 text-xs" style={{ color: "#A86035" }}>{l.cycle_label ?? "—"}</td>
                              <td className="py-2.5">
                                <button onClick={() => deleteLead(l.id)} className="p-1 hover:bg-red-50 rounded">
                                  <Trash2 size={13} style={{ color: "#EF4444" }} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="card p-16 text-center">
                <ChevronDown size={32} className="mx-auto mb-3 opacity-30" style={{ color: "#A86035" }} />
                <p className="text-sm" style={{ color: "#A86035" }}>Select or create a period entry to start</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
