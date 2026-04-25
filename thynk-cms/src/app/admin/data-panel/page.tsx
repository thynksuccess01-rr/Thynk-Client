"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Save, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

type LeadStatus = (typeof LEAD_STATUSES)[number];

const STATUS_COLOR: Record<LeadStatus, string> = {
  new: "#3B82F6",
  contacted: "#F59E0B",
  qualified: "#F59E0B",
  proposal: "#8B5CF6",
  negotiation: "#F97316",
  won: "#16A34A",
  lost: "#EF4444",
};

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
}

interface DataEntry {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  entry_label?: string;
  total_licences?: number;
  total_revenue_collected?: number;
  expected_collection?: number;
  email_summary?: string;
  whatsapp_summary?: string;
  calls_summary?: string;
}

interface Lead {
  id: string;
  client_id: string;
  data_entry_id?: string | null;
  name: string;
  location?: string;
  expected_volume?: number | null;
  expected_revenue?: number | null;
  status: LeadStatus;
  notes?: string;
  cycle_label?: string;
  previous_status?: string;
  is_updated_this_cycle?: boolean;
  status_updated_at?: string;
  updated_at?: string;
}

interface CampaignUpdate {
  id: string;
  data_entry_id: string;
  client_id: string;
  channel: "email" | "whatsapp" | "calls";
  update_date: string;
  email_sent: number;
  email_opened: number;
  email_clicked: number;
  whatsapp_sent: number;
  whatsapp_delivered: number;
  whatsapp_replied: number;
  calls_made: number;
  calls_connected: number;
  calls_converted: number;
  notes?: string;
  created_at?: string;
}

interface EntryForm {
  period_start: string;
  period_end: string;
  entry_label: string;
  total_licences: number;
  total_revenue_collected: number;
  expected_collection: number;
  email_summary: string;
  whatsapp_summary: string;
  calls_summary: string;
}

interface LeadForm {
  name: string;
  location: string;
  expected_volume: string;
  expected_revenue: string;
  status: LeadStatus;
  notes: string;
  cycle_label: string;
}

interface UpdateForm {
  channel: "email" | "whatsapp" | "calls";
  update_date: string;
  email_sent: number;
  email_opened: number;
  email_clicked: number;
  whatsapp_sent: number;
  whatsapp_delivered: number;
  whatsapp_replied: number;
  calls_made: number;
  calls_connected: number;
  calls_converted: number;
  notes: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const EMPTY_ENTRY: EntryForm = {
  period_start: "",
  period_end: "",
  entry_label: "",
  total_licences: 0,
  total_revenue_collected: 0,
  expected_collection: 0,
  email_summary: "",
  whatsapp_summary: "",
  calls_summary: "",
};

const EMPTY_LEAD: LeadForm = {
  name: "",
  location: "",
  expected_volume: "",
  expected_revenue: "",
  status: "new",
  notes: "",
  cycle_label: "",
};

const createEmptyUpdate = (): UpdateForm => ({
  channel: "email",
  update_date: new Date().toISOString().split("T")[0],
  email_sent: 0,
  email_opened: 0,
  email_clicked: 0,
  whatsapp_sent: 0,
  whatsapp_delivered: 0,
  whatsapp_replied: 0,
  calls_made: 0,
  calls_connected: 0,
  calls_converted: 0,
  notes: "",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (n: number): string => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SectionProps {
  id: string;
  label: string;
  color: string;
  children: React.ReactNode;
  expandedSection: string;
  onToggle: (id: string) => void;
}

function Section({
  id,
  label,
  color,
  children,
  expandedSection,
  onToggle,
}: SectionProps) {
  const isOpen = expandedSection === id;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E7E5E4",
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      <button
        onClick={() => onToggle(id)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {id.toUpperCase()}
        </span>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "#1C1917",
            flex: 1,
          }}
        >
          {label}
        </span>
        {isOpen ? (
          <ChevronDown size={14} color="#78716C" />
        ) : (
          <ChevronRight size={14} color="#78716C" />
        )}
      </button>

      {isOpen && (
        <div style={{ padding: "0 16px 16px" }}>{children}</div>
      )}
    </div>
  );
}

interface NumFieldProps {
  label: string;
  fieldKey: keyof EntryForm;
  form: EntryForm;
  onChange: (key: keyof EntryForm, value: number) => void;
}

function NumField({ label, fieldKey, form, onChange }: NumFieldProps) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 11.5,
          fontWeight: 500,
          color: "#78716C",
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <input
        type="number"
        className="input"
        value={form[fieldKey] as number}
        onChange={(e) => onChange(fieldKey, Number(e.target.value))}
        min={0}
        style={{ fontSize: 13 }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DataPanelPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [entries, setEntries] = useState<DataEntry[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [activeEntry, setActiveEntry] = useState<string | null>(null);
  const [form, setForm] = useState<EntryForm>(EMPTY_ENTRY);
  const [newLead, setNewLead] = useState<LeadForm>(EMPTY_LEAD);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [newUpdate, setNewUpdate] = useState<UpdateForm>(createEmptyUpdate());
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("a");

  const supabase = createClient();

  // ─── Data Loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase
      .from("clients")
      .select("id,name")
      .order("name")
      .then((r) => setClients(r.data ?? []));
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadEntries();
      loadLeads();
    }
  }, [selectedClient]);

  useEffect(() => {
    if (activeEntry && activeEntry !== "new") {
      loadUpdates();
    } else {
      setUpdates([]);
    }
  }, [activeEntry]);

  async function loadEntries() {
    const { data } = await supabase
      .from("data_entries")
      .select("*")
      .eq("client_id", selectedClient)
      .order("period_start", { ascending: false });
    setEntries(data ?? []);
  }

  async function loadLeads() {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("client_id", selectedClient)
      .order("created_at", { ascending: false });
    setLeads(data ?? []);
  }

  async function loadUpdates() {
    if (!activeEntry || activeEntry === "new") return;
    const { data } = await supabase
      .from("campaign_updates")
      .select("*")
      .eq("data_entry_id", activeEntry)
      .order("update_date")
      .order("created_at");
    setUpdates(data ?? []);
  }

  // ─── CRUD: Entries ───────────────────────────────────────────────────────────

  async function saveEntry() {
    if (!form.period_start || !form.period_end) {
      toast.error("Set period dates");
      return;
    }

    setSaving(true);

    const payload = {
      ...form,
      client_id: selectedClient,
      updated_at: new Date().toISOString(),
      email_sent: 0,
      email_opened: 0,
      email_clicked: 0,
      whatsapp_sent: 0,
      whatsapp_delivered: 0,
      whatsapp_replied: 0,
      calls_made: 0,
      calls_connected: 0,
      calls_converted: 0,
    };

    if (activeEntry && activeEntry !== "new") {
      const { error } = await supabase
        .from("data_entries")
        .update(payload)
        .eq("id", activeEntry);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Saved");
        loadEntries();
      }
    } else {
      const { data, error } = await supabase
        .from("data_entries")
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single();

      if (error) {
        toast.error(error.message);
      } else {
        setActiveEntry(data.id);
        toast.success("Period created");
        loadEntries();
      }
    }

    setSaving(false);
  }

  async function deleteEntry(id: string) {
    if (
      !confirm(
        "Delete this period and all its campaign data? This cannot be undone."
      )
    ) {
      return;
    }

    await supabase.from("campaign_updates").delete().eq("data_entry_id", id);
    await supabase.from("leads").update({ data_entry_id: null }).eq("data_entry_id", id);

    const { error } = await supabase
      .from("data_entries")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Period deleted");
      setActiveEntry(null);
      setForm(EMPTY_ENTRY);
      loadEntries();
      loadLeads();
    }
  }

  function selectEntry(entry: DataEntry) {
    setActiveEntry(entry.id);
    setForm({
      period_start: entry.period_start,
      period_end: entry.period_end,
      entry_label: entry.entry_label ?? "",
      total_licences: entry.total_licences ?? 0,
      total_revenue_collected: entry.total_revenue_collected ?? 0,
      expected_collection: entry.expected_collection ?? 0,
      email_summary: entry.email_summary ?? "",
      whatsapp_summary: entry.whatsapp_summary ?? "",
      calls_summary: entry.calls_summary ?? "",
    });
    setExpandedSection("a");
  }

  // ─── CRUD: Campaign Updates ──────────────────────────────────────────────────

  async function saveCampaignUpdate() {
    if (!activeEntry || activeEntry === "new") {
      toast.error("Save the period first");
      return;
    }

    const { error } = await supabase.from("campaign_updates").insert({
      ...newUpdate,
      data_entry_id: activeEntry,
      client_id: selectedClient,
      created_at: new Date().toISOString(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Entry added");
      setNewUpdate(createEmptyUpdate());
      setShowUpdateForm(false);
      loadUpdates();
    }
  }

  async function deleteUpdate(id: string) {
    await supabase.from("campaign_updates").delete().eq("id", id);
    toast.success("Deleted");
    loadUpdates();
  }

  // ─── CRUD: Leads ─────────────────────────────────────────────────────────────

  async function saveLead() {
    if (!newLead.name) {
      toast.error("Lead name required");
      return;
    }

    const payload = {
      ...newLead,
      client_id: selectedClient,
      data_entry_id:
        activeEntry && activeEntry !== "new" ? activeEntry : null,
      expected_volume: newLead.expected_volume
        ? Number(newLead.expected_volume)
        : null,
      expected_revenue: newLead.expected_revenue
        ? Number(newLead.expected_revenue)
        : null,
    };

    const { error } = await supabase.from("leads").insert(payload);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Lead added");
      setNewLead(EMPTY_LEAD);
      setShowLeadForm(false);
      loadLeads();
    }
  }

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead?")) return;
    await supabase.from("leads").delete().eq("id", id);
    toast.success("Deleted");
    loadLeads();
  }

  async function updateLeadStatus(
    id: string,
    newStatus: string,
    oldStatus: string
  ) {
    await supabase
      .from("leads")
      .update({
        status: newStatus,
        previous_status: oldStatus,
        status_updated_at: new Date().toISOString(),
        is_updated_this_cycle: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    loadLeads();
  }

  // ─── Derived Totals ───────────────────────────────────────────────────────────

  const emailUpdates = updates.filter((u) => u.channel === "email");
  const waUpdates = updates.filter((u) => u.channel === "whatsapp");
  const callUpdates = updates.filter((u) => u.channel === "calls");

  const accumulated = {
    emailSent: emailUpdates.reduce((s, u) => s + u.email_sent, 0),
    emailOpened: emailUpdates.reduce((s, u) => s + u.email_opened, 0),
    emailClicked: emailUpdates.reduce((s, u) => s + u.email_clicked, 0),
    waSent: waUpdates.reduce((s, u) => s + u.whatsapp_sent, 0),
    waDelivered: waUpdates.reduce((s, u) => s + u.whatsapp_delivered, 0),
    waReplied: waUpdates.reduce((s, u) => s + u.whatsapp_replied, 0),
    callsMade: callUpdates.reduce((s, u) => s + u.calls_made, 0),
    callsConnected: callUpdates.reduce((s, u) => s + u.calls_connected, 0),
    callsConverted: callUpdates.reduce((s, u) => s + u.calls_converted, 0),
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  function handleToggleSection(id: string) {
    setExpandedSection(expandedSection === id ? "" : id);
  }

  function handleEntryFormChange(key: keyof EntryForm, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleUpdateFormChange(key: keyof UpdateForm, value: string | number) {
    setNewUpdate((prev) => ({ ...prev, [key]: value }));
  }

  function handleLeadFormChange(key: keyof LeadForm, value: string) {
    setNewLead((prev) => ({ ...prev, [key]: value }));
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#1C1917",
              fontFamily: "Fraunces,Georgia,serif",
            }}
          >
            Data Panel
          </h1>
          <p style={{ fontSize: 13, color: "#78716C", marginTop: 3 }}>
            Each campaign entry is a new row — all entries accumulate into
            period totals
          </p>
        </div>
      </div>

      {/* Client Selector */}
      <div style={{ maxWidth: 300, marginBottom: 24 }}>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 500,
            color: "#57534E",
            marginBottom: 5,
          }}
        >
          Select Client
        </label>
        <select
          className="input"
          value={selectedClient}
          onChange={(e) => {
            setSelectedClient(e.target.value);
            setActiveEntry(null);
            setForm(EMPTY_ENTRY);
          }}
        >
          <option value="">Choose a client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main Layout */}
      {selectedClient && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            gap: 16,
          }}
        >
          {/* Period List Sidebar */}
          <PeriodSidebar
            entries={entries}
            activeEntry={activeEntry}
            onNewPeriod={() => {
              setActiveEntry("new");
              setForm(EMPTY_ENTRY);
              setUpdates([]);
              setExpandedSection("a");
            }}
            onSelectEntry={selectEntry}
            onDeleteEntry={deleteEntry}
          />

          {/* Detail Panel */}
          {activeEntry ? (
            <div>
              {/* Section A: Period & Revenue */}
              <Section
                id="a"
                label="Period & Revenue Details"
                color="#6366F1"
                expandedSection={expandedSection}
                onToggle={handleToggleSection}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    marginTop: 4,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11.5,
                        fontWeight: 500,
                        color: "#78716C",
                        marginBottom: 4,
                      }}
                    >
                      Start Date *
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={form.period_start}
                      onChange={(e) =>
                        handleEntryFormChange("period_start", e.target.value)
                      }
                      style={{ fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11.5,
                        fontWeight: 500,
                        color: "#78716C",
                        marginBottom: 4,
                      }}
                    >
                      End Date *
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={form.period_end}
                      onChange={(e) =>
                        handleEntryFormChange("period_end", e.target.value)
                      }
                      style={{ fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11.5,
                        fontWeight: 500,
                        color: "#78716C",
                        marginBottom: 4,
                      }}
                    >
                      Period Label
                    </label>
                    <input
                      className="input"
                      value={form.entry_label}
                      onChange={(e) =>
                        handleEntryFormChange("entry_label", e.target.value)
                      }
                      placeholder="e.g. Q1 2025"
                      style={{ fontSize: 13 }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                  }}
                >
                  <NumField
                    label="Total Licences"
                    fieldKey="total_licences"
                    form={form}
                    onChange={(k, v) => handleEntryFormChange(k, v)}
                  />
                  <NumField
                    label="Revenue Collected (₹)"
                    fieldKey="total_revenue_collected"
                    form={form}
                    onChange={(k, v) => handleEntryFormChange(k, v)}
                  />
                  <NumField
                    label="Expected Collection (₹)"
                    fieldKey="expected_collection"
                    form={form}
                    onChange={(k, v) => handleEntryFormChange(k, v)}
                  />
                </div>
              </Section>

              {/* Section Notes: Campaign Notes */}
              <Section
                id="notes"
                label="Campaign Notes (optional)"
                color="#78716C"
                expandedSection={expandedSection}
                onToggle={handleToggleSection}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    marginTop: 4,
                  }}
                >
                  {(
                    [
                      ["Email Notes", "email_summary"],
                      ["WhatsApp Notes", "whatsapp_summary"],
                      ["Calls Notes", "calls_summary"],
                    ] as [string, keyof EntryForm][]
                  ).map(([label, key]) => (
                    <div key={key}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11.5,
                          fontWeight: 500,
                          color: "#78716C",
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </label>
                      <textarea
                        className="input"
                        rows={3}
                        value={form[key] as string}
                        onChange={(e) =>
                          handleEntryFormChange(key, e.target.value)
                        }
                        style={{ resize: "none", fontSize: 13 }}
                      />
                    </div>
                  ))}
                </div>
              </Section>

              {/* Save Button */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 16,
                }}
              >
                <button
                  onClick={saveEntry}
                  disabled={saving}
                  className="btn-primary"
                >
                  <Save size={14} />
                  {saving ? "Saving..." : "Save Period"}
                </button>
              </div>

              {/* Campaign Data Entries */}
              {activeEntry && activeEntry !== "new" && (
                <CampaignDataSection
                  updates={updates}
                  accumulated={accumulated}
                  showUpdateForm={showUpdateForm}
                  newUpdate={newUpdate}
                  onToggleForm={() => setShowUpdateForm(true)}
                  onCancelForm={() => setShowUpdateForm(false)}
                  onUpdateFormChange={handleUpdateFormChange}
                  onSaveUpdate={saveCampaignUpdate}
                  onDeleteUpdate={deleteUpdate}
                />
              )}

              {/* Leads */}
              <LeadsSection
                leads={leads}
                activeEntry={activeEntry}
                showLeadForm={showLeadForm}
                newLead={newLead}
                onToggleForm={() => setShowLeadForm(true)}
                onCancelForm={() => setShowLeadForm(false)}
                onLeadFormChange={handleLeadFormChange}
                onSaveLead={saveLead}
                onDeleteLead={deleteLead}
                onUpdateLeadStatus={updateLeadStatus}
              />
            </div>
          ) : (
            <div
              style={{
                background: "#fff",
                border: "1px solid #E7E5E4",
                borderRadius: 10,
                padding: "60px 0",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 13.5, color: "#A8A29E" }}>
                Select a period or create a new one
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Period Sidebar ───────────────────────────────────────────────────────────

interface PeriodSidebarProps {
  entries: DataEntry[];
  activeEntry: string | null;
  onNewPeriod: () => void;
  onSelectEntry: (entry: DataEntry) => void;
  onDeleteEntry: (id: string) => void;
}

function PeriodSidebar({
  entries,
  activeEntry,
  onNewPeriod,
  onSelectEntry,
  onDeleteEntry,
}: PeriodSidebarProps) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E7E5E4",
        borderRadius: 10,
        overflow: "hidden",
        height: "fit-content",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid #F5F4F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FAFAF9",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1917" }}>
          Periods
        </span>
        <button
          onClick={onNewPeriod}
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "#E8611A",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus size={13} color="#fff" />
        </button>
      </div>

      {/* Empty State */}
      {entries.length === 0 && activeEntry !== "new" && (
        <p
          style={{
            fontSize: 12.5,
            textAlign: "center",
            padding: "24px 0",
            color: "#A8A29E",
          }}
        >
          No periods yet
        </p>
      )}

      {/* New Period Row */}
      {activeEntry === "new" && (
        <div
          style={{
            padding: "10px 14px",
            borderLeft: "3px solid #E8611A",
            background: "#FFF7ED",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: "#E8611A" }}>
            + New Period
          </p>
        </div>
      )}

      {/* Entry List */}
      {entries.map((entry) => {
        const isActive = activeEntry === entry.id;
        const label =
          entry.entry_label ||
          `${new Date(entry.period_start).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          })} – ${new Date(entry.period_end).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
            year: "2-digit",
          })}`;

        return (
          <div
            key={entry.id}
            style={{ position: "relative", borderBottom: "1px solid #F5F4F0" }}
          >
            <button
              onClick={() => onSelectEntry(entry)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 36px 10px 14px",
                borderLeft: `3px solid ${isActive ? "#E8611A" : "transparent"}`,
                background: isActive ? "#FFF7ED" : "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <p
                style={{ fontSize: 12.5, fontWeight: 600, color: "#1C1917" }}
              >
                {label}
              </p>
              <p style={{ fontSize: 11.5, color: "#A8A29E", marginTop: 2 }}>
                {entry.total_revenue_collected
                  ? fmtINR(entry.total_revenue_collected)
                  : "₹0"}{" "}
                · {entry.total_licences ?? 0} lic
              </p>
            </button>

            <button
              onClick={() => onDeleteEntry(entry.id)}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 5px",
                borderRadius: 5,
                display: "flex",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#FEE2E2")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <Trash2 size={12} color="#EF4444" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Campaign Data Section ────────────────────────────────────────────────────

interface AccumulatedTotals {
  emailSent: number;
  emailOpened: number;
  emailClicked: number;
  waSent: number;
  waDelivered: number;
  waReplied: number;
  callsMade: number;
  callsConnected: number;
  callsConverted: number;
}

interface CampaignDataSectionProps {
  updates: CampaignUpdate[];
  accumulated: AccumulatedTotals;
  showUpdateForm: boolean;
  newUpdate: UpdateForm;
  onToggleForm: () => void;
  onCancelForm: () => void;
  onUpdateFormChange: (key: keyof UpdateForm, value: string | number) => void;
  onSaveUpdate: () => void;
  onDeleteUpdate: (id: string) => void;
}

function CampaignDataSection({
  updates,
  accumulated,
  showUpdateForm,
  newUpdate,
  onToggleForm,
  onCancelForm,
  onUpdateFormChange,
  onSaveUpdate,
  onDeleteUpdate,
}: CampaignDataSectionProps) {
  const channelBadgeStyle = (channel: string) => ({
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600 as const,
    background:
      channel === "email"
        ? "#DBEAFE"
        : channel === "whatsapp"
        ? "#DCFCE7"
        : "#EDE9FE",
    color:
      channel === "email"
        ? "#1D4ED8"
        : channel === "whatsapp"
        ? "#15803D"
        : "#6D28D9",
  });

  const channelFields: Record<
    string,
    [string, keyof UpdateForm][]
  > = {
    email: [
      ["Sent", "email_sent"],
      ["Opened", "email_opened"],
      ["Clicked", "email_clicked"],
    ],
    whatsapp: [
      ["Sent", "whatsapp_sent"],
      ["Delivered", "whatsapp_delivered"],
      ["Replied", "whatsapp_replied"],
    ],
    calls: [
      ["Made", "calls_made"],
      ["Connected", "calls_connected"],
      ["Converted", "calls_converted"],
    ],
  };

  const totalCards = [
    {
      title: "📧 EMAIL",
      color: "#1D4ED8",
      bg: "#EFF6FF",
      bd: "#BFDBFE",
      items: [
        ["Sent", accumulated.emailSent, 0],
        ["Opened", accumulated.emailOpened, accumulated.emailSent],
        ["Clicked", accumulated.emailClicked, accumulated.emailSent],
      ] as [string, number, number][],
    },
    {
      title: "💬 WHATSAPP",
      color: "#15803D",
      bg: "#F0FDF4",
      bd: "#A7F3D0",
      items: [
        ["Sent", accumulated.waSent, 0],
        ["Delivered", accumulated.waDelivered, accumulated.waSent],
        ["Replied", accumulated.waReplied, accumulated.waSent],
      ] as [string, number, number][],
    },
    {
      title: "📞 CALLS",
      color: "#6D28D9",
      bg: "#F5F3FF",
      bd: "#DDD6FE",
      items: [
        ["Made", accumulated.callsMade, 0],
        ["Connected", accumulated.callsConnected, accumulated.callsMade],
        ["Converted", accumulated.callsConverted, accumulated.callsMade],
      ] as [string, number, number][],
    },
  ];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E7E5E4",
        borderRadius: 10,
        padding: 16,
        marginBottom: 10,
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div>
          <h3 style={{ fontSize: 13.5, fontWeight: 600, color: "#1C1917" }}>
            Campaign Data Entries{" "}
            <span
              style={{ fontSize: 12, color: "#A8A29E", fontWeight: 400 }}
            >
              ({updates.length} rows)
            </span>
          </h3>
          <p style={{ fontSize: 11.5, color: "#78716C", marginTop: 2 }}>
            Each row is independent. All rows are accumulated into totals below.
          </p>
        </div>
        <button
          onClick={onToggleForm}
          className="btn-primary"
          style={{ padding: "5px 12px", fontSize: 12 }}
        >
          <Plus size={12} /> Add Entry
        </button>
      </div>

      {/* Add Entry Form */}
      {showUpdateForm && (
        <div
          style={{
            background: "#F9F8F7",
            border: "1px solid #E7E5E4",
            borderRadius: 8,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            {/* Channel */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: "#78716C",
                  marginBottom: 4,
                }}
              >
                Channel
              </label>
              <select
                className="input"
                value={newUpdate.channel}
                onChange={(e) => onUpdateFormChange("channel", e.target.value)}
                style={{ fontSize: 13 }}
              >
                <option value="email">📧 Email</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="calls">📞 Calls</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: "#78716C",
                  marginBottom: 4,
                }}
              >
                Date
              </label>
              <input
                type="date"
                className="input"
                value={newUpdate.update_date}
                onChange={(e) =>
                  onUpdateFormChange("update_date", e.target.value)
                }
                style={{ fontSize: 13 }}
              />
            </div>

            {/* Channel-specific Fields */}
            {channelFields[newUpdate.channel].map(([label, key]) => (
              <div key={key}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: "#78716C",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </label>
                <input
                  type="number"
                  className="input"
                  value={newUpdate[key] as number}
                  onChange={(e) =>
                    onUpdateFormChange(key, Number(e.target.value))
                  }
                  style={{ fontSize: 13, width: 90 }}
                />
              </div>
            ))}
          </div>

          <textarea
            className="input"
            rows={2}
            placeholder="Notes..."
            value={newUpdate.notes}
            onChange={(e) => onUpdateFormChange("notes", e.target.value)}
            style={{ resize: "none", fontSize: 13, marginBottom: 10 }}
          />

          <div
            style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
          >
            <button
              onClick={onCancelForm}
              className="btn-secondary"
              style={{ fontSize: 12 }}
            >
              Cancel
            </button>
            <button
              onClick={onSaveUpdate}
              className="btn-primary"
              style={{ fontSize: 12 }}
            >
              Add Entry Row
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {updates.length === 0 ? (
        <p
          style={{
            fontSize: 12.5,
            color: "#A8A29E",
            textAlign: "center",
            padding: "20px 0",
          }}
        >
          No entries yet. Each entry you add becomes a new row, never
          overwriting previous ones.
        </p>
      ) : (
        <div>
          {/* Updates Table */}
          <div style={{ overflowX: "auto", marginBottom: 14 }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}
            >
              <thead>
                <tr
                  style={{
                    background: "#F9F8F7",
                    borderBottom: "1px solid #F0EEEC",
                  }}
                >
                  {[
                    "Date",
                    "Channel",
                    "Primary",
                    "Secondary",
                    "Tertiary",
                    "Notes",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign:
                          h === "Primary" ||
                          h === "Secondary" ||
                          h === "Tertiary"
                            ? "right"
                            : "left",
                        padding: "7px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#A8A29E",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {updates.map((u) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: "1px solid #F5F4F0" }}
                  >
                    <td style={{ padding: "8px 10px", color: "#78716C" }}>
                      {u.update_date}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={channelBadgeStyle(u.channel)}>
                        {u.channel}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#1C1917",
                      }}
                    >
                      {u.channel === "email"
                        ? u.email_sent
                        : u.channel === "whatsapp"
                        ? u.whatsapp_sent
                        : u.calls_made}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        textAlign: "right",
                        color: "#57534E",
                      }}
                    >
                      {u.channel === "email"
                        ? u.email_opened
                        : u.channel === "whatsapp"
                        ? u.whatsapp_delivered
                        : u.calls_connected}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        textAlign: "right",
                        color: "#57534E",
                      }}
                    >
                      {u.channel === "email"
                        ? u.email_clicked
                        : u.channel === "whatsapp"
                        ? u.whatsapp_replied
                        : u.calls_converted}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        color: "#A8A29E",
                        maxWidth: 150,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {u.notes || "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <button
                        onClick={() => onDeleteUpdate(u.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: 4,
                          borderRadius: 5,
                          display: "flex",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#FEE2E2")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <Trash2 size={12} color="#EF4444" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Accumulated Totals */}
          <div
            style={{
              background: "#F0FDF4",
              border: "1px solid #A7F3D0",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#15803D",
                marginBottom: 10,
              }}
            >
              ✅ Accumulated Totals ({updates.length} entries combined)
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 12,
              }}
            >
              {totalCards.map(({ title, color, bd, items }) => (
                <div
                  key={title}
                  style={{
                    background: "#fff",
                    borderRadius: 8,
                    padding: 12,
                    border: `1px solid ${bd}`,
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color,
                      marginBottom: 8,
                    }}
                  >
                    {title}
                  </p>
                  {items.map(([label, value, total]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 12,
                        padding: "4px 0",
                        borderBottom: "1px solid #F5F4F0",
                      }}
                    >
                      <span style={{ color: "#78716C" }}>{label}</span>
                      <span>
                        <span style={{ fontWeight: 700, color }}>{value}</span>
                        {total > 0 && (
                          <span
                            style={{
                              fontSize: 10.5,
                              color: "#A8A29E",
                              marginLeft: 5,
                            }}
                          >
                            ({Math.round((value / total) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Leads Section ────────────────────────────────────────────────────────────

interface LeadsSectionProps {
  leads: Lead[];
  activeEntry: string | null;
  showLeadForm: boolean;
  newLead: LeadForm;
  onToggleForm: () => void;
  onCancelForm: () => void;
  onLeadFormChange: (key: keyof LeadForm, value: string) => void;
  onSaveLead: () => void;
  onDeleteLead: (id: string) => void;
  onUpdateLeadStatus: (id: string, newStatus: string, oldStatus: string) => void;
}

function LeadsSection({
  leads,
  activeEntry,
  showLeadForm,
  newLead,
  onToggleForm,
  onCancelForm,
  onLeadFormChange,
  onSaveLead,
  onDeleteLead,
  onUpdateLeadStatus,
}: LeadsSectionProps) {
  const leadFormFields: [string, keyof LeadForm, string, string][] = [
    ["Lead Name *", "name", "text", ""],
    ["Location", "location", "text", ""],
    ["Expected Volume", "expected_volume", "number", ""],
    ["Expected Revenue (₹)", "expected_revenue", "number", ""],
    ["Cycle Label", "cycle_label", "text", "e.g. Q1 2025"],
  ];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E7E5E4",
        borderRadius: 10,
        padding: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h3 style={{ fontSize: 13.5, fontWeight: 600, color: "#1C1917" }}>
          Lead Details{" "}
          <span style={{ fontSize: 12, color: "#A8A29E", fontWeight: 400 }}>
            ({leads.length} total)
          </span>
        </h3>
        <button
          onClick={onToggleForm}
          className="btn-primary"
          style={{ padding: "5px 12px", fontSize: 12 }}
        >
          <Plus size={12} /> Add Lead
        </button>
      </div>

      {/* Add Lead Form */}
      {showLeadForm && (
        <div
          style={{
            background: "#F9F8F7",
            border: "1px solid #E7E5E4",
            borderRadius: 8,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            {leadFormFields.map(([label, key, type, placeholder]) => (
              <div key={key}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: "#78716C",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </label>
                <input
                  className="input"
                  type={type}
                  value={newLead[key]}
                  onChange={(e) => onLeadFormChange(key, e.target.value)}
                  placeholder={placeholder}
                  style={{ fontSize: 13 }}
                />
              </div>
            ))}

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: "#78716C",
                  marginBottom: 4,
                }}
              >
                Status
              </label>
              <select
                className="input"
                value={newLead.status}
                onChange={(e) => onLeadFormChange("status", e.target.value)}
                style={{ fontSize: 13 }}
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            className="input"
            rows={2}
            placeholder="Notes..."
            value={newLead.notes}
            onChange={(e) => onLeadFormChange("notes", e.target.value)}
            style={{ resize: "none", fontSize: 13, marginBottom: 10 }}
          />

          <div
            style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
          >
            <button
              onClick={onCancelForm}
              className="btn-secondary"
              style={{ fontSize: 12 }}
            >
              Cancel
            </button>
            <button
              onClick={onSaveLead}
              className="btn-primary"
              style={{ fontSize: 12 }}
            >
              Save Lead
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {leads.length === 0 ? (
        <p
          style={{
            fontSize: 12.5,
            color: "#A8A29E",
            textAlign: "center",
            padding: "16px 0",
          }}
        >
          No leads yet.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #F5F4F0" }}>
                {[
                  "Lead",
                  "Period",
                  "Location",
                  "Volume",
                  "Revenue",
                  "Status",
                  "Cycle",
                  "Updated",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "0 8px 8px 0",
                      fontSize: 11.5,
                      fontWeight: 500,
                      color: "#A8A29E",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  activeEntry={activeEntry}
                  onDelete={onDeleteLead}
                  onUpdateStatus={onUpdateLeadStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Lead Row ─────────────────────────────────────────────────────────────────

interface LeadRowProps {
  lead: Lead;
  activeEntry: string | null;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: string, oldStatus: string) => void;
}

function LeadRow({ lead, activeEntry, onDelete, onUpdateStatus }: LeadRowProps) {
  const periodLabel = () => {
    if (!lead.data_entry_id) {
      return <span style={{ color: "#D6D3D1" }}>—</span>;
    }
    if (lead.data_entry_id === activeEntry) {
      return (
        <span
          style={{
            background: "#DBEAFE",
            color: "#1D4ED8",
            padding: "1px 6px",
            borderRadius: 5,
            fontWeight: 500,
          }}
        >
          This period
        </span>
      );
    }
    return (
      <span
        style={{
          background: "#F5F4F0",
          color: "#78716C",
          padding: "1px 6px",
          borderRadius: 5,
        }}
      >
        Other period
      </span>
    );
  };

  return (
    <tr
      style={{
        borderBottom: "1px solid #FAFAF9",
        background: lead.is_updated_this_cycle ? "#FFFBEB" : "transparent",
      }}
    >
      {/* Name */}
      <td style={{ padding: "9px 8px 9px 0", fontWeight: 500, color: "#1C1917" }}>
        {lead.name}
        {lead.is_updated_this_cycle && (
          <span
            style={{
              marginLeft: 5,
              fontSize: 10,
              background: "#FEF3C7",
              color: "#92400E",
              padding: "1px 5px",
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            ↑
          </span>
        )}
      </td>

      {/* Period */}
      <td style={{ padding: "9px 8px 9px 0", fontSize: 11.5 }}>
        {periodLabel()}
      </td>

      {/* Location */}
      <td style={{ padding: "9px 8px 9px 0", color: "#78716C", fontSize: 12 }}>
        {lead.location ?? "—"}
      </td>

      {/* Volume */}
      <td style={{ padding: "9px 8px 9px 0", color: "#78716C", fontSize: 12 }}>
        {lead.expected_volume ?? "—"}
      </td>

      {/* Revenue */}
      <td
        style={{
          padding: "9px 8px 9px 0",
          fontWeight: 500,
          color: "#1C1917",
          fontSize: 12,
        }}
      >
        {lead.expected_revenue ? fmtINR(lead.expected_revenue) : "—"}
      </td>

      {/* Status */}
      <td style={{ padding: "9px 8px 9px 0" }}>
        <select
          value={lead.status}
          onChange={(e) => onUpdateStatus(lead.id, e.target.value, lead.status)}
          style={{
            appearance: "none",
            padding: "3px 8px",
            borderRadius: 8,
            fontSize: 11.5,
            fontWeight: 600,
            background: `${STATUS_COLOR[lead.status]}18`,
            color: STATUS_COLOR[lead.status],
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </td>

      {/* Cycle */}
      <td style={{ padding: "9px 8px 9px 0", color: "#A8A29E", fontSize: 12 }}>
        {lead.cycle_label ?? "—"}
      </td>

      {/* Status Change */}
      <td style={{ padding: "9px 8px 9px 0", fontSize: 12, color: "#78716C" }}>
        {lead.previous_status && lead.previous_status !== lead.status ? (
          <span>
            {lead.previous_status} → <strong>{lead.status}</strong>
          </span>
        ) : (
          "—"
        )}
      </td>

      {/* Delete */}
      <td style={{ padding: "9px 0" }}>
        <button
          onClick={() => onDelete(lead.id)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "3px 5px",
            borderRadius: 5,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "#FEE2E2")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Trash2 size={13} color="#EF4444" />
        </button>
      </td>
    </tr>
  );
}
