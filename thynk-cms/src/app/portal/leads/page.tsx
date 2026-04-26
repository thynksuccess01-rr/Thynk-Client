"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Download, MapPin, Phone, Mail, User, TrendingUp, CheckCircle, XCircle, Clock, DollarSign, Package } from "lucide-react";

const STATUS_META: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  new:         { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE", dot: "#6366F1" },
  contacted:   { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", dot: "#F59E0B" },
  qualified:   { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA", dot: "#F97316" },
  proposal:    { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE", dot: "#8B5CF6" },
  negotiation: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A", dot: "#F59E0B" },
  won:         { bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0", dot: "#16A34A" },
  lost:        { bg: "#FEE2E2", text: "#B91C1C", border: "#FECACA", dot: "#EF4444" },
};

const fmtINR = (n: number) =>
  `₹${n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n}`;

const STATUSES = ["all", "new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

export default function PortalLeadsPage() {
  const [leads,   setLeads]   = useState<any[]>([]);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [accent,  setAccent]  = useState("#E8611A");
  const [primary, setPrimary] = useState("#1C1917");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("client_id, clients(accent_color,primary_color)").eq("id", user.id).single();
      if (!profile?.client_id) return;
      const clientData = Array.isArray(profile.clients) ? profile.clients[0] : profile.clients as { accent_color?: string; primary_color?: string } | null;
      if (clientData?.accent_color)  setAccent(clientData.accent_color);
      if (clientData?.primary_color) setPrimary(clientData.primary_color);
      const { data } = await supabase
        .from("leads")
        .select("*, data_entries(period_start, period_end, entry_label)")
        .eq("client_id", profile.client_id)
        .order("created_at", { ascending: false });
      setLeads(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = leads.filter(l => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.name.toLowerCase().includes(q) ||
        (l.location ?? "").toLowerCase().includes(q) ||
        (l.country  ?? "").toLowerCase().includes(q) ||
        (l.state    ?? "").toLowerCase().includes(q) ||
        (l.contact_person ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total:    leads.length,
    active:   leads.filter(l => !["won","lost"].includes(l.status)).length,
    won:      leads.filter(l => l.status === "won").length,
    lost:     leads.filter(l => l.status === "lost").length,
    wonRev:   leads.filter(l => l.status === "won").reduce((s,l) => s + (l.expected_revenue ?? 0), 0),
    pipeline: leads.filter(l => !["won","lost"].includes(l.status)).reduce((s,l) => s + (l.expected_revenue ?? 0), 0),
  };

  function exportCSV() {
    const rows = [
      ["Name","Status","Country","State","Location","Contact Person","Email","Phone","Expected Volume","Expected Revenue","Revenue Collected","Period","Cycle","Notes","Created"],
      ...leads.map(l => [
        l.name, l.status,
        l.country||"", l.state||"", l.location||"",
        l.contact_person||"", l.contact_email||"", l.contact_phone||"",
        l.expected_volume||"", l.expected_revenue||"", l.revenue_collected||"",
        l.data_entries?.entry_label || l.data_entries?.period_start || "",
        l.cycle_label||"", (l.notes||"").replace(/,/g,""),
        new Date(l.created_at).toLocaleDateString("en-IN"),
      ])
    ].map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(rows);
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1C1917", letterSpacing: "-0.02em" }}>
            Leads <span style={{ color: accent }}>Pipeline</span>
          </h1>
          <p style={{ fontSize: 13, color: "#78716C", marginTop: 4 }}>
            {leads.length} total leads · {stats.active} active · {fmtINR(stats.pipeline)} pipeline value
          </p>
        </div>
        <button
          onClick={exportCSV}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 10, border: "1px solid #E7E5E4", background: "#fff", color: "#1C1917", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { icon: <TrendingUp size={18}/>, label: "Total Leads",   value: stats.total,           color: "#6366F1", bg: "#EEF2FF" },
          { icon: <Clock size={18}/>,      label: "Active",        value: stats.active,          color: "#F59E0B", bg: "#FFFBEB" },
          { icon: <CheckCircle size={18}/>,label: "Won",           value: stats.won,             color: "#16A34A", bg: "#DCFCE7" },
          { icon: <XCircle size={18}/>,    label: "Lost",          value: stats.lost,            color: "#EF4444", bg: "#FEE2E2" },
          { icon: <DollarSign size={18}/>, label: "Won Revenue",   value: fmtINR(stats.wonRev),  color: "#16A34A", bg: "#F0FDF4" },
          { icon: <Package size={18}/>,    label: "Pipeline",      value: fmtINR(stats.pipeline),color: "#7C3AED", bg: "#F5F3FF" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 14, padding: "16px 14px", position: "relative", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, marginBottom: 10 }}>
              {s.icon}
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#A8A29E", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Pipeline Progress Bar ── */}
      <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 14, padding: "16px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#A8A29E", letterSpacing: "0.06em" }}>LEAD FUNNEL OVERVIEW</p>
          <p style={{ fontSize: 12, color: "#78716C" }}>{leads.length} total</p>
        </div>
        <div style={{ display: "flex", gap: 3, height: 8, borderRadius: 6, overflow: "hidden" }}>
          {STATUSES.filter(s => s !== "all").map(s => {
            const count = leads.filter(l => l.status === s).length;
            if (!count) return null;
            return (
              <div key={s} title={`${s}: ${count}`}
                style={{ flex: count, background: STATUS_META[s]?.dot, borderRadius: 2, minWidth: 4, transition: "flex 0.3s" }} />
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
          {STATUSES.filter(s => s !== "all").map(s => {
            const count = leads.filter(l => l.status === s).length;
            if (!count) return null;
            return (
              <span key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#57534E" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_META[s]?.dot, display: "inline-block" }} />
                {s.charAt(0).toUpperCase() + s.slice(1)} <strong style={{ color: "#1C1917" }}>{count}</strong>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#A8A29E" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, location, contact..."
            style={{ width: "100%", padding: "9px 14px 9px 34px", border: "1px solid #E7E5E4", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff", boxSizing: "border-box", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          />
        </div>
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #E7E5E4", borderRadius: 10, padding: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", flexWrap: "wrap" }}>
          {STATUSES.map(s => {
            const count = s === "all" ? leads.length : leads.filter(l => l.status === s).length;
            const active = filter === s;
            const meta = STATUS_META[s];
            return (
              <button key={s} onClick={() => setFilter(s)}
                style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", background: active ? (meta?.bg ?? primary) : "transparent", color: active ? (meta?.text ?? "#fff") : "#78716C", whiteSpace: "nowrap" }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.8 }}>({count})</span>
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 12.5, color: "#A8A29E", flexShrink: 0 }}>{filtered.length} leads</p>
      </div>

      {/* ── Lead Cards ── */}
      {loading ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: "80px 0", textAlign: "center", color: "#A8A29E", fontSize: 13, border: "1px solid #E7E5E4" }}>
          Loading leads...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: "80px 0", textAlign: "center", color: "#A8A29E", fontSize: 13, border: "1px solid #E7E5E4" }}>
          No leads found
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(l => {
            const meta = STATUS_META[l.status] ?? STATUS_META.new;
            const entry = l.data_entries;
            const daysSince = Math.floor((Date.now() - new Date(l.status_updated_at || l.created_at).getTime()) / 86400000);
            const isStale = !["won","lost"].includes(l.status) && daysSince > 30;

            return (
              <div key={l.id} style={{ background: "#fff", border: `1px solid ${isStale ? "#FDE68A" : "#E7E5E4"}`, borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "box-shadow 0.15s", position: "relative", overflow: "hidden" }}>
                {/* Left accent bar */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: meta.dot, borderRadius: "14px 0 0 14px" }} />

                <div style={{ paddingLeft: 8 }}>
                  {/* Top row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1C1917", margin: 0 }}>{l.name}</h3>
                        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: meta.bg, color: meta.text, border: `1px solid ${meta.border}` }}>
                          {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                        </span>
                        {l.is_updated_this_cycle && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: "#FEF3C7", color: "#92400E", padding: "2px 7px", borderRadius: 8 }}>↑ UPDATED</span>
                        )}
                        {isStale && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: "#FEF3C7", color: "#92400E", padding: "2px 7px", borderRadius: 8 }}>⏰ {daysSince}d stale</span>
                        )}
                        {l.cycle_label && (
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "#F5F4F0", color: "#78716C", fontWeight: 500 }}>{l.cycle_label}</span>
                        )}
                      </div>

                      {/* Location row */}
                      {(l.country || l.state || l.location) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#78716C", marginBottom: 6 }}>
                          <MapPin size={12} color="#A8A29E" />
                          {[l.country, l.state, l.location].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Revenue block */}
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 20 }}>
                      {l.expected_revenue > 0 && (
                        <div>
                          <p style={{ fontSize: 20, fontWeight: 800, color: l.status === "won" ? "#16A34A" : "#1C1917", lineHeight: 1 }}>
                            {fmtINR(l.expected_revenue)}
                          </p>
                          <p style={{ fontSize: 11, color: "#A8A29E", marginTop: 2 }}>expected revenue</p>
                        </div>
                      )}
                      {l.revenue_collected > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#16A34A" }}>{fmtINR(l.revenue_collected)}</p>
                          <p style={{ fontSize: 11, color: "#A8A29E" }}>collected</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom row — meta info */}
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                    {/* Contact person */}
                    {(l.contact_person || l.contact_email || l.contact_phone) && (
                      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "6px 12px", background: "#F9F8F7", borderRadius: 8, border: "1px solid #F0EEEC" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                          <User size={12} color="#A8A29E" />
                          <span style={{ fontWeight: 600, color: "#1C1917" }}>{l.contact_person || "—"}</span>
                        </div>
                        {l.contact_email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#78716C" }}>
                            <Mail size={11} color="#A8A29E" />
                            {l.contact_email}
                          </div>
                        )}
                        {l.contact_phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#78716C" }}>
                            <Phone size={11} color="#A8A29E" />
                            {l.contact_phone}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Volume */}
                    {l.expected_volume && (
                      <span style={{ fontSize: 12.5, color: "#78716C" }}>
                        <strong style={{ color: "#1C1917" }}>{l.expected_volume.toLocaleString("en-IN")}</strong> licences
                      </span>
                    )}

                    {/* Period tag */}
                    {entry && (
                      <span style={{ fontSize: 11.5, background: "#EEF2FF", color: "#4338CA", padding: "3px 9px", borderRadius: 8, fontWeight: 500 }}>
                        📅 {entry.entry_label || new Date(entry.period_start).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      </span>
                    )}

                    {/* Status change */}
                    {l.previous_status && l.previous_status !== l.status && (
                      <span style={{ fontSize: 12 }}>
                        <span style={{ background: "#FEE2E2", color: "#B91C1C", padding: "2px 6px", borderRadius: 5, fontSize: 11 }}>{l.previous_status}</span>
                        {" → "}
                        <span style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 6px", borderRadius: 5, fontSize: 11 }}>{l.status}</span>
                      </span>
                    )}

                    {/* Date */}
                    <span style={{ fontSize: 11.5, color: "#A8A29E", marginLeft: "auto" }}>
                      {new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  {/* Notes */}
                  {l.notes && (
                    <p style={{ fontSize: 12.5, color: "#78716C", marginTop: 10, lineHeight: 1.6, paddingTop: 10, borderTop: "1px solid #F5F4F0" }}>
                      {l.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
