"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Save, Eye, Palette, Layout, Check, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const FONTS = ["DM Sans","Inter","Poppins","Lato","Nunito","Raleway","Roboto","Source Sans 3"];

const PRESET_THEMES = [
  {
    id: "ember",
    name: "Ember (Default)",
    description: "Warm dark sidebar, burnt orange accent",
    preview: ["#1C1917","#E8611A","#F5F4F0","#F5A623"],
    vars: {
      "--bg": "#F5F4F0", "--bg2": "#FFFFFF",
      "--sidebar": "#1C1917", "--sidebar-text": "#E7E5E4",
      "--sidebar-muted": "#78716C", "--sidebar-active": "#F5A623",
      "--accent": "#E8611A", "--accent2": "#F5A623",
      "--text": "#1C1917", "--text2": "#57534E", "--text3": "#A8A29E",
      "--border": "#E7E5E4", "--border2": "#D6D3D1",
    },
    theme: {
      admin_primary: "#1C1917", admin_accent: "#E8611A",
      admin_bg: "#F5F4F0", admin_sidebar: "#1C1917", admin_gold: "#F5A623",
      portal_default_primary: "#1C1917", portal_default_accent: "#E8611A", portal_default_bg: "#FDFAF5",
    },
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    description: "Deep navy sidebar, electric blue accent",
    preview: ["#0F172A","#3B82F6","#F0F9FF","#38BDF8"],
    vars: {
      "--bg": "#F0F9FF", "--bg2": "#FFFFFF",
      "--sidebar": "#0F172A", "--sidebar-text": "#E2E8F0",
      "--sidebar-muted": "#64748B", "--sidebar-active": "#38BDF8",
      "--accent": "#3B82F6", "--accent2": "#38BDF8",
      "--text": "#0F172A", "--text2": "#475569", "--text3": "#94A3B8",
      "--border": "#E2E8F0", "--border2": "#CBD5E1",
    },
    theme: {
      admin_primary: "#0F172A", admin_accent: "#3B82F6",
      admin_bg: "#F0F9FF", admin_sidebar: "#0F172A", admin_gold: "#38BDF8",
      portal_default_primary: "#0F172A", portal_default_accent: "#3B82F6", portal_default_bg: "#F0F9FF",
    },
  },
  {
    id: "forest",
    name: "Forest Green",
    description: "Rich green sidebar, emerald accent",
    preview: ["#052E16","#16A34A","#F0FDF4","#4ADE80"],
    vars: {
      "--bg": "#F0FDF4", "--bg2": "#FFFFFF",
      "--sidebar": "#052E16", "--sidebar-text": "#DCFCE7",
      "--sidebar-muted": "#4B7C5B", "--sidebar-active": "#4ADE80",
      "--accent": "#16A34A", "--accent2": "#4ADE80",
      "--text": "#052E16", "--text2": "#166534", "--text3": "#4ADE80",
      "--border": "#DCFCE7", "--border2": "#BBF7D0",
    },
    theme: {
      admin_primary: "#052E16", admin_accent: "#16A34A",
      admin_bg: "#F0FDF4", admin_sidebar: "#052E16", admin_gold: "#4ADE80",
      portal_default_primary: "#052E16", portal_default_accent: "#16A34A", portal_default_bg: "#F0FDF4",
    },
  },
  {
    id: "royal",
    name: "Royal Purple",
    description: "Deep indigo sidebar, violet accent",
    preview: ["#1E1B4B","#7C3AED","#FAF5FF","#A78BFA"],
    vars: {
      "--bg": "#FAF5FF", "--bg2": "#FFFFFF",
      "--sidebar": "#1E1B4B", "--sidebar-text": "#EDE9FE",
      "--sidebar-muted": "#6D6A9C", "--sidebar-active": "#A78BFA",
      "--accent": "#7C3AED", "--accent2": "#A78BFA",
      "--text": "#1E1B4B", "--text2": "#4C1D95", "--text3": "#A78BFA",
      "--border": "#EDE9FE", "--border2": "#DDD6FE",
    },
    theme: {
      admin_primary: "#1E1B4B", admin_accent: "#7C3AED",
      admin_bg: "#FAF5FF", admin_sidebar: "#1E1B4B", admin_gold: "#A78BFA",
      portal_default_primary: "#1E1B4B", portal_default_accent: "#7C3AED", portal_default_bg: "#FAF5FF",
    },
  },
  {
    id: "rose",
    name: "Rose Gold",
    description: "Warm charcoal sidebar, rose accent",
    preview: ["#1C0A10","#E11D48","#FFF1F3","#FB7185"],
    vars: {
      "--bg": "#FFF1F3", "--bg2": "#FFFFFF",
      "--sidebar": "#1C0A10", "--sidebar-text": "#FFE4E6",
      "--sidebar-muted": "#7C3B4A", "--sidebar-active": "#FB7185",
      "--accent": "#E11D48", "--accent2": "#FB7185",
      "--text": "#1C0A10", "--text2": "#6B2737", "--text3": "#FB7185",
      "--border": "#FFE4E6", "--border2": "#FECDD3",
    },
    theme: {
      admin_primary: "#1C0A10", admin_accent: "#E11D48",
      admin_bg: "#FFF1F3", admin_sidebar: "#1C0A10", admin_gold: "#FB7185",
      portal_default_primary: "#1C0A10", portal_default_accent: "#E11D48", portal_default_bg: "#FFF1F3",
    },
  },
  {
    id: "slate",
    name: "Slate + Teal",
    description: "Clean slate sidebar, teal accent",
    preview: ["#1E293B","#0D9488","#F8FAFC","#2DD4BF"],
    vars: {
      "--bg": "#F8FAFC", "--bg2": "#FFFFFF",
      "--sidebar": "#1E293B", "--sidebar-text": "#F1F5F9",
      "--sidebar-muted": "#64748B", "--sidebar-active": "#2DD4BF",
      "--accent": "#0D9488", "--accent2": "#2DD4BF",
      "--text": "#1E293B", "--text2": "#475569", "--text3": "#94A3B8",
      "--border": "#E2E8F0", "--border2": "#CBD5E1",
    },
    theme: {
      admin_primary: "#1E293B", admin_accent: "#0D9488",
      admin_bg: "#F8FAFC", admin_sidebar: "#1E293B", admin_gold: "#2DD4BF",
      portal_default_primary: "#1E293B", portal_default_accent: "#0D9488", portal_default_bg: "#F8FAFC",
    },
  },
  {
    id: "midnight",
    name: "Midnight Dark",
    description: "Full dark mode, indigo highlight",
    preview: ["#09090B","#6366F1","#18181B","#818CF8"],
    vars: {
      "--bg": "#18181B", "--bg2": "#27272A",
      "--sidebar": "#09090B", "--sidebar-text": "#F4F4F5",
      "--sidebar-muted": "#52525B", "--sidebar-active": "#818CF8",
      "--accent": "#6366F1", "--accent2": "#818CF8",
      "--text": "#F4F4F5", "--text2": "#A1A1AA", "--text3": "#71717A",
      "--border": "#3F3F46", "--border2": "#52525B",
    },
    theme: {
      admin_primary: "#09090B", admin_accent: "#6366F1",
      admin_bg: "#18181B", admin_sidebar: "#09090B", admin_gold: "#818CF8",
      portal_default_primary: "#09090B", portal_default_accent: "#6366F1", portal_default_bg: "#18181B",
    },
  },
  {
    id: "amber",
    name: "Amber Luxe",
    description: "Dark mahogany sidebar, golden amber",
    preview: ["#2C1A0F","#D97706","#FFFBEB","#FCD34D"],
    vars: {
      "--bg": "#FFFBEB", "--bg2": "#FFFFFF",
      "--sidebar": "#2C1A0F", "--sidebar-text": "#FEF3C7",
      "--sidebar-muted": "#78634D", "--sidebar-active": "#FCD34D",
      "--accent": "#D97706", "--accent2": "#FCD34D",
      "--text": "#2C1A0F", "--text2": "#78350F", "--text3": "#92400E",
      "--border": "#FDE68A", "--border2": "#FCD34D",
    },
    theme: {
      admin_primary: "#2C1A0F", admin_accent: "#D97706",
      admin_bg: "#FFFBEB", admin_sidebar: "#2C1A0F", admin_gold: "#FCD34D",
      portal_default_primary: "#2C1A0F", portal_default_accent: "#D97706", portal_default_bg: "#FFFBEB",
    },
  },
  {
    id: "arctic",
    name: "Arctic White",
    description: "Light sidebar, crisp sky blue accent",
    preview: ["#E2E8F0","#0369A1","#F8FAFC","#0EA5E9"],
    vars: {
      "--bg": "#F8FAFC", "--bg2": "#FFFFFF",
      "--sidebar": "#E2E8F0", "--sidebar-text": "#0F172A",
      "--sidebar-muted": "#64748B", "--sidebar-active": "#0EA5E9",
      "--accent": "#0369A1", "--accent2": "#0EA5E9",
      "--text": "#0F172A", "--text2": "#334155", "--text3": "#94A3B8",
      "--border": "#E2E8F0", "--border2": "#CBD5E1",
    },
    theme: {
      admin_primary: "#E2E8F0", admin_accent: "#0369A1",
      admin_bg: "#F8FAFC", admin_sidebar: "#E2E8F0", admin_gold: "#0EA5E9",
      portal_default_primary: "#0F172A", portal_default_accent: "#0369A1", portal_default_bg: "#F8FAFC",
    },
  },
  {
    id: "coral",
    name: "Coral Sunset",
    description: "Deep burgundy sidebar, coral orange",
    preview: ["#3B0764","#F97316","#FFF7ED","#FB923C"],
    vars: {
      "--bg": "#FFF7ED", "--bg2": "#FFFFFF",
      "--sidebar": "#3B0764", "--sidebar-text": "#FAE8FF",
      "--sidebar-muted": "#7E5A8A", "--sidebar-active": "#FB923C",
      "--accent": "#F97316", "--accent2": "#FB923C",
      "--text": "#1C0533", "--text2": "#6B2B6E", "--text3": "#A855F7",
      "--border": "#FAE8FF", "--border2": "#E9D5FF",
    },
    theme: {
      admin_primary: "#3B0764", admin_accent: "#F97316",
      admin_bg: "#FFF7ED", admin_sidebar: "#3B0764", admin_gold: "#FB923C",
      portal_default_primary: "#3B0764", portal_default_accent: "#F97316", portal_default_bg: "#FFF7ED",
    },
  },
];

const DEFAULT_THEME = {
  admin_primary:          "#1C1917",
  admin_accent:           "#E8611A",
  admin_bg:               "#F5F4F0",
  admin_sidebar:          "#1C1917",
  admin_gold:             "#F5A623",
  portal_default_primary: "#1C1917",
  portal_default_accent:  "#E8611A",
  portal_default_bg:      "#FDFAF5",
  portal_default_font:    "DM Sans",
  brand_name:             "Thynk CMS",
  brand_tagline:          "Client Management Platform",
  logo_url:               "",
};

type ThemeKey = keyof typeof DEFAULT_THEME;

function applyThemeVars(vars: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

export default function ThemePage() {
  const [theme,        setTheme]        = useState(DEFAULT_THEME);
  const [saving,       setSaving]       = useState(false);
  const [preview,      setPreview]      = useState(false);
  const [activeTab,    setActiveTab]    = useState<"presets"|"custom">("presets");
  const [activePreset, setActivePreset] = useState<string>("ember");
  const [colorDraft,   setColorDraft]   = useState<Record<string, string>>({});
  const supabase = createClient();

  useEffect(() => {
    supabase.from("theme_config").select("key,value").then(({ data }) => {
      if (data && data.length > 0) {
        const obj: Record<string, string> = {};
        data.forEach((r: any) => { obj[r.key] = r.value; });
        setTheme(prev => ({ ...prev, ...obj }));
        setColorDraft(obj);
        if (obj["active_preset"]) setActivePreset(obj["active_preset"]);
        if (obj["preset_vars"]) {
          try { applyThemeVars(JSON.parse(obj["preset_vars"])); } catch {}
        }
      }
    });
  }, []);

  const merged = { ...theme, ...colorDraft };

  function applyPreset(preset: typeof PRESET_THEMES[0]) {
    setActivePreset(preset.id);
    setColorDraft(prev => ({ ...prev, ...preset.theme }));
    applyThemeVars(preset.vars);
  }

  async function save() {
    setSaving(true);
    const final = { ...merged };
    const matchingPreset = PRESET_THEMES.find(p => p.id === activePreset);
    const cssVars: Record<string, string> = matchingPreset
      ? matchingPreset.vars
      : {
          "--bg": final.admin_bg, "--bg2": "#FFFFFF",
          "--sidebar": final.admin_sidebar, "--sidebar-text": "#E7E5E4",
          "--sidebar-muted": "#78716C", "--sidebar-active": final.admin_gold,
          "--accent": final.admin_accent, "--accent2": final.admin_gold,
          "--text": "#1C1917", "--text2": "#57534E", "--text3": "#A8A29E",
          "--border": "#E7E5E4", "--border2": "#D6D3D1",
        };
    const upserts = [
      ...Object.entries(final).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() })),
      { key: "preset_vars", value: JSON.stringify(cssVars), updated_at: new Date().toISOString() },
      { key: "active_preset", value: activePreset, updated_at: new Date().toISOString() },
    ];
    const { error } = await supabase.from("theme_config").upsert(upserts, { onConflict: "key" });
    if (error) { toast.error(error.message); setSaving(false); return; }
    setTheme(final as typeof DEFAULT_THEME);
    setColorDraft({});
    applyThemeVars(cssVars);
    toast.success("Theme saved & applied globally");
    setSaving(false);
  }

  const ColorRow = ({ label, k }: { label: string; k: ThemeKey }) => {
    const currentVal = (colorDraft[k] ?? merged[k] ?? "") as string;
    const pickerRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
      if (pickerRef.current && pickerRef.current !== document.activeElement) {
        pickerRef.current.value = currentVal;
      }
    }, [currentVal]);
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{label}</p>
          <p style={{ fontSize: 11, color: "var(--accent)", marginTop: 1 }}>{k}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: currentVal, border: "2px solid var(--border2)", flexShrink: 0 }} />
          <div style={{ position: "relative" }}>
            <input ref={pickerRef} type="color" defaultValue={currentVal}
              onInput={(e) => { const val = (e.target as HTMLInputElement).value; setColorDraft(prev => ({ ...prev, [k]: val })); }}
              style={{ width: 44, height: 36, padding: 2, border: "1px solid var(--border2)", borderRadius: 7, cursor: "pointer", background: "transparent" }} />
          </div>
          <input type="text" value={currentVal}
            onChange={(e) => setColorDraft(prev => ({ ...prev, [k]: e.target.value }))}
            style={{ width: 90, padding: "6px 10px", border: "1px solid var(--border2)", borderRadius: 7, fontSize: 12.5, fontFamily: "inherit", outline: "none", background: "var(--bg)", color: "var(--text)" }} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Theme Controller"
        subtitle="Pick a preset or customize every color — changes apply to the entire app globally"
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

      <div className={`grid gap-6 ${preview ? "grid-cols-2" : "grid-cols-1 max-w-3xl"}`}>
        <div className="space-y-5">
          {/* Tab switcher */}
          <div className="card p-1" style={{ display: "inline-flex", gap: 4 }}>
            {(["presets", "custom"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "7px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "none", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                background: activeTab === tab ? "var(--accent)" : "transparent",
                color: activeTab === tab ? "#fff" : "var(--text2)",
              }}>
                {tab === "presets" ? "🎨  Presets" : "✏️  Custom"}
              </button>
            ))}
          </div>

          {activeTab === "presets" && (
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-1 flex items-center gap-2" style={{ color: "var(--text)" }}>
                <Sparkles size={16} style={{ color: "var(--accent)" }} /> Color Themes
              </h3>
              <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
                Click any theme to preview instantly. Press "Apply Theme" to save.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {PRESET_THEMES.map(preset => (
                  <button key={preset.id} onClick={() => applyPreset(preset)} style={{
                    padding: "12px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                    border: `2px solid ${activePreset === preset.id ? "var(--accent)" : "var(--border)"}`,
                    background: activePreset === preset.id ? "color-mix(in srgb, var(--accent) 8%, var(--bg2))" : "var(--bg2)",
                    fontFamily: "inherit", transition: "all 0.15s", position: "relative",
                  }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                      {preset.preview.map((color, i) => (
                        <div key={i} style={{ width: i === 0 ? 24 : 14, height: 24, borderRadius: 5, background: color, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{preset.name}</p>
                    <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.3 }}>{preset.description}</p>
                    {activePreset === preset.id && (
                      <div style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={12} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "custom" && (
            <div className="space-y-5">
              <div className="card p-5">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Layout size={16} style={{ color: "var(--accent)" }} /> Brand Identity
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--accent)" }}>Platform Name</label>
                    <input className="input" value={merged.brand_name} onChange={e => setColorDraft(p => ({ ...p, brand_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--accent)" }}>Tagline</label>
                    <input className="input" value={merged.brand_tagline} onChange={e => setColorDraft(p => ({ ...p, brand_tagline: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--accent)" }}>Logo URL</label>
                    <input className="input" value={merged.logo_url} onChange={e => setColorDraft(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." />
                    {merged.logo_url && (
                      <div style={{ marginTop: 8, padding: 10, background: "#1C1917", borderRadius: 8, display: "inline-flex" }}>
                        <img src={merged.logo_url} alt="Logo preview" style={{ height: 32, objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Palette size={16} style={{ color: "var(--accent)" }} /> Admin Panel Colors
                </h3>
                <ColorRow label="Primary / Sidebar" k="admin_primary" />
                <ColorRow label="Accent"            k="admin_accent" />
                <ColorRow label="Background"        k="admin_bg" />
                <ColorRow label="Sidebar"           k="admin_sidebar" />
                <ColorRow label="Gold / Highlight"  k="admin_gold" />
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Palette size={16} style={{ color: "#2563EB" }} /> Client Portal Defaults
                  <span className="badge badge-blue text-xs ml-1">Per-client overrides via Clients page</span>
                </h3>
                <ColorRow label="Default Primary"    k="portal_default_primary" />
                <ColorRow label="Default Accent"     k="portal_default_accent" />
                <ColorRow label="Default Background" k="portal_default_bg" />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>Default Font</p>
                    <p style={{ fontSize: 11, color: "var(--accent)", marginTop: 1 }}>portal_default_font</p>
                  </div>
                  <select className="input w-48" value={merged.portal_default_font}
                    onChange={e => setColorDraft(p => ({ ...p, portal_default_font: e.target.value }))}>
                    {FONTS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {preview && (
          <div className="space-y-4 sticky top-8 h-fit">
            <h3 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Live Preview</h3>
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
                  <p className="text-xs font-semibold mb-3" style={{ color: merged.admin_primary || "#1A0F08" }}>Dashboard</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {["Clients","Leads","Revenue","Users"].map(s => (
                      <div key={s} className="rounded-lg p-2 border" style={{ background: merged.admin_bg, borderColor: merged.admin_gold + "44" }}>
                        <p className="text-base font-bold" style={{ color: merged.admin_primary }}>{s === "Revenue" ? "₹8L" : "24"}</p>
                        <p className="text-xs" style={{ color: merged.admin_accent }}>{s}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg p-2 text-xs text-white" style={{ background: merged.admin_accent }}>Primary Button</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg border" style={{ borderColor: "var(--border)" }}>
              <div className="p-3 text-xs font-medium" style={{ background: merged.portal_default_primary, color: merged.portal_default_bg }}>
                Client Portal — {merged.brand_name}
              </div>
              <div className="p-4" style={{ background: merged.portal_default_bg, fontFamily: merged.portal_default_font }}>
                <p className="text-sm font-bold mb-2" style={{ color: merged.portal_default_primary }}>Welcome back!</p>
                <div className="flex gap-2 mb-3">
                  {["Leads","Emails","Revenue"].map((s, i) => (
                    <div key={s} className="flex-1 p-2 rounded-lg border text-xs" style={{ borderColor: merged.portal_default_accent + "44" }}>
                      <p className="font-bold text-sm" style={{ color: merged.portal_default_primary }}>{["12","3.2k","₹8L"][i]}</p>
                      <p style={{ color: merged.portal_default_accent, fontSize: 9 }}>{s}</p>
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
