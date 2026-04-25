"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Package, Link2, ClipboardList,
  Palette, Settings, LogOut, ChevronRight, BarChart3
} from "lucide-react";
import clsx from "clsx";

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
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-30"
      style={{ background: "#2C1A0F", borderRight: "1px solid rgba(237,217,176,0.08)" }}>
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: "rgba(237,217,176,0.08)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,168,67,0.2)" }}>
            <BarChart3 size={16} style={{ color: "#D4A843" }} />
          </div>
          <div>
            <p className="text-sm font-semibold font-display" style={{ color: "#FAF4E8" }}>Thynk CMS</p>
            <p className="text-xs" style={{ color: "#C27B4A" }}>Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-xs font-semibold px-4 mb-2" style={{ color: "rgba(194,123,74,0.6)" }}>NAVIGATION</p>
        {nav.map(({ label, href, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className={clsx("flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "text-gold-400"
                  : "text-cream-200 hover:text-gold-400"
              )}
              style={active ? { background: "rgba(212,168,67,0.12)", borderLeft: "3px solid #D4A843", paddingLeft: "13px" } : {}}
            >
              <Icon size={16} />
              <span>{label}</span>
              {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t pt-4" style={{ borderColor: "rgba(237,217,176,0.08)" }}>
        <button onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{ color: "#C27B4A" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,168,67,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
