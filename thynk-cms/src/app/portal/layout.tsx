"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, TrendingUp, Activity, LogOut, ChevronRight, Clock, Bell, FileText, X } from "lucide-react";

const nav = [
  { label: "Dashboard",     href: "/portal/dashboard",  icon: LayoutDashboard },
  { label: "Leads",         href: "/portal/leads",       icon: TrendingUp },
  { label: "Lead Aging",    href: "/portal/lead-aging",  icon: Clock },
  { label: "Documents",     href: "/portal/documents",   icon: FileText },
  { label: "Working Status",href: "/portal/status",      icon: Activity },
];

const NOTIF_META: Record<string,{icon:string,color:string,bg:string}> = {
  admin_message: { icon:"💬", color:"#4338CA", bg:"#EEF2FF" },
  data_update:   { icon:"📊", color:"#15803D", bg:"#DCFCE7" },
  document:      { icon:"📎", color:"#7C3AED", bg:"#F5F3FF" },
  lead_update:   { icon:"🎯", color:"#B45309", bg:"#FFFBEB" },
  system:        { icon:"🔔", color:"#0891B2", bg:"#ECFEFF" },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [client,       setClient]       = useState<any>(null);
  const [user,         setUser]         = useState<any>(null);
  const [clientId,     setClientId]     = useState<string|null>(null);
  const [notifications,setNotifications]= useState<any[]>([]);
  const [showNotifs,   setShowNotifs]   = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);
      const { data: profileRaw } = await supabase.from("profiles").select("*,clients(*)").eq("id", u.id).single();
      const profile = profileRaw as any;
      if (!profile?.clients) return;
      const c = profile.clients;
      setClient(c);
      setClientId(profile.client_id);

      // Apply branding
      document.documentElement.style.setProperty("--portal-primary", c.primary_color);
      document.documentElement.style.setProperty("--portal-accent", c.accent_color);
      document.body.style.fontFamily = `'${c.font_family ?? "DM Sans"}', sans-serif`;

      // Track login
      await supabase.from("portal_login_history").insert({
        client_id:   profile.client_id,
        user_id:     u.id,
        email:       u.email,
        user_agent:  navigator.userAgent,
      });

      // Load notifications
      loadNotifications(profile.client_id);
    }
    load();
  }, []);

  async function loadNotifications(cid: string) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("client_id", cid)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications(data ?? []);
  }

  // Close notif panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    if (!clientId) return;
    await supabase.from("notifications").update({ is_read: true }).eq("client_id", clientId).eq("is_read", false);
    loadNotifications(clientId!);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const primary  = client?.primary_color ?? "#2C1A0F";
  const accent   = client?.accent_color  ?? "#A86035";
  const unread   = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex min-h-screen" style={{ background: "#F8F6F2" }}>
      <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-30"
        style={{ background: primary, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Logo */}
        <div className="px-6 py-6 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {client?.logo_url ? (
            <img src={client.logo_url} alt={client.name} className="h-8 object-contain" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                style={{ background: `${accent}33`, color: accent }}>
                {(client?.name ?? "C").charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#FAF4E8" }}>{client?.name ?? "Portal"}</p>
                <p className="text-xs" style={{ color: `${accent}cc` }}>My Dashboard</p>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ label, href, icon: Icon }) => {
            const active = path === href || path.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={active
                  ? { background: `${accent}22`, color: accent, borderLeft: `3px solid ${accent}`, paddingLeft: "13px" }
                  : { color: "rgba(250,244,232,0.7)" }}>
                <Icon size={16} />
                <span>{label}</span>
                {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
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

      <main className="flex-1 ml-60 min-h-screen">
        {/* Top bar with notification bell */}
        <div style={{ padding: "14px 32px", borderBottom: "1px solid #E7E5E4", background: "#fff", display: "flex", alignItems: "center", justifyContent: "flex-end", position: "sticky", top: 0, zIndex: 20 }}>
          <div ref={notifRef} style={{ position: "relative" }}>
            <button onClick={() => setShowNotifs(!showNotifs)}
              style={{ position: "relative", background: "transparent", border: "1px solid #E7E5E4", borderRadius: 10, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#1C1917", fontFamily: "inherit" }}>
              <Bell size={16} />
              {unread > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, background: "#EF4444", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", border: "2px solid #fff" }}>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
              Notifications
            </button>

            {/* Notification dropdown */}
            {showNotifs && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 380, background: "#fff", border: "1px solid #E7E5E4", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", zIndex: 100, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #F0EEEC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: "#1C1917" }}>
                    Notifications {unread > 0 && <span style={{ fontSize: 11, background: "#EF4444", color: "#fff", borderRadius: 8, padding: "1px 6px", marginLeft: 5 }}>{unread}</span>}
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {unread > 0 && (
                      <button onClick={markAllRead} style={{ fontSize: 11.5, color: accent, fontWeight: 600, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setShowNotifs(false)} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex" }}>
                      <X size={15} color="#A8A29E" />
                    </button>
                  </div>
                </div>
                <div style={{ maxHeight: 420, overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "#A8A29E", fontSize: 13 }}>No notifications</div>
                  ) : notifications.map(n => {
                    const meta = NOTIF_META[n.type] ?? NOTIF_META.system;
                    return (
                      <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid #F5F4F0", display: "flex", gap: 10, background: n.is_read ? "#fff" : "#FFFBEB" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                          {meta.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12.5, fontWeight: 600, color: "#1C1917", marginBottom: 2 }}>{n.title}</p>
                          {n.body && <p style={{ fontSize: 12, color: "#78716C", lineHeight: 1.4 }}>{n.body}</p>}
                          <p style={{ fontSize: 11, color: "#A8A29E", marginTop: 3 }}>
                            {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#F59E0B", flexShrink: 0, marginTop: 4 }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
