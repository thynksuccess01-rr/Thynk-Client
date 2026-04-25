"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown } from "lucide-react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

const TIMELINES = [
  { label: "Today", days: 1 }, { label: "Last 5 Days", days: 5 },
  { label: "Last 15 Days", days: 15 }, { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 }, { label: "Last 180 Days", days: 180 },
  { label: "Current Year", days: 365 },
];
const TABS = ["Summary", "Campaigns", "Leads", "Revenue", "Reports"];

const fmt = (n: number) =>
  n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n ?? 0);
const fmtINR = (n: number) =>
  `\u20b9${n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : (n ?? 0)}`;
const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const CHART_COLORS = { email: "#3B82F6", wa: "#10B981", calls: "#E8611A" };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1C1917", borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
      <p style={{ color: "#A8A29E", fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, fontSize: 12.5, fontWeight: 600 }}>
          {p.name}: {typeof p.value === "number" && p.name === "Revenue" ? fmtINR(p.value) : fmt(p.value)}
        </p>
      ))}
    </div>
  );
};
const ChartLegend = ({ items }: { items: [string, string][] }) => (
  <div style={{ display: "flex", gap: 14 }}>
    {items.map(([label, color]) => (
      <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#78716C" }}>
        <span style={{ width: 18, height: 2.5, borderRadius: 2, background: color, display: "inline-block" }} />{label}
      </span>
    ))}
  </div>
);
const RateGauge = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto 6px" }}>
      <svg viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="32" cy="32" r="26" fill="none" stroke="#F0EEEC" strokeWidth="7" />
        <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${(value / 100) * 163.4} 163.4`} strokeLinecap="round" />
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color }}>{value}%</span>
    </div>
    <p style={{ fontSize: 11, color: "#78716C", fontWeight: 500 }}>{label}</p>
  </div>
);

export default function PortalDashboard() {
  const [client, setClient] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selProduct, setSelProduct] = useState("all");
  const [timeline, setTimeline] = useState(30);
  const [tab, setTab] = useState("Summary");
  const [campChan, setCampChan] = useState("Email Campaign");
  const [entries, setEntries] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("client_id,clients(*)").eq("id", user.id).single();
      if (!p?.client_id) return;
      setClientId(p.client_id); setClient(p.clients);
      const { data: mp } = await supabase.from("client_products").select("products(id,name)").eq("client_id", p.client_id);
      setProducts((mp ?? []).map((m: any) => m.products).filter(Boolean));
    }
    init();
  }, []);

  const load = useCallback(async () => {
    if (!clientId) return;
    const since = new Date(); since.setDate(since.getDate() - timeline);
    const s = since.toISOString().split("T")[0];
    const [e, u, l] = await Promise.all([
      supabase.from("data_entries").select("*").eq("client_id", clientId).gte("period_start", s).order("period_start"),
      supabase.from("campaign_updates").select("*").eq("client_id", clientId).gte("update_date", s).order("update_date"),
      supabase.from("leads").select("*, data_entries(period_start,period_end,entry_label)").eq("client_id", clientId).order("created_at", { ascending: false }),
    ]);
    setEntries(e.data ?? []); setUpdates(u.data ?? []); setLeads(l.data ?? []);
  }, [clientId, timeline]);

  useEffect(() => { if (clientId) load(); }, [load]);

  const accent = client?.accent_color ?? "#E8611A";
  const primary = client?.primary_color ?? "#1C1917";

  const emailUpds = updates.filter((u) => u.channel === "email");
  const waUpds = updates.filter((u) => u.channel === "whatsapp");
  const callUpds = updates.filter((u) => u.channel === "calls");

  const emailSent = entries.reduce((s, e) => s + e.email_sent, 0) + emailUpds.reduce((s, u) => s + u.email_sent, 0);
  const emailOpened = entries.reduce((s, e) => s + e.email_opened, 0) + emailUpds.reduce((s, u) => s + u.email_opened, 0);
  const emailClicked = entries.reduce((s, e) => s + e.email_clicked, 0) + emailUpds.reduce((s, u) => s + u.email_clicked, 0);
  const waSent = entries.reduce((s, e) => s + e.whatsapp_sent, 0) + waUpds.reduce((s, u) => s + u.whatsapp_sent, 0);
  const waDelivered = entries.reduce((s, e) => s + e.whatsapp_delivered, 0) + waUpds.reduce((s, u) => s + u.whatsapp_delivered, 0);
  const waReplied = entries.reduce((s, e) => s + e.whatsapp_replied, 0) + waUpds.reduce((s, u) => s + u.whatsapp_replied, 0);
  const callsMade = entries.reduce((s, e) => s + e.calls_made, 0) + callUpds.reduce((s, u) => s + u.calls_made, 0);
  const callsConnected = entries.reduce((s, e) => s + e.calls_connected, 0) + callUpds.reduce((s, u) => s + u.calls_connected, 0);
  const callsConverted = entries.reduce((s, e) => s + e.calls_converted, 0) + callUpds.reduce((s, u) => s + u.calls_converted, 0);
  const totalRev = entries.reduce((s, e) => s + (e.total_revenue_collected ?? 0), 0);
  const expectedRev = entries.reduce((s, e) => s + (e.expected_collection ?? 0), 0);
  const totalLic = entries.reduce((s, e) => s + (e.total_licences ?? 0), 0);
  const wonLeads = leads.filter((l) => l.status === "won").length;
  // Revenue actually collected across leads (lead-level, more granular than period entry)
  const totalLeadRevCollected = leads.reduce((s, l) => s + (l.revenue_collected ?? 0), 0);
  const activeLeads = leads.filter((l) => !["won", "lost"].includes(l.status)).length;
  const lostLeads = leads.filter((l) => l.status === "lost").length;
  const updatedLeads = leads.filter((l) => l.is_updated_this_cycle).length;

  const periodChartData = entries.slice(-10).map((e) => {
    const pu = updates.filter((u) => u.update_date >= e.period_start && u.update_date <= e.period_end);
    return {
      name: e.entry_label || new Date(e.period_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      Email: e.email_sent + pu.filter((u:any)=>u.channel==="email").reduce((s:number,u:any)=>s+u.email_sent,0),
      WA: e.whatsapp_sent + pu.filter((u:any)=>u.channel==="whatsapp").reduce((s:number,u:any)=>s+u.whatsapp_sent,0),
      Calls: e.calls_made + pu.filter((u:any)=>u.channel==="calls").reduce((s:number,u:any)=>s+u.calls_made,0),
      Revenue: e.total_revenue_collected ?? 0,
      Licences: e.total_licences ?? 0,
    };
  });

  const leadStatusData = [
    { name: "New", value: leads.filter((l) => l.status === "new").length, color: "#3B82F6" },
    { name: "Contacted", value: leads.filter((l) => l.status === "contacted").length, color: "#F59E0B" },
    { name: "Qualified", value: leads.filter((l) => l.status === "qualified").length, color: "#F97316" },
    { name: "Proposal", value: leads.filter((l) => l.status === "proposal").length, color: "#8B5CF6" },
    { name: "Negotiation", value: leads.filter((l) => l.status === "negotiation").length, color: "#EC4899" },
    { name: "Won", value: wonLeads, color: "#16A34A" },
    { name: "Lost", value: lostLeads, color: "#EF4444" },
  ].filter((d) => d.value > 0);

  const rateRadarData = [
    { metric: "Open Rate", value: rate(emailOpened, emailSent), fullMark: 100 },
    { metric: "Click Rate", value: rate(emailClicked, emailSent), fullMark: 100 },
    { metric: "WA Delivery", value: rate(waDelivered, waSent), fullMark: 100 },
    { metric: "WA Reply", value: rate(waReplied, waSent), fullMark: 100 },
    { metric: "Call Connect", value: rate(callsConnected, callsMade), fullMark: 100 },
    { metric: "Conversion", value: rate(callsConverted, callsMade), fullMark: 100 },
  ];

  const Card = ({ icon, label, value, sub, color }: any) => (
    <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <p style={{ fontSize: 10.5, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</p>
      <p style={{ fontSize: 11.5, color: "#A8A29E" }}>{sub}</p>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1C1917" }}>
            {client?.name ?? ""} <span style={{ color: accent }}>Dashboard</span>
          </h1>
          <p style={{ fontSize: 13, color: "#78716C", marginTop: 2 }}>
            {entries.length} periods \u00b7 {leads.length} leads \u00b7 {fmtINR(totalRev)} collected
            {updatedLeads > 0 && <span style={{ marginLeft: 8, fontSize: 11, background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>{updatedLeads} LEADS UPDATED</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {products.length > 1 && (
            <div style={{ position: "relative" }}>
              <select value={selProduct} onChange={(e) => setSelProduct(e.target.value)}
                style={{ appearance: "none", padding: "8px 32px 8px 12px", background: "#fff", border: "1px solid #E7E5E4", borderRadius: 8, fontSize: 13, color: "#1C1917", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                <option value="all">All Products</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#78716C" }} />
            </div>
          )}
          <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #E7E5E4", borderRadius: 8, padding: 3 }}>
            {TIMELINES.map((t) => (
              <button key={t.days} onClick={() => setTimeline(t.days)}
                style={{ padding: "5px 10px", fontSize: 11.5, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, borderRadius: 6, background: timeline === t.days ? primary : "transparent", color: timeline === t.days ? "#fff" : "#78716C", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E7E5E4", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "10px 20px", fontSize: 13.5, fontWeight: 600, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: tab === t ? accent : "#78716C", borderBottom: tab === t ? `2px solid ${accent}` : "2px solid transparent", marginBottom: -2, transition: "all 0.15s" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Summary" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 10, marginBottom: 20 }}>
            <Card icon="\ud83d\udce7" label="Emails Sent" value={fmt(emailSent)} sub={`${rate(emailOpened, emailSent)}% opened`} color="#2563EB" />
            <Card icon="\ud83d\udc41\ufe0f" label="Opened" value={fmt(emailOpened)} sub={`${rate(emailClicked, emailOpened)}% clicked`} color="#6366F1" />
            <Card icon="\ud83d\udcac" label="WhatsApp" value={fmt(waSent)} sub={`${rate(waDelivered, waSent)}% delivered`} color="#16A34A" />
            <Card icon="\u21a9\ufe0f" label="WA Replied" value={fmt(waReplied)} sub={`${rate(waReplied, waSent)}% rate`} color="#0891B2" />
            <Card icon="\ud83d\udcde" label="Calls" value={fmt(callsMade)} sub={`${rate(callsConnected, callsMade)}% connected`} color="#7C3AED" />
            <Card icon="\ud83c\udfaf" label="Total Leads" value={leads.length} sub={`${wonLeads} won`} color={accent} />
            <Card icon="\u20b9" label="Collected" value={fmtINR(totalRev)} sub={`${fmtINR(expectedRev)} expected`} color="#D97706" />
            <Card icon="\ud83d\udce6" label="Licences" value={fmt(totalLic)} sub="units sold" color="#BE185D" />
          </div>

          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: "18px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#A8A29E", letterSpacing: "0.08em", marginBottom: 4 }}>PERFORMANCE RATES</p>
              <p style={{ fontSize: 11.5, color: "#78716C" }}>Key conversion metrics across all channels</p>
            </div>
            <div style={{ display: "flex", gap: 24, flex: 1, justifyContent: "flex-end" }}>
              <RateGauge label="Open Rate" value={rate(emailOpened, emailSent)} color="#3B82F6" />
              <RateGauge label="Click Rate" value={rate(emailClicked, emailSent)} color="#6366F1" />
              <RateGauge label="WA Delivery" value={rate(waDelivered, waSent)} color="#10B981" />
              <RateGauge label="WA Reply" value={rate(waReplied, waSent)} color="#0891B2" />
              <RateGauge label="Call Connect" value={rate(callsConnected, callsMade)} color="#7C3AED" />
              <RateGauge label="Converted" value={rate(callsConverted, callsMade)} color={accent} />
              <RateGauge label="Lead Win" value={rate(wonLeads, leads.length)} color="#16A34A" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917" }}>\ud83d\udcca Campaign Activity by Period</p>
                  <p style={{ fontSize: 11.5, color: "#A8A29E", marginTop: 2 }}>Email, WhatsApp & Calls volume</p>
                </div>
                <ChartLegend items={[["Email", CHART_COLORS.email], ["WA", CHART_COLORS.wa], ["Calls", CHART_COLORS.calls]]} />
              </div>
              {periodChartData.length === 0 ? (
                <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#A8A29E", fontSize: 13 }}>No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={periodChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: "#A8A29E" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#A8A29E" }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="Email" stroke={CHART_COLORS.email} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.email, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="WA" stroke={CHART_COLORS.wa} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.wa, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="Calls" stroke={CHART_COLORS.calls} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.calls, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", marginBottom: 4 }}>\ud83c\udfaf Lead Status Distribution</p>
              <p style={{ fontSize: 11.5, color: "#A8A29E", marginBottom: 14 }}>{leads.length} total leads</p>
              {leadStatusData.length === 0 ? (
                <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "#A8A29E", fontSize: 13 }}>No leads</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={leadStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                        {leadStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#1C1917", border: "none", borderRadius: 8, color: "#F5F4F0", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 8 }}>
                    {leadStatusData.map((d) => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: "inline-block", flexShrink: 0 }} />
                        <span style={{ color: "#57534E", flex: 1 }}>{d.name}</span>
                        <span style={{ fontWeight: 700, color: "#1C1917" }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917" }}>\ud83d\udcb0 Revenue & Licences by Period</p>
                  <p style={{ fontSize: 11.5, color: "#A8A29E", marginTop: 2 }}>Collected revenue and licence count</p>
                </div>
                <ChartLegend items={[["Revenue", accent], ["Licences", "#0891B2"]]} />
              </div>
              {periodChartData.length === 0 ? (
                <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#A8A29E", fontSize: 13 }}>No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={periodChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: "#A8A29E" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: "#A8A29E" }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => fmtINR(v)} />
                    <YAxis yAxisId="lic" orientation="right" tick={{ fontSize: 10, fill: "#A8A29E" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line yAxisId="rev" type="monotone" dataKey="Revenue" stroke={accent} strokeWidth={2.5} dot={{ r: 4, fill: accent, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} name="Revenue" />
                    <Line yAxisId="lic" type="monotone" dataKey="Licences" stroke="#0891B2" strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 4, fill: "#0891B2", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} name="Licences" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", marginBottom: 4 }}>\ud83d\udce1 Channel Performance</p>
              <p style={{ fontSize: 11.5, color: "#A8A29E", marginBottom: 10 }}>Rate metrics (0\u201390%)</p>
              <ResponsiveContainer width="100%" height={190}>
                <RadarChart data={rateRadarData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <PolarGrid stroke="#F0EEEC" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#78716C" }} />
                  <Radar name="Rate" dataKey="value" stroke={accent} fill={accent} fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: "#1C1917", border: "none", borderRadius: 8, color: "#F5F4F0", fontSize: 12 }} formatter={(v: any) => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#A8A29E", letterSpacing: "0.08em", marginBottom: 16 }}>CAMPAIGN \u2192 CONVERSION FUNNEL</p>
            <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
              {[
                { icon: "\ud83d\udce7", label: "Emails Sent", value: emailSent, r: null, color: "#6366F1", bg: "#EEF2FF" },
                { icon: "\ud83d\udc41\ufe0f", label: "Opened", value: emailOpened, r: rate(emailOpened, emailSent), color: "#2563EB", bg: "#EFF6FF" },
                { icon: "\ud83d\udcac", label: "WA Delivered", value: waDelivered, r: rate(waDelivered, waSent), color: "#10B981", bg: "#ECFDF5" },
                { icon: "\u21a9\ufe0f", label: "WA Replied", value: waReplied, r: rate(waReplied, waSent), color: "#16A34A", bg: "#F0FDF4" },
                { icon: "\ud83d\udcde", label: "Connected", value: callsConnected, r: rate(callsConnected, callsMade), color: "#3B82F6", bg: "#EFF6FF" },
                { icon: "\ud83c\udfc6", label: "Won Leads", value: wonLeads, r: rate(wonLeads, leads.length), color: "#16A34A", bg: "#DCFCE7" },
              ].map(({ icon, label, value, r, color, bg }, i, arr) => (
                <div key={label} style={{ display: "flex", alignItems: "center", flex: 1, gap: 0 }}>
                  <div style={{ flex: 1, background: bg, border: `1px solid ${color}20`, borderRadius: 10, padding: "14px 10px", textAlign: "center", minWidth: 0 }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                    <p style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{fmt(value)}</p>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#1C1917", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
                    {r !== null && <p style={{ fontSize: 10.5, color: "#78716C", marginTop: 2 }}>{r}% rate</p>}
                  </div>
                  {i < arr.length - 1 && <span style={{ fontSize: 14, color: "#D6D3D1", flexShrink: 0, padding: "0 4px" }}>\u2192</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917" }}>
                \ud83d\udccb Recent Leads
                {updatedLeads > 0 && <span style={{ fontSize: 11, background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 8, fontWeight: 600, marginLeft: 8 }}>{updatedLeads} UPDATED</span>}
              </p>
            </div>
            {leads.length === 0 ? <p style={{ fontSize: 13, color: "#A8A29E", textAlign: "center", padding: "24px 0" }}>No leads yet</p> : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#FAFAF9", borderBottom: "1px solid #F0EEEC" }}>
                  {["Lead", "Period", "Status", "Location", "Revenue", "Cycle", "Change"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: 11.5, fontWeight: 600, color: "#A8A29E" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {leads.slice(0, 6).map((l) => {
                    const entry = l.data_entries;
                    return (
                      <tr key={l.id} style={{ borderBottom: "1px solid #FAFAF9", background: l.is_updated_this_cycle ? "#FFFBEB" : "transparent" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1C1917" }}>
                          {l.name}{l.is_updated_this_cycle && <span style={{ marginLeft: 5, fontSize: 10, background: "#FEF3C7", color: "#92400E", padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>\u2191</span>}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 12 }}>
                          {entry ? <span style={{ background: "#EEF2FF", color: "#4338CA", padding: "2px 7px", borderRadius: 6, fontSize: 11.5, fontWeight: 500 }}>{entry.entry_label || new Date(entry.period_start).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span> : <span style={{ color: "#D6D3D1" }}>\u2014</span>}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 10, fontWeight: 600, background: l.status === "won" ? "#DCFCE7" : l.status === "lost" ? "#FEE2E2" : "#EEF2FF", color: l.status === "won" ? "#15803D" : l.status === "lost" ? "#B91C1C" : "#4338CA" }}>
                            {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#78716C", fontSize: 12.5 }}>{l.location ?? "\u2014"}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#16A34A" }}>{l.expected_revenue ? fmtINR(l.expected_revenue) : "\u2014"}</td>
                        <td style={{ padding: "10px 12px", color: "#A8A29E", fontSize: 12 }}>{l.cycle_label ?? "\u2014"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12 }}>
                          {l.previous_status && l.previous_status !== l.status ? (
                            <span>
                              <span style={{ background: "#FEE2E2", color: "#B91C1C", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>{l.previous_status}</span>
                              {" \u2192 "}
                              <span style={{ background: "#DCFCE7", color: "#15803D", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>{l.status}</span>
                            </span>
                          ) : <span style={{ color: "#D6D3D1" }}>\u2014</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === "Campaigns" && (() => {
        const CAMP_CHANNELS = ["Email Campaign", "WhatsApp Campaign", "Calls"];
        const emailPD = entries.map((e) => { const eu = updates.filter((u) => u.channel === "email" && u.update_date >= e.period_start && u.update_date <= e.period_end); return { name: e.entry_label || new Date(e.period_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" }), Sent: e.email_sent + eu.reduce((s: number, u: any) => s + u.email_sent, 0), Opened: e.email_opened + eu.reduce((s: number, u: any) => s + u.email_opened, 0), Clicked: e.email_clicked + eu.reduce((s: number, u: any) => s + u.email_clicked, 0) }; });
        const waPD = entries.map((e) => { const wu = updates.filter((u) => u.channel === "whatsapp" && u.update_date >= e.period_start && u.update_date <= e.period_end); return { name: e.entry_label || new Date(e.period_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" }), Sent: e.whatsapp_sent + wu.reduce((s: number, u: any) => s + u.whatsapp_sent, 0), Delivered: e.whatsapp_delivered + wu.reduce((s: number, u: any) => s + u.whatsapp_delivered, 0), Replied: e.whatsapp_replied + wu.reduce((s: number, u: any) => s + u.whatsapp_replied, 0) }; });
        const callsPD = entries.map((e) => { const cu = updates.filter((u) => u.channel === "calls" && u.update_date >= e.period_start && u.update_date <= e.period_end); return { name: e.entry_label || new Date(e.period_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" }), Made: e.calls_made + cu.reduce((s: number, u: any) => s + u.calls_made, 0), Connected: e.calls_connected + cu.reduce((s: number, u: any) => s + u.calls_connected, 0), Converted: e.calls_converted + cu.reduce((s: number, u: any) => s + u.calls_converted, 0) }; });
        const CC: Record<string, any> = {
          "Email Campaign": { icon: "\ud83d\udce7", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", stats: [["Sent", emailSent], ["Opened", emailOpened], ["Clicked", emailClicked], ["Open Rate", `${rate(emailOpened, emailSent)}%`], ["Click Rate", `${rate(emailClicked, emailSent)}%`]], rateA: rate(emailOpened, emailSent), rateB: rate(emailClicked, emailSent), pd: emailPD, lines: [["Sent", "#6366F1"], ["Opened", "#2563EB"], ["Clicked", "#0891B2"]] },
          "WhatsApp Campaign": { icon: "\ud83d\udcac", color: "#16A34A", bg: "#F0FDF4", border: "#A7F3D0", stats: [["Sent", waSent], ["Delivered", waDelivered], ["Replied", waReplied], ["Delivery Rate", `${rate(waDelivered, waSent)}%`], ["Reply Rate", `${rate(waReplied, waSent)}%`]], rateA: rate(waDelivered, waSent), rateB: rate(waReplied, waSent), pd: waPD, lines: [["Sent", "#6EE7B7"], ["Delivered", "#10B981"], ["Replied", "#059669"]] },
          "Calls": { icon: "\ud83d\udcde", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", stats: [["Made", callsMade], ["Connected", callsConnected], ["Converted", callsConverted], ["Connect Rate", `${rate(callsConnected, callsMade)}%`], ["Conversion", `${rate(callsConverted, callsMade)}%`]], rateA: rate(callsConnected, callsMade), rateB: rate(callsConverted, callsMade), pd: callsPD, lines: [["Made", "#C4B5FD"], ["Connected", "#8B5CF6"], ["Converted", "#6D28D9"]] },
        };
        const cfg = CC[campChan];
        return (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {CAMP_CHANNELS.map((ch) => { const active = campChan === ch; return (<button key={ch} onClick={() => setCampChan(ch)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: active ? `2px solid ${CC[ch].color}` : "2px solid #E7E5E4", background: active ? CC[ch].bg : "#fff", color: active ? CC[ch].color : "#78716C", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}><span style={{ fontSize: 17 }}>{CC[ch].icon}</span>{ch}</button>); })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 16 }}>
              <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ background: cfg.bg, padding: "16px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${cfg.border}` }}><span style={{ fontSize: 24 }}>{cfg.icon}</span><p style={{ fontSize: 15, fontWeight: 700, color: cfg.color }}>{campChan}</p></div>
                <div style={{ padding: 20 }}>
                  {cfg.stats.map(([l, v]: any) => (<div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F5F4F0" }}><span style={{ fontSize: 13, color: "#78716C" }}>{l}</span><span style={{ fontSize: 16, fontWeight: 800, color: cfg.color }}>{typeof v === "number" ? fmt(v) : v}</span></div>))}
                  <div style={{ marginTop: 16, display: "flex", gap: 14, justifyContent: "center" }}><RateGauge label={cfg.stats[3][0]} value={cfg.rateA} color={cfg.color} /><RateGauge label={cfg.stats[4][0]} value={cfg.rateB} color={cfg.color} /></div>
                </div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div><p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917" }}>\ud83d\udcca {campChan} \u2014 Period Breakdown</p><p style={{ fontSize: 11.5, color: "#A8A29E", marginTop: 2 }}>Data by period label</p></div>
                  <ChartLegend items={cfg.lines} />
                </div>
                {cfg.pd.length === 0 ? <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#A8A29E", fontSize: 13 }}>No data</div> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={cfg.pd} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: "#A8A29E" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#A8A29E" }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip content={<CustomTooltip />} />
                      {cfg.lines.map(([key, color]: any) => (<Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2.5} dot={{ r: 4, fill: color, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} />))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {tab === "Leads" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
            {[{ icon: "\ud83d\udce5", label: "Total", value: leads.length, color: "#6366F1" }, { icon: "\ud83d\udd35", label: "New", value: leads.filter((l) => l.status === "new").length, color: "#3B82F6" }, { icon: "\ud83d\udfe1", label: "In Progress", value: activeLeads, color: "#F59E0B" }, { icon: "\u2705", label: "Won", value: wonLeads, color: "#16A34A" }, { icon: "\u274c", label: "Lost", value: lostLeads, color: "#EF4444" }].map(({ icon, label, value, color }) => (
              <div key={label} style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 18, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                <p style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 12.5, color: "#78716C", marginTop: 6, fontWeight: 600 }}>{label}</p>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", marginBottom: 14 }}>\ud83d\udccb All Leads</p>
            {leads.length === 0 ? <p style={{ textAlign: "center", color: "#A8A29E", padding: "40px 0", fontSize: 13 }}>No leads yet</p> : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#FAFAF9", borderBottom: "1px solid #F0EEEC" }}>
                  {["Lead", "Period", "Status", "Location", "Revenue", "Cycle", "Status Change"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: 11.5, fontWeight: 600, color: "#A8A29E" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {leads.map((l) => {
                    const entry = l.data_entries;
                    return (
                      <tr key={l.id} style={{ borderBottom: "1px solid #FAFAF9", background: l.is_updated_this_cycle ? "#FFFBEB" : "transparent" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1C1917" }}>{l.name}{l.is_updated_this_cycle && <span style={{ marginLeft: 5, fontSize: 10, background: "#FEF3C7", color: "#92400E", padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>\u2191</span>}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12 }}>{entry ? <span style={{ background: "#EEF2FF", color: "#4338CA", padding: "2px 7px", borderRadius: 6, fontSize: 11.5, fontWeight: 500 }}>{entry.entry_label || new Date(entry.period_start).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span> : <span style={{ color: "#D6D3D1" }}>\u2014</span>}</td>
                        <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 10, fontWeight: 600, background: l.status === "won" ? "#DCFCE7" : l.status === "lost" ? "#FEE2E2" : "#EEF2FF", color: l.status === "won" ? "#15803D" : l.status === "lost" ? "#B91C1C" : "#4338CA" }}>{l.status.charAt(0).toUpperCase() + l.status.slice(1)}</span></td>
                        <td style={{ padding: "10px 12px", color: "#78716C", fontSize: 12.5 }}>{l.location ?? "\u2014"}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#16A34A" }}>{l.expected_revenue ? fmtINR(l.expected_revenue) : "\u2014"}</td>
                        <td style={{ padding: "10px 12px", color: "#A8A29E", fontSize: 12 }}>{l.cycle_label ?? "\u2014"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12 }}>{l.previous_status && l.previous_status !== l.status ? <span><span style={{ background: "#FEE2E2", color: "#B91C1C", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>{l.previous_status}</span>{" \u2192 "}<span style={{ background: "#DCFCE7", color: "#15803D", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>{l.status}</span></span> : <span style={{ color: "#D6D3D1" }}>\u2014</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "Revenue" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { icon: "\u2705", label: "Collected", value: fmtINR(totalRev), color: "#16A34A" },
              { icon: "\ud83d\udd2e", label: "Expected", value: fmtINR(expectedRev), color: "#D97706" },
              { icon: "\ud83d\udce6", label: "Licences", value: totalLic.toLocaleString("en-IN"), color: "#0891B2" },
              { icon: "\ud83c\udfc6", label: "Won Revenue", value: fmtINR(leads.filter(l => l.status === "won").reduce((s, l) => s + (l.expected_revenue ?? 0), 0)), color: "#16A34A" },
            ].map(({ icon, label, value, color }) => (
              <div key={label} style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                <p style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 12.5, color: "#78716C", marginTop: 8, fontWeight: 600 }}>{label}</p>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", marginBottom: 16 }}>\ud83d\udcb0 Revenue Timeline by Period</p>
            {periodChartData.length === 0 ? <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#A8A29E", fontSize: 13 }}>No data</div> : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={periodChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#A8A29E" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#A8A29E" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => fmtINR(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Revenue" stroke="#16A34A" strokeWidth={3} dot={{ r: 5, fill: "#16A34A", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 7 }} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", marginBottom: 14 }}>\ud83d\udccb Period Revenue Breakdown</p>
            {entries.length === 0 ? <p style={{ color: "#A8A29E", fontSize: 13, textAlign: "center", padding: "24px 0" }}>No periods found</p> : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#FAFAF9", borderBottom: "1px solid #F0EEEC" }}>
                  {["Period", "Label", "Collected", "Expected", "Licences", "Collection %"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: 11.5, fontWeight: 600, color: "#A8A29E" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {entries.map((e) => {
                    const pct = rate(e.total_revenue_collected ?? 0, e.expected_collection ?? 1);
                    return (
                      <tr key={e.id} style={{ borderBottom: "1px solid #FAFAF9" }}>
                        <td style={{ padding: "10px 12px", color: "#78716C", fontSize: 12 }}>{e.period_start} \u2013 {e.period_end}</td>
                        <td style={{ padding: "10px 12px" }}><span style={{ background: "#EEF2FF", color: "#4338CA", padding: "2px 8px", borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>{e.entry_label || "\u2014"}</span></td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#16A34A" }}>{fmtINR(e.total_revenue_collected ?? 0)}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#D97706" }}>{fmtINR(e.expected_collection ?? 0)}</td>
                        <td style={{ padding: "10px 12px", color: "#0891B2", fontWeight: 600 }}>{(e.total_licences ?? 0).toLocaleString("en-IN")}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: "#F0EEEC", borderRadius: 3 }}>
                              <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: pct >= 100 ? "#16A34A" : pct >= 70 ? "#D97706" : "#EF4444", borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? "#16A34A" : pct >= 70 ? "#D97706" : "#EF4444", minWidth: 36 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "Reports" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", marginBottom: 16 }}>\ud83d\udcc8 Campaign Trend</p>
            {periodChartData.length === 0 ? <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#A8A29E", fontSize: 13 }}>No data</div> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={periodChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#A8A29E" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#A8A29E" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Email" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="WA" stroke="#10B981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Calls" stroke={accent} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", marginBottom: 16 }}>\ud83d\udcb0 Revenue Timeline</p>
            {periodChartData.length === 0 ? <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#A8A29E", fontSize: 13 }}>No data</div> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={periodChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F4F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#A8A29E" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#A8A29E" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => fmtINR(v)} />
                  <Tooltip contentStyle={{ background: "#1C1917", border: "none", borderRadius: 8, color: "#F5F4F0", fontSize: 12 }} formatter={(v: any) => fmtINR(v)} />
                  <Line type="monotone" dataKey="Revenue" stroke="#16A34A" strokeWidth={3} dot={{ r: 4, fill: "#16A34A" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 20, gridColumn: "span 2" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", marginBottom: 16 }}>\ud83d\uddc2\ufe0f Period Summary Table</p>
            {entries.length === 0 ? <p style={{ color: "#A8A29E", fontSize: 13, textAlign: "center", padding: "24px 0" }}>No periods</p> : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#FAFAF9", borderBottom: "1px solid #F0EEEC" }}>
                  {["Period", "Email Sent", "WA Sent", "Calls", "Revenue", "Licences", "Leads"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: 11.5, fontWeight: 600, color: "#A8A29E" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {entries.map((e) => {
                    const pu = updates.filter((u) => u.update_date >= e.period_start && u.update_date <= e.period_end);
                    const periodLeads = leads.filter((l) => l.data_entry_id === e.id);
                    return (
                      <tr key={e.id} style={{ borderBottom: "1px solid #FAFAF9" }}>
                        <td style={{ padding: "10px 12px" }}><span style={{ background: "#EEF2FF", color: "#4338CA", padding: "2px 8px", borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>{e.entry_label || e.period_start}</span></td>
                        <td style={{ padding: "10px 12px", color: "#2563EB", fontWeight: 600 }}>{fmt(e.email_sent + pu.filter((u: any) => u.channel === "email").reduce((s: number, u: any) => s + u.email_sent, 0))}</td>
                        <td style={{ padding: "10px 12px", color: "#16A34A", fontWeight: 600 }}>{fmt(e.whatsapp_sent + pu.filter((u: any) => u.channel === "whatsapp").reduce((s: number, u: any) => s + u.whatsapp_sent, 0))}</td>
                        <td style={{ padding: "10px 12px", color: "#7C3AED", fontWeight: 600 }}>{fmt(e.calls_made + pu.filter((u: any) => u.channel === "calls").reduce((s: number, u: any) => s + u.calls_made, 0))}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#16A34A" }}>{fmtINR(e.total_revenue_collected ?? 0)}</td>
                        <td style={{ padding: "10px 12px", color: "#0891B2", fontWeight: 600 }}>{e.total_licences ?? 0}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: accent }}>{periodLeads.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
