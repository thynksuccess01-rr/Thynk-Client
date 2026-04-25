"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Mail, MessageCircle, Phone, Target, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";

export default function PortalDashboard() {
  const [client, setClient] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("client_id,clients(*)").eq("id", user.id).single();
      if (!profile?.client_id) return;
      setClient(profile.clients);
      const [e, l] = await Promise.all([
        supabase.from("data_entries").select("*").eq("client_id", profile.client_id).order("period_start", { ascending: true }).limit(12),
        supabase.from("leads").select("*").eq("client_id", profile.client_id).order("created_at", { ascending: false }),
      ]);
      setEntries(e.data ?? []);
      setLeads(l.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--portal-accent)" }} />
    </div>
  );

  const latest = entries[entries.length - 1];
  const prev = entries[entries.length - 2];

  function pct(curr: number, prev: number) {
    if (!prev) return null;
    return Math.round(((curr - prev) / prev) * 100);
  }

  const totalEmail = entries.reduce((s, e) => s + e.email_sent, 0);
  const totalWhatsapp = entries.reduce((s, e) => s + e.whatsapp_sent, 0);
  const totalCalls = entries.reduce((s, e) => s + e.calls_made, 0);
  const wonLeads = leads.filter(l => l.status === "won").length;
  const activeLeads = leads.filter(l => !["won","lost"].includes(l.status)).length;

  const chartData = entries.slice(-6).map(e => ({
    name: new Date(e.period_start).toLocaleDateString("en-IN", { month: "short" }),
    Email: e.email_sent,
    WhatsApp: e.whatsapp_sent,
    Calls: e.calls_made,
  }));

  const leadStatusData = [
    { name: "New", value: leads.filter(l => l.status === "new").length, color: "#3B82F6" },
    { name: "In Progress", value: leads.filter(l => ["contacted","qualified","proposal","negotiation"].includes(l.status)).length, color: "#F59E0B" },
    { name: "Won", value: wonLeads, color: "#10B981" },
    { name: "Lost", value: leads.filter(l => l.status === "lost").length, color: "#EF4444" },
  ].filter(d => d.value > 0);

  const accent = client?.accent_color ?? "#A86035";
  const primary = client?.primary_color ?? "#2C1A0F";

  const statCards = [
    {
      label: "Emails Sent", value: totalEmail.toLocaleString(), icon: Mail, color: "#1E40AF", bg: "#DBEAFE",
      sub: latest ? `${latest.email_sent} this period` : "—",
      change: latest && prev ? pct(latest.email_sent, prev.email_sent) : null,
    },
    {
      label: "WhatsApp Sent", value: totalWhatsapp.toLocaleString(), icon: MessageCircle, color: "#065F46", bg: "#D1FAE5",
      sub: latest ? `${latest.whatsapp_sent} this period` : "—",
      change: latest && prev ? pct(latest.whatsapp_sent, prev.whatsapp_sent) : null,
    },
    {
      label: "Calls Made", value: totalCalls.toLocaleString(), icon: Phone, color: "#7C2D12", bg: "#FEE2E2",
      sub: latest ? `${latest.calls_made} this period` : "—",
      change: latest && prev ? pct(latest.calls_made, prev.calls_made) : null,
    },
    {
      label: "Active Leads", value: activeLeads.toString(), icon: Target, color: "#92400E", bg: "#FEF3C7",
      sub: `${wonLeads} won total`,
      change: null,
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold" style={{ color: "#1A0F08" }}>
          Welcome back, {client?.name} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: accent }}>
          {latest ? `Latest period: ${new Date(latest.period_start).toLocaleDateString("en-IN", { month: "long", day: "numeric" })} – ${new Date(latest.period_end).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}` : "No data entries yet"}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color, bg, sub, change }) => (
          <div key={label} className="card p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
              {change !== null && (
                <div className={`flex items-center gap-0.5 text-xs font-medium ${change >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {Math.abs(change)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-display font-semibold" style={{ color: "#1A0F08" }}>{value}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: accent }}>{label}</p>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        {/* Activity chart */}
        <div className="card p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm" style={{ color: "#1A0F08" }}>Campaign Activity (Last 6 Periods)</h2>
          </div>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: accent }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={8} barGap={4}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#A86035" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#A86035" }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={{ background: "#1A0F08", border: "none", borderRadius: "8px", color: "#FAF4E8", fontSize: "12px" }} />
                <Bar dataKey="Email" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="WhatsApp" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Calls" fill={accent} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-2 justify-center">
            {[["Email","#3B82F6"],["WhatsApp","#10B981"],["Calls",accent]].map(([l,c]) => (
              <div key={l} className="flex items-center gap-1.5 text-xs" style={{ color: "#6B7280" }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Lead status donut */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-sm mb-4" style={{ color: "#1A0F08" }}>Lead Pipeline</h2>
          {leadStatusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: accent }}>No leads yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={leadStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {leadStatusData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1A0F08", border: "none", borderRadius: "8px", color: "#FAF4E8", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {leadStatusData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span style={{ color: "#3D2314" }}>{d.name}</span>
                    </div>
                    <span className="font-medium" style={{ color: "#1A0F08" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Conversion rates */}
      {latest && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-sm mb-4" style={{ color: "#1A0F08" }}>
            Latest Period Conversion Rates
            <span className="ml-2 text-xs font-normal" style={{ color: accent }}>
              {new Date(latest.period_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – {new Date(latest.period_end).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "Email Open Rate", sent: latest.email_sent, achieved: latest.email_opened, color: "#3B82F6" },
              { label: "WhatsApp Reply Rate", sent: latest.whatsapp_sent, achieved: latest.whatsapp_replied, color: "#10B981" },
              { label: "Call Connect Rate", sent: latest.calls_made, achieved: latest.calls_connected, color: accent },
            ].map(({ label, sent, achieved, color }) => {
              const rate = sent > 0 ? Math.round((achieved / sent) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium" style={{ color: "#3D2314" }}>{label}</span>
                    <span className="text-sm font-semibold" style={{ color }}>{rate}%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: "#EDD9B0" }}>
                    <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${rate}%`, background: color }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>{achieved.toLocaleString()} / {sent.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
