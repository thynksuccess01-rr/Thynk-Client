"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, Users, Package, Link2, ClipboardList, Palette, Settings, LogOut, ChevronRight, Target, Clock, Bell } from "lucide-react";

const nav = [
  { label: "Dashboard",    href: "/admin/dashboard",    icon: LayoutDashboard },
  { label: "Clients",      href: "/admin/clients",       icon: Users },
  { label: "Products",     href: "/admin/products",      icon: Package },
  { label: "Mappings",     href: "/admin/mappings",      icon: Link2 },
  { label: "Data Panel",   href: "/admin/data-panel",    icon: ClipboardList },
  { label: "Leads",        href: "/admin/Leads",         icon: Target },
  { label: "Lead Aging",   href: "/admin/lead-aging",    icon: Clock },
  { label: "Users",        href: "/admin/users",         icon: Settings },
  { label: "Notifications",href: "/admin/notifications", icon: Bell },
  { label: "Theme",        href: "/admin/theme",         icon: Palette },
];

export default function Sidebar() {
  const path = usePathname();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, height: "100vh", width: 220,
      background: "var(--sidebar, #1C1917)",
      display: "flex", flexDirection: "column", zIndex: 30,
      borderRight: "1px solid rgba(255,255,255,0.06)",
      transition: "background 0.3s",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent, #E8611A)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 15, fontFamily: "Georgia, serif" }}>T</span>
          </div>
          <div>
            <p style={{ color: "var(--sidebar-text, #F5F4F0)", fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>Thynk CMS</p>
            <p style={{ color: "var(--sidebar-muted, #78716C)", fontSize: 11 }}>Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        <p style={{ color: "var(--sidebar-muted, #4E4945)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", padding: "4px 10px 8px", textTransform: "uppercase", opacity: 0.6 }}>
          Navigation
        </p>
        {nav.map(({ label, href, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7,
              fontSize: 13, fontWeight: active ? 600 : 400, textDecoration: "none", transition: "all 0.15s",
              background: active ? "rgba(var(--sidebar-active-rgb, 245,166,35), 0.12)" : "transparent",
              color: active ? "var(--sidebar-active, #F5A623)" : "var(--sidebar-muted, #A8A29E)",
              borderLeft: active ? "3px solid var(--sidebar-active, #F5A623)" : "3px solid transparent",
            }}>
              <Icon size={15} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={13} />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={logout} style={{
          display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px",
          borderRadius: 7, fontSize: 13, color: "var(--sidebar-muted, #78716C)",
          background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit",
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
