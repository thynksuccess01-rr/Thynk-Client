"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, ArrowUp, ArrowDown, ListChecks, Layers } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "@/components/admin/PageHeader";
import { DROPDOWN_REGISTRY, DropdownOption } from "@/lib/dropdowns";

const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#57534E", marginBottom: 5 };

export default function DropdownManagerPage() {
  const [allOptions, setAllOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string>(DROPDOWN_REGISTRY[0]?.key ?? "");
  const [customKeys, setCustomKeys] = useState<string[]>([]);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupKey, setNewGroupKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newColorBg, setNewColorBg] = useState("#EEF2FF");
  const [newColorText, setNewColorText] = useState("#4338CA");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dropdown_options")
      .select("*")
      .order("dropdown_key", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error("Could not load dropdowns — has schema_v3_dropdowns.sql been run in Supabase?");
    }
    const rows = (data ?? []) as DropdownOption[];
    setAllOptions(rows);
    const registryKeys = new Set(DROPDOWN_REGISTRY.map(r => r.key));
    const extraKeys = Array.from(new Set(rows.map(r => r.dropdown_key))).filter(k => !registryKeys.has(k));
    setCustomKeys(extraKeys);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const allGroups = [
    ...DROPDOWN_REGISTRY,
    ...customKeys.map(k => ({ key: k, label: k, description: "Custom dropdown — not yet wired into a page.", pages: ["Not yet used on a page"], hasColor: false })),
  ];
  const activeGroup = allGroups.find(g => g.key === activeKey) ?? allGroups[0];
  const activeOptions = allOptions.filter(o => o.dropdown_key === activeKey).sort((a, b) => a.sort_order - b.sort_order);

  async function addOption() {
    if (!newLabel.trim() || !newValue.trim()) { toast.error("Label and value are required"); return; }
    setSaving(true);
    const maxSort = activeOptions.length ? Math.max(...activeOptions.map(o => o.sort_order)) : 0;
    const { error } = await supabase.from("dropdown_options").insert({
      dropdown_key: activeKey,
      value: newValue.trim().toLowerCase().replace(/\s+/g, "_"),
      label: newLabel.trim(),
      color_bg: activeGroup?.hasColor ? newColorBg : null,
      color_text: activeGroup?.hasColor ? newColorText : null,
      sort_order: maxSort + 1,
      is_active: true,
    });
    setSaving(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "That value already exists in this dropdown" : "Failed to add option"); return; }
    toast.success("Option added — it'll show up next time the page loads");
    setNewLabel(""); setNewValue("");
    load();
  }

  async function createGroup() {
    const key = newGroupKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key) { toast.error("Enter a key for the new dropdown"); return; }
    setActiveKey(key);
    setCustomKeys(prev => Array.from(new Set([...prev, key])));
    setShowNewGroup(false);
    setNewGroupKey("");
  }

  async function toggleActive(opt: DropdownOption) {
    const { error } = await supabase.from("dropdown_options").update({ is_active: !opt.is_active }).eq("id", opt.id);
    if (error) { toast.error("Failed to update"); return; }
    load();
  }

  async function deleteOption(opt: DropdownOption) {
    if (!confirm(`Delete "${opt.label}"? Existing records already using this value will keep it, but it won't be selectable anymore.`)) return;
    const { error } = await supabase.from("dropdown_options").delete().eq("id", opt.id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Deleted");
    load();
  }

  async function move(opt: DropdownOption, dir: -1 | 1) {
    const sorted = activeOptions;
    const idx = sorted.findIndex(o => o.id === opt.id);
    const swapWith = sorted[idx + dir];
    if (!swapWith) return;
    await Promise.all([
      supabase.from("dropdown_options").update({ sort_order: swapWith.sort_order }).eq("id", opt.id),
      supabase.from("dropdown_options").update({ sort_order: opt.sort_order }).eq("id", swapWith.id),
    ]);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Dropdown Manager"
        subtitle="Edit the option lists used by dropdowns across the app — changes apply everywhere that dropdown is used."
        action={
          <button className="btn-secondary" onClick={() => setShowNewGroup(s => !s)} style={{ fontSize: 13 }}>
            <Plus size={14} /> New Dropdown
          </button>
        }
      />

      {showNewGroup && (
        <div className="card" style={{ padding: 16, marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>New dropdown key (e.g. "industry_type")</label>
            <input className="input" value={newGroupKey} onChange={e => setNewGroupKey(e.target.value)} placeholder="my_new_dropdown" />
          </div>
          <button className="btn-primary" onClick={createGroup} style={{ fontSize: 13 }}>Create</button>
          <button className="btn-secondary" onClick={() => setShowNewGroup(false)} style={{ fontSize: 13 }}>Cancel</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
        {/* Left: page-wise list of dropdown groups */}
        <div className="card" style={{ padding: 8 }}>
          {allGroups.map(g => {
            const active = g.key === activeKey;
            const count = allOptions.filter(o => o.dropdown_key === g.key).length;
            return (
              <button key={g.key} onClick={() => setActiveKey(g.key)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none",
                  background: active ? "#FFF7ED" : "transparent", cursor: "pointer", marginBottom: 2, fontFamily: "inherit",
                }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: active ? "#C2410C" : "#1C1917" }}>{g.label}</span>
                  <span style={{ fontSize: 11, color: "#A8A29E" }}>{count}</span>
                </div>
                <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {g.pages.slice(0, 3).map(p => (
                    <span key={p} style={{ fontSize: 10, background: "#F5F4F0", color: "#78716C", padding: "1px 6px", borderRadius: 5 }}>{p}</span>
                  ))}
                  {g.pages.length > 3 && <span style={{ fontSize: 10, color: "#A8A29E" }}>+{g.pages.length - 3} more</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: options for the selected group */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <ListChecks size={16} color="#E8611A" />
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1C1917" }}>{activeGroup?.label}</p>
          </div>
          <p style={{ fontSize: 12.5, color: "#78716C", marginBottom: 6 }}>{activeGroup?.description}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <Layers size={12} color="#A8A29E" />
            <p style={{ fontSize: 11.5, color: "#A8A29E" }}>Used on: {activeGroup?.pages.join(", ")}</p>
          </div>

          {loading ? (
            <p style={{ fontSize: 13, color: "#A8A29E" }}>Loading…</p>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                {activeOptions.length === 0 && (
                  <p style={{ fontSize: 13, color: "#A8A29E" }}>No options yet — add the first one below.</p>
                )}
                {activeOptions.map((opt, i) => (
                  <div key={opt.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                    border: "1px solid #F0EEEC", borderRadius: 9, opacity: opt.is_active ? 1 : 0.5,
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button onClick={() => move(opt, -1)} disabled={i === 0} style={{ border: "none", background: "transparent", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1 }}><ArrowUp size={12} /></button>
                      <button onClick={() => move(opt, 1)} disabled={i === activeOptions.length - 1} style={{ border: "none", background: "transparent", cursor: i === activeOptions.length - 1 ? "default" : "pointer", opacity: i === activeOptions.length - 1 ? 0.3 : 1 }}><ArrowDown size={12} /></button>
                    </div>

                    {activeGroup?.hasColor && (
                      <span style={{
                        fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 8,
                        background: opt.color_bg ?? "#F5F4F0", color: opt.color_text ?? "#78716C",
                      }}>
                        {opt.icon ? `${opt.icon} ` : ""}{opt.label}
                      </span>
                    )}
                    {!activeGroup?.hasColor && (
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1C1917" }}>{opt.icon ? `${opt.icon} ` : ""}{opt.label}</span>
                    )}
                    <span style={{ fontSize: 11.5, color: "#A8A29E", fontFamily: "monospace" }}>value: {opt.value}</span>

                    <div style={{ flex: 1 }} />
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#78716C", cursor: "pointer" }}>
                      <input type="checkbox" checked={opt.is_active} onChange={() => toggleActive(opt)} /> Active
                    </label>
                    <button onClick={() => deleteOption(opt)} style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex" }}>
                      <Trash2 size={14} color="#EF4444" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new option */}
              <div style={{ background: "#F9F8F7", border: "1px dashed #E7E5E4", borderRadius: 10, padding: 14 }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: "#57534E", marginBottom: 10 }}>Add a new option to "{activeGroup?.label}"</p>
                <div style={{ display: "grid", gridTemplateColumns: activeGroup?.hasColor ? "1fr 1fr auto auto auto" : "1fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
                  <div>
                    <label style={lbl}>Label (shown to user)</label>
                    <input className="input" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Contract Signed" style={{ fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={lbl}>Value (stored internally)</label>
                    <input className="input" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="e.g. contract_signed" style={{ fontSize: 13 }} />
                  </div>
                  {activeGroup?.hasColor && (
                    <>
                      <div>
                        <label style={lbl}>Background</label>
                        <input type="color" value={newColorBg} onChange={e => setNewColorBg(e.target.value)} style={{ width: 44, height: 34, border: "1px solid #E7E5E4", borderRadius: 7, cursor: "pointer" }} />
                      </div>
                      <div>
                        <label style={lbl}>Text</label>
                        <input type="color" value={newColorText} onChange={e => setNewColorText(e.target.value)} style={{ width: 44, height: 34, border: "1px solid #E7E5E4", borderRadius: 7, cursor: "pointer" }} />
                      </div>
                    </>
                  )}
                  <button className="btn-primary" onClick={addOption} disabled={saving} style={{ fontSize: 13, height: 34 }}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
