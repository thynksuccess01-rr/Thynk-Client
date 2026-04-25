"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, MapPin, DollarSign, Calendar } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  new: "badge-blue", contacted: "badge-yellow", qualified: "badge-yellow",
  proposal: "badge-blue", negotiation: "badge-yellow", won: "badge-green", lost: "badge-red",
};

export default function PortalLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
      if (!profile?.client_id) return;
      const { data } = await supabase.from("leads").select("*").eq("client_id", profile.client_id).order("created_at", { ascending: false });
      setLeads(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const statuses = ["all", "new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);

  const totalRevenue = leads.filter(l => l.status === "won").reduce((s, l) => s + (l.expected_revenue ?? 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold" style={{ color: "#1A0F08" }}>Leads</h1>
        <p className="text-sm mt-1" style={{ color: "var(--portal-accent, #A86035)" }}>Track all your leads across campaigns</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Leads", value: leads.length, icon: TrendingUp },
          { label: "Active", value: leads.filter(l => !["won","lost"].includes(l.status)).length, icon: Calendar },
          { label: "Won", value: leads.filter(l => l.status === "won").length, icon: TrendingUp },
          { label: "Won Revenue", value: `₹${(totalRevenue / 100000).toFixed(1)}L`, icon: DollarSign },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <p className="text-xl font-display font-semibold" style={{ color: "#1A0F08" }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--portal-accent, #A86035)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === s ? "text-white" : "text-gray-600 bg-white border"}`}
            style={filter === s ? { background: "var(--portal-accent, #A86035)" } : { borderColor: "#EDD9B0" }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s === "all" ? ` (${leads.length})` : ` (${leads.filter(l => l.status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-16 text-center text-sm" style={{ color: "#A86035" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center text-sm" style={{ color: "#A86035" }}>No leads found.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(l => (
            <div key={l.id} className="card p-5 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold" style={{ color: "#1A0F08" }}>{l.name}</h3>
                    <span className={`badge ${STATUS_COLORS[l.status]}`}>
                      {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                    </span>
                    {l.cycle_label && <span className="badge badge-gray text-xs">{l.cycle_label}</span>}
                  </div>
                  <div className="flex gap-5 text-xs" style={{ color: "#3D2314" }}>
                    {l.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {l.location}
                      </span>
                    )}
                    {l.expected_volume && <span>Volume: {l.expected_volume}</span>}
                    {l.expected_revenue && (
                      <span className="flex items-center gap-1">
                        <DollarSign size={11} /> ₹{l.expected_revenue.toLocaleString("en-IN")}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>
                      {new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  {l.notes && <p className="text-xs mt-2 leading-relaxed" style={{ color: "#6B7280" }}>{l.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
