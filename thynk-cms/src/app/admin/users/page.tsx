"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Plus, Trash2, X, Mail, Shield } from "lucide-react";
import toast from "react-hot-toast";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role: "client", client_id: "", password: "" });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function load() {
    const [u, c] = await Promise.all([
      supabase.from("profiles").select("*,clients(name)").order("created_at", { ascending: false }),
      supabase.from("clients").select("id,name").order("name"),
    ]);
    setUsers(u.data ?? []);
    setClients(c.data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function createUser() {
    setSaving(true);
    const res = await fetch("/api/admin/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error ?? "Failed to create user");
    else { toast.success("User created & invite sent"); setModal(false); load(); }
    setSaving(false);
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user?")) return;
    const res = await fetch(`/api/admin/users/delete?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("User deleted"); load(); }
    else toast.error("Failed to delete");
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage admin and client portal logins"
        action={
          <button onClick={() => { setForm({ email: "", full_name: "", role: "client", client_id: "", password: "" }); setModal(true); }}
            className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Create User
          </button>
        }
      />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#FAF4E8", borderBottom: "1px solid #EDD9B0" }}>
              {["User","Email","Role","Client","Created","Actions"].map(h => (
                <th key={h} className="text-left px-5 py-3 font-medium text-xs" style={{ color: "#A86035" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-sm" style={{ color: "#A86035" }}>No users yet.</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid #FAF4E8" }} className="hover:bg-amber-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: u.role === "admin" ? "#2C1A0F" : "#A86035" }}>
                      {(u.full_name ?? u.email ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <p className="font-medium" style={{ color: "#1A0F08" }}>{u.full_name ?? "—"}</p>
                  </div>
                </td>
                <td className="px-5 py-4 text-xs" style={{ color: "#3D2314" }}>{u.email}</td>
                <td className="px-5 py-4">
                  <span className={`badge ${u.role === "admin" ? "badge-red" : "badge-blue"}`}>
                    {u.role === "admin" ? <><Shield size={10} className="inline mr-1" />Admin</> : "Client"}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm" style={{ color: "#3D2314" }}>{u.clients?.name ?? "—"}</td>
                <td className="px-5 py-4 text-xs" style={{ color: "#A86035" }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-4">
                  <button onClick={() => deleteUser(u.id)} className="btn-ghost p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 size={14} style={{ color: "#EF4444" }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(26,15,8,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="card w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#EDD9B0" }}>
              <h2 className="font-display font-semibold text-lg" style={{ color: "#1A0F08" }}>Create User</h2>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Full Name</label>
                <input className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Email *</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Temporary Password *</label>
                <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Role</label>
                <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {form.role === "client" && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#A86035" }}>Link to Client</label>
                  <select className="input" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="rounded-xl p-3 text-xs flex gap-2" style={{ background: "#FAF4E8", color: "#A86035" }}>
                <Mail size={14} className="shrink-0 mt-0.5" />
                User will receive a login invite email automatically.
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t justify-end" style={{ borderColor: "#EDD9B0" }}>
              <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={createUser} disabled={saving || !form.email || !form.password} className="btn-primary">
                {saving ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
