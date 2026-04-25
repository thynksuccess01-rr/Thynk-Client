"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Plus, Search, Edit2, Trash2, X, Check } from "lucide-react";
import toast from "react-hot-toast";
import { Product } from "@/types";

const EMPTY: Partial<Product> = { name: "", description: "", category: "", is_active: true };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Partial<Product>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function load() {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts(data ?? []);
  }
  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function save() {
    setSaving(true);
    if (editing.id) {
      const { error } = await supabase.from("products").update(editing).eq("id", editing.id);
      if (error) toast.error(error.message); else { toast.success("Product updated"); setModal(false); load(); }
    } else {
      const { error } = await supabase.from("products").insert(editing);
      if (error) toast.error(error.message); else { toast.success("Product created"); setModal(false); load(); }
    }
    setSaving(false);
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Services and offerings you assign to clients"
        action={
          <button onClick={() => { setEditing(EMPTY); setModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Product
          </button>
        }
      />

      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#A86035" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search products..." />
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSearch(cat!)}
              className="badge badge-yellow cursor-pointer hover:bg-amber-200 transition-colors">{cat}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16 card">
            <p className="text-sm" style={{ color: "#A86035" }}>No products found.</p>
          </div>
        ) : filtered.map(p => (
          <div key={p.id} className="card p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold" style={{ color: "#1A0F08" }}>{p.name}</h3>
                {p.category && <span className="badge badge-yellow text-xs mt-1">{p.category}</span>}
              </div>
              <span className={`badge ${p.is_active ? "badge-green" : "badge-gray"} text-xs`}>
                {p.is_active ? "Active" : "Off"}
              </span>
            </div>
            <p className="text-sm mb-4" style={{ color: "#3D2314" }}>{p.description ?? "No description"}</p>
            <div className="flex gap-2 pt-3 border-t" style={{ borderColor: "#EDD9B0" }}>
              <button onClick={() => { setEditing(p); setModal(true); }} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1">
                <Edit2 size={12} /> Edit
              </button>
              <button onClick={() => deleteProduct(p.id)} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1 hover:text-red-500">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(26,15,8,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="card w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#EDD9B0" }}>
              <h2 className="font-display font-semibold text-lg" style={{ color: "#1A0F08" }}>
                {editing.id ? "Edit Product" : "New Product"}
              </h2>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Product Name *</label>
                <input className="input" value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Email Marketing" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Category</label>
                <input className="input" value={editing.category ?? ""} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="e.g. Digital Marketing" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Description</label>
                <textarea className="input resize-none" rows={3} value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Brief description..." />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                  className="w-5 h-5 rounded flex items-center justify-center border transition-all"
                  style={{ background: editing.is_active ? "#A86035" : "transparent", borderColor: "#A86035" }}>
                  {editing.is_active && <Check size={12} color="white" />}
                </button>
                <span className="text-sm" style={{ color: "#3D2314" }}>Product is active</span>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t justify-end" style={{ borderColor: "#EDD9B0" }}>
              <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving || !editing.name} className="btn-primary">
                {saving ? "Saving..." : editing.id ? "Update" : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
