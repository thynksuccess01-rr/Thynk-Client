"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Save, Eye, Palette, Layout } from "lucide-react";
import toast from "react-hot-toast";

const FONTS = ["DM Sans","Inter","Poppins","Lato","Nunito","Raleway","Roboto","Source Sans 3"];

const DEFAULT_THEME = {
  admin_primary:          "#2C1A0F",
  admin_accent:           "#A86035",
  admin_bg:               "#FDFAF5",
  admin_sidebar:          "#2C1A0F",
  admin_gold:             "#D4A843",
  portal_default_primary: "#2C1A0F",
  portal_default_accent:  "#A86035",
  portal_default_bg:      "#FDFAF5",
  portal_default_font:    "DM Sans",
  brand_name:             "Thynk CMS",
  brand_tagline:          "Client Management Platform",
  logo_url:               "",
};

type ThemeKey = keyof typeof DEFAULT_THEME;

export default function ThemePage() {
  const [theme,   setTheme]   = useState(DEFAULT_THEME);
  const [saving,  setSaving]  = useState(false);
  const [preview, setPreview] = useState(false);
  // Separate draft for color fields so color picker changes dont cause full re-renders
  const [colorDraft, setColorDraft] = useState<Record<string, string>>({});
  const supabase = createClient();

  useEffect(() => {
    supabase.from("theme_config").select("key,value").then(({ data }) => {
      if (data && data.length > 0) {
        const obj: Record<string, string> = {};
        data.forEach((r: any) => { obj[r.key] = r.value; });
        setTheme(prev => ({ ...prev, ...obj }));
        setColorDraft(obj);
      }
    });
  }, []);

  // Merge colorDraft into theme on every change so preview stays live
  const merged = { ...theme, ...colorDraft };

  async function save() {
    setSaving(true);
    const final = { ...merged };
    const upserts = Object.entries(final).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("theme_config").upsert(upserts, { onConflict: "key" });
    if (error) { toast.error(error.message); setSaving(false); return; }
    // Persist merged state
    setTheme(final as typeof DEFAULT_THEME);
    setColorDraft({});
    toast.success("Theme saved & applied globally");
    // Apply CSS vars immediately
    const root = document.documentElement;
    root.style.setProperty("--accent",      final.admin_accent);
    root.style.setProperty("--sidebar-bg",  final.admin_sidebar);
    root.style.setProperty("--sidebar-accent", final.admin_gold);
    root.style.setProperty("--bg-primary",  final.admin_bg);
    setSaving(false);
  }

  // ColorRow: uses uncontrolled input for the color picker to prevent it closing,
  // and a controlled text input for the hex value
  const ColorRow = ({ label, k }: { label: string; k: ThemeKey }) => {
    const currentVal = (colorDraft[k] ?? merged[k] ?? "") as string;
    const pickerRef = useRef<HTMLInputElement>(null);

    // Sync picker value when colorDraft changes externally
    useEffect(() => {
      if (pickerRef.current && pickerRef.current !== document.activeElement) {
        pickerRef.current.value = currentVal;
      }
    }, [currentVal]);

    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #FAF4E8" }}>
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: "#1A0F08" }}>{label}</p>
          <p style={{ fontSize: 11, color: "#A86035", marginTop: 1 }}>{k}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Swatch */}
          <div style={{ width: 32, height: 32, borderRadius: 8, background: currentVal, border: "2px solid #EDD9B0", flexShrink: 0 }} />
          {/* Color picker — uncontrolled, uses onInput to avoid React re-render closing it */}
          <div style={{ position: "relative" }}>
            <input
              ref={pickerRef}
              type="color"
              defaultValue={currentVal}
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                setColorDraft(prev => ({ ...prev, [k]: val }));
              }}
              style={{ width: 44, height: 36, padding: 2, border: "1px solid #EDD9B0", borderRadius: 7, cursor: "pointer", background: "transparent" }}
            />
          </div>
          {/* Hex text input — controlled */}
          <input
            type="text"
            value={currentVal}
            onChange={(e) => setColorDraft(prev => ({ ...prev, [k]: e.target.value }))}
            style={{ width: 90, padding: "6px 10px", border: "1px solid #EDD9B0", borderRadius: 7, fontSize: 12.5, fontFamily: "inherit", outline: "none" }}
          />
        </div>
      </div>
    );
  };

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
        <div className="space-y-5">
          {/* Brand Identity */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: "#1A0F08" }}>
              <Layout size={16} style={{ color: "#A86035" }} /> Brand Identity
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Platform Name</label>
                <input className="input" value={merged.brand_name} onChange={e => setColorDraft(p => ({ ...p, brand_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Tagline</label>
                <input className="input" value={merged.brand_tagline} onChange={e => setColorDraft(p => ({ ...p, brand_tagline: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Logo URL</label>
                <input className="input" value={merged.logo_url} onChange={e => setColorDraft(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." />
                {merged.logo_url && (
                  <div style={{ marginTop: 8, padding: 10, background: "#1C1917", borderRadius: 8, display: "inline-flex" }}>
                    <img src={merged.logo_url} alt="Logo preview" style={{ height: 32, objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Admin Colors */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "#1A0F08" }}>
              <Palette size={16} style={{ color: "#A86035" }} /> Admin Panel Colors
            </h3>
            <ColorRow label="Primary / Sidebar" k="admin_primary" />
            <ColorRow label="Accent"            k="admin_accent" />
            <ColorRow label="Background"        k="admin_bg" />
            <ColorRow label="Sidebar"           k="admin_sidebar" />
            <ColorRow label="Gold / Highlight"  k="admin_gold" />
          </div>

          {/* Portal Defaults */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "#1A0F08" }}>
              <Palette size={16} style={{ color: "#1E40AF" }} /> Client Portal Defaults
              <span className="badge badge-blue text-xs ml-1">Per-client overrides via Clients page</span>
            </h3>
            <ColorRow label="Default Primary" k="portal_default_primary" />
            <ColorRow label="Default Accent"  k="portal_default_accent" />
            <ColorRow label="Default Background" k="portal_default_bg" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 500, color: "#1A0F08" }}>Default Font</p>
                <p style={{ fontSize: 11, color: "#A86035", marginTop: 1 }}>portal_default_font</p>
              </div>
              <select className="input w-48" value={merged.portal_default_font}
                onChange={e => setColorDraft(p => ({ ...p, portal_default_font: e.target.value }))}>
                {FONTS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        {preview && (
          <div className="space-y-4 sticky top-8 h-fit">
            <h3 className="font-semibold text-sm" style={{ color: "#1A0F08" }}>Live Preview</h3>
            <div className="rounded-xl overflow-hidden shadow-lg" style={{ height: 300 }}>
              <div className="flex h-full">
                <div className="w-40 flex flex-col p-3 space-y-1" style={{ background: merged.admin_sidebar }}>
                  <div className="px-2 py-1.5 mb-2">
                    {merged.logo_url
                      ? <img src={merged.logo_url} alt="" style={{ height: 24, objectFit: "contain", marginBottom: 2 }} />
                      : <p className="text-xs font-bold" style={{ color: merged.admin_gold }}>{merged.brand_name}</p>}
                    <p className="text-xs opacity-60" style={{ color: merged.admin_accent }}>{merged.brand_tagline}</p>
                  </div>
                  {["Dashboard","Clients","Products"].map((item, i) => (
                    <div key={item} className="px-3 py-2 rounded-lg text-xs"
                      style={{ background: i === 0 ? `${merged.admin_gold}22` : "transparent", color: i === 0 ? merged.admin_gold : `${merged.admin_gold}99`, borderLeft: i === 0 ? `3px solid ${merged.admin_gold}` : "3px solid transparent" }}>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex-1 p-4" style={{ background: merged.admin_bg }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#1A0F08" }}>Dashboard</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {["Clients","Leads"].map(s => (
                      <div key={s} className="rounded-lg p-3 border" style={{ background: "white", borderColor: "#EDD9B0" }}>
                        <p className="text-lg font-bold" style={{ color: "#1A0F08" }}>24</p>
                        <p className="text-xs" style={{ color: merged.admin_accent }}>{s}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg p-2 text-xs text-white" style={{ background: merged.admin_accent }}>Primary Button</div>
                </div>
              </div>
            </div>

            {/* Login preview */}
            <div className="rounded-xl overflow-hidden shadow-lg border" style={{ borderColor: "#EDD9B0" }}>
              <p className="text-xs font-semibold px-3 py-2" style={{ background: "#F5F4F0", color: "#78716C" }}>Login Page Preview</p>
              <div style={{ display: "flex", height: 120 }}>
                <div style={{ width: 120, background: "#1C1917", padding: "16px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  {merged.logo_url
                    ? <img src={merged.logo_url} alt="" style={{ height: 20, objectFit: "contain" }} />
                    : <p style={{ fontSize: 10, fontWeight: 700, color: "#F5F4F0" }}>{merged.brand_name}</p>}
                  <p style={{ fontSize: 9, color: "#78716C" }}>{merged.brand_tagline}</p>
                </div>
                <div style={{ flex: 1, padding: "16px 14px", background: "#F5F4F0", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#1C1917" }}>Sign in</p>
                  <div style={{ height: 20, background: "#E7E5E4", borderRadius: 5 }} />
                  <div style={{ height: 20, background: "#1C1917", borderRadius: 5 }} />
                </div>
              </div>
            </div>

            {/* Portal preview */}
            <div className="rounded-xl overflow-hidden shadow-lg border" style={{ borderColor: "#EDD9B0" }}>
              <div className="p-3 text-xs font-medium" style={{ background: merged.portal_default_primary, color: merged.portal_default_bg }}>
                Client Portal — {merged.brand_name}
              </div>
              <div className="p-4" style={{ background: merged.portal_default_bg, fontFamily: merged.portal_default_font }}>
                <p className="text-sm font-bold mb-2" style={{ color: merged.portal_default_primary }}>Welcome back!</p>
                <div className="flex gap-2 mb-3">
                  {["Active Leads","Emails Sent"].map((s, i) => (
                    <div key={s} className="flex-1 p-3 rounded-lg border text-xs" style={{ borderColor: "#EDD9B0" }}>
                      <p className="font-bold text-lg" style={{ color: merged.portal_default_primary }}>{i ? "3.2k" : "12"}</p>
                      <p style={{ color: merged.portal_default_accent }}>{s}</p>
                    </div>
                  ))}
                </div>
                <button className="w-full text-xs py-2 rounded-lg text-white" style={{ background: merged.portal_default_accent }}>View Reports →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
