"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Save, Eye, Palette, Type, Layout } from "lucide-react";
import toast from "react-hot-toast";

const FONTS = ["DM Sans", "Inter", "Poppins", "Lato", "Nunito", "Raleway", "Roboto", "Source Sans 3"];

const DEFAULT_THEME = {
  admin_primary: "#2C1A0F",
  admin_accent: "#A86035",
  admin_bg: "#FDFAF5",
  admin_sidebar: "#2C1A0F",
  admin_gold: "#D4A843",
  portal_default_primary: "#2C1A0F",
  portal_default_accent: "#A86035",
  portal_default_bg: "#FDFAF5",
  portal_default_font: "DM Sans",
  brand_name: "Thynk CMS",
  brand_tagline: "Client Management Platform",
  logo_url: "",
};

export default function ThemePage() {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("theme_config").select("key,value").then(({ data }) => {
      if (data && data.length > 0) {
        const obj: any = {};
        data.forEach((r: any) => { obj[r.key] = r.value; });
        setTheme(prev => ({ ...prev, ...obj }));
      }
    });
  }, []);

  async function save() {
    setSaving(true);
    const upserts = Object.entries(theme).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("theme_config").upsert(upserts, { onConflict: "key" });
    if (error) toast.error(error.message);
    else {
      toast.success("Theme saved & applied globally");
      // Apply CSS vars immediately
      applyVars(theme);
    }
    setSaving(false);
  }

  function applyVars(t: typeof theme) {
    const root = document.documentElement;
    root.style.setProperty("--accent", t.admin_accent);
    root.style.setProperty("--sidebar-bg", t.admin_sidebar);
    root.style.setProperty("--sidebar-accent", t.admin_gold);
    root.style.setProperty("--bg-primary", t.admin_bg);
  }

  const ColorRow = ({ label, k }: { label: string; k: keyof typeof DEFAULT_THEME }) => (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #FAF4E8" }}>
      <div>
        <p className="text-sm font-medium" style={{ color: "#1A0F08" }}>{label}</p>
        <p className="text-xs" style={{ color: "#A86035" }}>{k}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg border" style={{ background: theme[k] as string, borderColor: "#EDD9B0" }} />
        <input type="color" value={theme[k] as string} onChange={e => setTheme({ ...theme, [k]: e.target.value })}
          className="w-10 h-9 rounded cursor-pointer border" style={{ borderColor: "#EDD9B0" }} />
        <input className="input w-32 text-xs py-2" value={theme[k] as string}
          onChange={e => setTheme({ ...theme, [k]: e.target.value })} />
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Theme Controller"
        subtitle="Control all colors, typography, and branding globally"
        action={
          <div className="flex gap-2">
            <button onClick={() => setPreview(!preview)} className="btn-secondary flex items-center gap-2">
              <Eye size={16} /> {preview ? "Hide Preview" : "Live Preview"}
            </button>
            <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={16} /> {saving ? "Saving..." : "Apply Theme"}
            </button>
          </div>
        }
      />

      <div className={`grid gap-6 ${preview ? "grid-cols-2" : "grid-cols-1 max-w-2xl"}`}>
        {/* Controls */}
        <div className="space-y-5">
          {/* Brand */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: "#1A0F08" }}>
              <Layout size={16} style={{ color: "#A86035" }} /> Brand Identity
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Platform Name</label>
                <input className="input" value={theme.brand_name} onChange={e => setTheme({ ...theme, brand_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Tagline</label>
                <input className="input" value={theme.brand_tagline} onChange={e => setTheme({ ...theme, brand_tagline: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Logo URL</label>
                <input className="input" value={theme.logo_url} onChange={e => setTheme({ ...theme, logo_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* Admin Colors */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "#1A0F08" }}>
              <Palette size={16} style={{ color: "#A86035" }} /> Admin Panel Colors
            </h3>
            <ColorRow label="Primary / Sidebar" k="admin_primary" />
            <ColorRow label="Accent" k="admin_accent" />
            <ColorRow label="Background" k="admin_bg" />
            <ColorRow label="Sidebar" k="admin_sidebar" />
            <ColorRow label="Gold / Highlight" k="admin_gold" />
          </div>

          {/* Portal Defaults */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "#1A0F08" }}>
              <Palette size={16} style={{ color: "#1E40AF" }} /> Client Portal Defaults
              <span className="badge badge-blue text-xs ml-1">Per-client overrides via Clients page</span>
            </h3>
            <ColorRow label="Default Primary" k="portal_default_primary" />
            <ColorRow label="Default Accent" k="portal_default_accent" />
            <ColorRow label="Default Background" k="portal_default_bg" />
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium" style={{ color: "#1A0F08" }}>Default Font</p>
                <p className="text-xs" style={{ color: "#A86035" }}>portal_default_font</p>
              </div>
              <select className="input w-48" value={theme.portal_default_font} onChange={e => setTheme({ ...theme, portal_default_font: e.target.value })}>
                {FONTS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        {preview && (
          <div className="space-y-4 sticky top-8 h-fit">
            <h3 className="font-semibold text-sm" style={{ color: "#1A0F08" }}>Live Preview</h3>

            {/* Sidebar preview */}
            <div className="rounded-xl overflow-hidden shadow-lg" style={{ height: 300 }}>
              <div className="flex h-full">
                <div className="w-40 flex flex-col p-3 space-y-1" style={{ background: theme.admin_sidebar }}>
                  <div className="px-2 py-1.5 mb-2">
                    <p className="text-xs font-bold" style={{ color: theme.admin_gold }}>{theme.brand_name}</p>
                    <p className="text-xs opacity-60" style={{ color: theme.admin_accent }}>{theme.brand_tagline}</p>
                  </div>
                  {["Dashboard","Clients","Products"].map((item, i) => (
                    <div key={item} className="px-3 py-2 rounded-lg text-xs"
                      style={{ background: i === 0 ? `${theme.admin_gold}22` : "transparent", color: i === 0 ? theme.admin_gold : `${theme.admin_gold}99`, borderLeft: i === 0 ? `3px solid ${theme.admin_gold}` : "3px solid transparent" }}>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex-1 p-4" style={{ background: theme.admin_bg }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#1A0F08" }}>Dashboard</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {["Clients","Leads"].map(s => (
                      <div key={s} className="rounded-lg p-3 border" style={{ background: "white", borderColor: "#EDD9B0" }}>
                        <p className="text-lg font-bold" style={{ color: "#1A0F08" }}>24</p>
                        <p className="text-xs" style={{ color: theme.admin_accent }}>{s}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg p-2 text-xs text-white" style={{ background: theme.admin_accent }}>
                    Primary Button
                  </div>
                </div>
              </div>
            </div>

            {/* Portal preview */}
            <div className="rounded-xl overflow-hidden shadow-lg border" style={{ borderColor: "#EDD9B0" }}>
              <div className="p-3 text-xs font-medium" style={{ background: theme.portal_default_primary, color: theme.portal_default_bg }}>
                Client Portal — {theme.brand_name}
              </div>
              <div className="p-4" style={{ background: theme.portal_default_bg, fontFamily: theme.portal_default_font }}>
                <p className="text-sm font-bold mb-2" style={{ color: theme.portal_default_primary }}>Welcome back!</p>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 p-3 rounded-lg border text-xs" style={{ borderColor: "#EDD9B0" }}>
                    <p className="font-bold text-lg" style={{ color: theme.portal_default_primary }}>12</p>
                    <p style={{ color: theme.portal_default_accent }}>Active Leads</p>
                  </div>
                  <div className="flex-1 p-3 rounded-lg border text-xs" style={{ borderColor: "#EDD9B0" }}>
                    <p className="font-bold text-lg" style={{ color: theme.portal_default_primary }}>3.2k</p>
                    <p style={{ color: theme.portal_default_accent }}>Emails Sent</p>
                  </div>
                </div>
                <button className="w-full text-xs py-2 rounded-lg text-white" style={{ background: theme.portal_default_accent }}>
                  View Reports →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
