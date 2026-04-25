"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Users, Package, TrendingUp, Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface Stats { clients: number; products: number; leads: number; entries: number; }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ clients: 0, products: 0, leads: 0, entries: 0 });
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [c, p, l, e, rc] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("data_entries").select("id", { count: "exact", head: true }),
        supabase.from("clients").select("id,name,industry,is_active,created_at").order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({ clients: c.count ?? 0, products: p.count ?? 0, leads: l.count ?? 0, entries: e.count ?? 0 });
      setRecentClients(rc.data ?? []);
    }
    load();
  }, []);

  const statCards = [
    { label: "Total Clients", value: stats.clients, icon: Users, color: "#A86035", bg: "#FEF3C7", href: "/admin/clients" },
    { label: "Products", value: stats.products, icon: Package, color: "#2D5A3D", bg: "#D1FAE5", href: "/admin/products" },
    { label: "Total Leads", value: stats.leads, icon: TrendingUp, color: "#1E40AF", bg: "#DBEAFE", href: "/admin/data-panel" },
    { label: "Data Entries", value: stats.entries, icon: Activity, color: "#7C2D12", bg: "#FEE2E2", href: "/admin/data-panel" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your agency's performance" />
      <div className="grid grid-cols-4 gap-5 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}
            className="card p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
              <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }} />
            </div>
            <p className="text-2xl font-display font-semibold" style={{ color: "#1A0F08" }}>{value}</p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: "#A86035" }}>{label}</p>
          </Link>
        ))}
      </div>
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold" style={{ color: "#1A0F08" }}>Recent Clients</h2>
          <Link href="/admin/clients" className="text-xs font-medium" style={{ color: "#A86035" }}>View all →</Link>
        </div>
        {recentClients.length === 0 ? (
          <div className="text-center py-12">
            <Users size={32} className="mx-auto mb-3 opacity-30" style={{ color: "#A86035" }} />
            <p className="text-sm" style={{ color: "#A86035" }}>No clients yet. <Link href="/admin/clients" className="underline">Add your first client</Link></p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #EDD9B0" }}>
                {["Client", "Industry", "Status", "Created"].map(h => (
                  <th key={h} className="text-left pb-3 font-medium text-xs" style={{ color: "#A86035" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentClients.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid #FAF4E8" }} className="hover:bg-amber-50 transition-colors">
                  <td className="py-3 font-medium" style={{ color: "#1A0F08" }}>{c.name}</td>
                  <td className="py-3" style={{ color: "#3D2314" }}>{c.industry ?? "—"}</td>
                  <td className="py-3">
                    <span className={`badge ${c.is_active ? "badge-green" : "badge-gray"}`}>{c.is_active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="py-3 text-xs" style={{ color: "#A86035" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
