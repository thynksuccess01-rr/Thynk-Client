"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, Users, Package, Link2, ClipboardList, Palette, Settings, LogOut, ChevronRight } from "lucide-react";

const nav = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Mappings", href: "/admin/mappings", icon: Link2 },
  { label: "Data Panel", href: "/admin/data-panel", icon: ClipboardList },
  { label: "Users", href: "/admin/users", icon: Settings },
  { label: "Theme", href: "/admin/theme", icon: Palette },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside style={{ position: "fixed", left: 0, top: 0, height: "100vh", width: 220, background: "#1C1917", display: "flex", flexDirection: "column", zIndex: 30, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#E8611A", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 15, fontFamily: "Georgia, serif" }}>T</span>
          </div>
          <div>
            <p style={{ color: "#F5F4F0", fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>Thynk CMS</p>
            <p style={{ color: "#78716C", fontSize: 11 }}>Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        <p style={{ color: "#4E4945", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", padding: "4px 10px 8px", textTransform: "uppercase" }}>Navigation</p>
        {nav.map(({ label, href, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7, fontSize: 13, fontWeight: active ? 600 : 400, textDecoration: "none", transition: "all 0.15s",
              background: active ? "rgba(232,97,26,0.15)" : "transparent",
              color: active ? "#F5A623" : "#A8A29E",
            }}>
              <Icon size={15} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={13} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={logout} style={{
          display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px", borderRadius: 7, fontSize: 13, color: "#78716C", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit",
        }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
