"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Plus, X, Package, Link2 } from "lucide-react";
import toast from "react-hot-toast";

export default function MappingsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function load() {
    const [cl, pr, mp] = await Promise.all([
      supabase.from("clients").select("id,name,primary_color").order("name"),
      supabase.from("products").select("id,name,category").eq("is_active", true).order("name"),
      supabase.from("client_products").select("id,client_id,product_id,assigned_at,clients(name,primary_color),products(name,category)"),
    ]);
    setClients(cl.data ?? []);
    setProducts(pr.data ?? []);
    setMappings(mp.data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function assign() {
    if (!selectedClient || !selectedProduct) return;
    const exists = mappings.find(m => m.client_id === selectedClient && m.product_id === selectedProduct);
    if (exists) { toast.error("Already assigned"); return; }
    setSaving(true);
    const { error } = await supabase.from("client_products").insert({ client_id: selectedClient, product_id: selectedProduct });
    if (error) toast.error(error.message);
    else { toast.success("Product assigned"); setSelectedProduct(""); load(); }
    setSaving(false);
  }

  async function remove(id: string) {
    const { error } = await supabase.from("client_products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
  }

  // Group mappings by client
  const grouped = clients.map(c => ({
    ...c,
    products: mappings.filter(m => m.client_id === c.id),
  })).filter(c => c.products.length > 0);

  return (
    <div>
      <PageHeader title="Client–Product Mapping" subtitle="Assign products and services to clients" />

      {/* Assign widget */}
      <div className="card p-5 mb-8 max-w-2xl">
        <h3 className="font-semibold mb-4 text-sm" style={{ color: "#1A0F08" }}>Assign a Product to a Client</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Client</label>
            <select className="input" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Product</label>
            <select className="input" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
              <option value="">Select product...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.category ? `(${p.category})` : ""}</option>)}
            </select>
          </div>
          <button onClick={assign} disabled={saving || !selectedClient || !selectedProduct}
            className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <Plus size={16} /> Assign
          </button>
        </div>
      </div>

      {/* Mapping grid */}
      {grouped.length === 0 ? (
        <div className="card p-16 text-center">
          <Link2 size={32} className="mx-auto mb-3 opacity-30" style={{ color: "#A86035" }} />
          <p className="text-sm" style={{ color: "#A86035" }}>No mappings yet. Use the form above to assign products.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {grouped.map(c => (
            <div key={c.id} className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: c.primary_color }}>
                  {c.name.charAt(0)}
                </div>
                <h3 className="font-semibold" style={{ color: "#1A0F08" }}>{c.name}</h3>
                <span className="badge badge-blue ml-auto">{c.products.length} product{c.products.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-2">
                {c.products.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ background: "#FAF4E8", border: "1px solid #EDD9B0" }}>
                    <div className="flex items-center gap-2">
                      <Package size={14} style={{ color: "#A86035" }} />
                      <span className="text-sm font-medium" style={{ color: "#1A0F08" }}>{m.products?.name}</span>
                      {m.products?.category && <span className="badge badge-yellow text-xs">{m.products.category}</span>}
                    </div>
                    <button onClick={() => remove(m.id)} className="p-1 rounded hover:bg-red-50 transition-colors">
                      <X size={14} style={{ color: "#EF4444" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
