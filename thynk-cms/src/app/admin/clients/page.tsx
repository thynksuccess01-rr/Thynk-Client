"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Plus, Search, Edit2, Trash2, Check, X, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { Client } from "@/types";
import Link from "next/link";

const EMPTY: Partial<Client> = {
  name: "", slug: "", industry: "", contact_email: "", contact_phone: "",
  primary_color: "#2C1A0F", accent_color: "#A86035", font_family: "DM Sans", is_active: true,
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<Partial<Client>>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const supabase = createClient();

  async function load() {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients(data ?? []);
  }
  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.industry ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function save() {
    setSaving(true);
    const slug = editing.slug || editing.name!.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload = { ...editing, slug };
    if (editing.id) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message);
      else { toast.success("Client updated"); setModal(false); load(); }
    } else {
      const { data, error } = await supabase.from("clients").insert(payload).select().single();
      if (error) toast.error(error.message);
      else {
        toast.success("Client created");
        if (editing.contact_email) {
          await fetch("/api/admin/users/auto-create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_id: data.id, email: editing.contact_email }),
          });
        }
        setModal(false); load();
      }
    }
    setSaving(false);
  }

  async function deleteClient(id: string) {
    if (!confirm("Delete this client and all related data?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Client deleted"); load(); }
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? "s" : ""} registered`}
        action={
          <button onClick={() => { setEditing(EMPTY); setModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Client
          </button>
        }
      />

      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#A86035" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search clients..." />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#FAF4E8", borderBottom: "1px solid #EDD9B0" }}>
              {["Client", "Industry", "Contact", "Branding", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-5 py-3 font-medium text-xs" style={{ color: "#A86035" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-sm" style={{ color: "#A86035" }}>
                No clients found. <button onClick={() => { setEditing(EMPTY); setModal(true); }} className="underline">Add one</button>
              </td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid #FAF4E8" }} className="hover:bg-amber-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: c.primary_color }}>
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      {/* Clickable name → client detail page */}
                      <Link href={`/admin/clients/${c.id}`}
                        className="font-semibold hover:underline"
                        style={{ color: "#1A0F08" }}>
                        {c.name}
                      </Link>
                      <p className="text-xs" style={{ color: "#A86035" }}>/{c.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4" style={{ color: "#3D2314" }}>{c.industry ?? "—"}</td>
                <td className="px-5 py-4">
                  <p className="text-xs" style={{ color: "#3D2314" }}>{c.contact_email ?? "—"}</p>
                  <p className="text-xs" style={{ color: "#A86035" }}>{c.contact_phone ?? ""}</p>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-1.5">
                    <div className="w-5 h-5 rounded-full border" style={{ background: c.primary_color, borderColor: "#EDD9B0" }} title="Primary" />
                    <div className="w-5 h-5 rounded-full border" style={{ background: c.accent_color, borderColor: "#EDD9B0" }} title="Accent" />
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`badge ${c.is_active ? "badge-green" : "badge-gray"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-1">
                    <Link href={`/admin/clients/${c.id}`}
                      className="p-1.5 rounded-lg hover:bg-blue-50 flex items-center justify-center"
                      title="View details">
                      <Eye size={14} style={{ color: "#3B82F6" }} />
                    </Link>
                    <button onClick={() => { setEditing(c); setModal(true); }} className="p-1.5 rounded-lg hover:bg-amber-100">
                      <Edit2 size={14} style={{ color: "#A86035" }} />
                    </button>
                    <button onClick={() => deleteClient(c.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                      <Trash2 size={14} style={{ color: "#EF4444" }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(26,15,8,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#EDD9B0" }}>
              <h2 className="font-display font-semibold text-lg" style={{ color: "#1A0F08" }}>
                {editing.id ? "Edit Client" : "New Client"}
              </h2>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Client Name *</label>
                  <input className="input" value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Slug (URL)</label>
                  <input className="input" value={editing.slug ?? ""} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="auto-generated" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Industry</label>
                  <input className="input" value={editing.industry ?? ""} onChange={e => setEditing({ ...editing, industry: e.target.value })} placeholder="EdTech" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Contact Email</label>
                  <input className="input" type="email" value={editing.contact_email ?? ""} onChange={e => setEditing({ ...editing, contact_email: e.target.value })} placeholder="contact@client.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Contact Phone</label>
                  <input className="input" value={editing.contact_phone ?? ""} onChange={e => setEditing({ ...editing, contact_phone: e.target.value })} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Font Family</label>
                  <select className="input" value={editing.font_family ?? "DM Sans"} onChange={e => setEditing({ ...editing, font_family: e.target.value })}>
                    {["DM Sans","Inter","Poppins","Roboto","Playfair Display","Lato","Nunito"].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="rounded-xl p-4 space-y-3" style={{ background: "#FAF4E8", border: "1px solid #EDD9B0" }}>
                <p className="text-xs font-semibold" style={{ color: "#A86035" }}>PORTAL BRANDING</p>
                <div className="grid grid-cols-2 gap-4">
                  {(["primary_color","accent_color"] as const).map(k => (
                    <div key={k}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "#3D2314" }}>{k === "primary_color" ? "Primary" : "Accent"} Color</label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={editing[k] ?? "#000000"}
                          onInput={(e) => setEditing({ ...editing, [k]: (e.target as HTMLInputElement).value })}
                          style={{ width: 40, height: 36, borderRadius: 6, cursor: "pointer", border: "1px solid #EDD9B0", padding: 2 }} />
                        <input className="input flex-1" value={editing[k] ?? ""} onChange={e => setEditing({ ...editing, [k]: e.target.value })} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                  className="w-5 h-5 rounded flex items-center justify-center border transition-all"
                  style={{ background: editing.is_active ? "#A86035" : "transparent", borderColor: "#A86035" }}>
                  {editing.is_active && <Check size={12} color="white" />}
                </button>
                <span className="text-sm" style={{ color: "#3D2314" }}>Client is active</span>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t justify-end" style={{ borderColor: "#EDD9B0" }}>
              <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving || !editing.name} className="btn-primary flex items-center gap-2">
                {saving ? "Saving..." : editing.id ? "Update Client" : "Create Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
