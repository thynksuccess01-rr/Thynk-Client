"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Users, Package, TrendingUp, Activity, ArrowUpRight } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ clients: 0, products: 0, leads: 0, entries: 0 });
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

  const cards = [
    { label: "Total Clients", value: stats.clients, icon: Users, color: "#E8611A", bg: "#FFF7ED", href: "/admin/clients" },
    { label: "Products", value: stats.products, icon: Package, color: "#16A34A", bg: "#F0FDF4", href: "/admin/products" },
    { label: "Total Leads", value: stats.leads, icon: TrendingUp, color: "#2563EB", bg: "#EFF6FF", href: "/admin/data-panel" },
    { label: "Data Entries", value: stats.entries, icon: Activity, color: "#7C3AED", bg: "#F5F3FF", href: "/admin/data-panel" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1C1917", fontFamily: "Fraunces, Georgia, serif" }}>Dashboard</h1>
        <p style={{ fontSize: 13.5, color: "#78716C", marginTop: 3 }}>Overview of your agency's performance</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {cards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} style={{ textDecoration: "none" }}>
            <div className="card" style={{ padding: 18, cursor: "pointer", transition: "box-shadow 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={17} color={color} />
                </div>
                <ArrowUpRight size={14} color="#C7C3BF" />
              </div>
              <p style={{ fontSize: 26, fontWeight: 700, color: "#1C1917", lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 12.5, color: "#78716C", marginTop: 4, fontWeight: 500 }}>{label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#1C1917" }}>Recent Clients</h2>
          <Link href="/admin/clients" style={{ fontSize: 12.5, color: "#E8611A", textDecoration: "none", fontWeight: 500 }}>View all →</Link>
        </div>

        {recentClients.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Users size={28} color="#D6D3D1" style={{ margin: "0 auto 10px", display: "block" }} />
            <p style={{ fontSize: 13.5, color: "#A8A29E" }}>No clients yet. <Link href="/admin/clients" style={{ color: "#E8611A" }}>Add your first client</Link></p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #F5F4F0" }}>
                {["Client", "Industry", "Status", "Created"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0 0 10px", fontSize: 12, fontWeight: 500, color: "#A8A29E" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentClients.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid #FAFAF9" }}>
                  <td style={{ padding: "11px 0", fontWeight: 500, color: "#1C1917" }}>{c.name}</td>
                  <td style={{ padding: "11px 0", color: "#78716C" }}>{c.industry ?? "—"}</td>
                  <td style={{ padding: "11px 0" }}>
                    <span className={`badge ${c.is_active ? "badge-green" : "badge-gray"}`}>{c.is_active ? "Active" : "Inactive"}</span>
                  </td>
                  <td style={{ padding: "11px 0", fontSize: 12.5, color: "#A8A29E" }}>{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
