"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, TrendingUp, Activity, LogOut, ChevronRight } from "lucide-react";
import clsx from "clsx";

const nav = [
  { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/portal/leads", icon: TrendingUp },
  { label: "Working Status", href: "/portal/status", icon: Activity },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const path = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);
      const { data: profile } = await supabase.from("profiles").select("*,clients(*)").eq("id", user.id).single();
      if (profile?.clients) {
        setClient(profile.clients);
        // Apply per-client CSS vars
        const c = profile.clients;
        document.documentElement.style.setProperty("--portal-primary", c.primary_color);
        document.documentElement.style.setProperty("--portal-accent", c.accent_color);
        document.documentElement.style.setProperty("--portal-font", c.font_family ?? "DM Sans");
        document.body.style.fontFamily = `'${c.font_family ?? "DM Sans"}', sans-serif`;
      }
    }
    load();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const primary = client?.primary_color ?? "#2C1A0F";
  const accent = client?.accent_color ?? "#A86035";
  const gold = "#D4A843";

  return (
    <div className="flex min-h-screen" style={{ background: "#F8F6F2" }}>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-30"
        style={{ background: primary, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Brand */}
        <div className="px-6 py-6 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {client?.logo_url ? (
            <img src={client.logo_url} alt={client.name} className="h-8 object-contain mb-1" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                style={{ background: `${accent}33`, color: accent }}>
                {(client?.name ?? "C").charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#FAF4E8" }}>{client?.name ?? "Client Portal"}</p>
                <p className="text-xs" style={{ color: `${accent}cc` }}>My Dashboard</p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ label, href, icon: Icon }) => {
            const active = path === href || path.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className={clsx("flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all")}
                style={active
                  ? { background: `${accent}22`, color: accent, borderLeft: `3px solid ${accent}`, paddingLeft: "13px" }
                  : { color: "rgba(250,244,232,0.7)" }
                }>
                <Icon size={16} />
                <span>{label}</span>
                {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="px-4 py-2 mb-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <p className="text-xs font-medium" style={{ color: "rgba(250,244,232,0.9)" }}>{user?.email}</p>
            <p className="text-xs" style={{ color: `${accent}99` }}>Client Account</p>
          </div>
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm transition-all"
            style={{ color: "rgba(250,244,232,0.6)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-60 min-h-screen p-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
