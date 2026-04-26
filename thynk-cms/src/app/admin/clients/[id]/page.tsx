"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft, Upload, Trash2, Download, Bell, Send, FileText,
  FileSpreadsheet, Film, Music, File, Eye, Check, X, Plus,
  TrendingUp, DollarSign, Package, Users, Calendar, Clock,
  Mail, Phone, MapPin, Activity
} from "lucide-react";
import toast from "react-hot-toast";

const TABS = ["Overview", "Documents", "Notifications", "Login History"];
const DOC_CATS = ["general", "report", "contract", "invoice", "media"];
const NOTIF_TYPES = ["admin_message", "data_update", "document", "lead_update", "system"];

const fmtINR = (n: number) => `₹${n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n}`;
const fmtSize = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b > 1024 ? `${(b / 1024).toFixed(0)} KB` : `${b} B`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function FileIcon({ type }: { type: string }) {
  if (type.includes("pdf"))   return <FileText  size={20} color="#EF4444" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return <FileSpreadsheet size={20} color="#16A34A" />;
  if (type.includes("word") || type.includes("doc"))  return <FileText  size={20} color="#2563EB" />;
  if (type.includes("video")) return <Film      size={20} color="#7C3AED" />;
  if (type.includes("audio")) return <Music     size={20} color="#F59E0B" />;
  return <File size={20} color="#78716C" />;
}

const NOTIF_META: Record<string, { icon: string; color: string; bg: string }> = {
  admin_message: { icon: "💬", color: "#4338CA", bg: "#EEF2FF" },
  data_update:   { icon: "📊", color: "#15803D", bg: "#DCFCE7" },
  document:      { icon: "📎", color: "#7C3AED", bg: "#F5F3FF" },
  lead_update:   { icon: "🎯", color: "#B45309", bg: "#FFFBEB" },
  system:        { icon: "🔔", color: "#0891B2", bg: "#ECFEFF" },
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab,          setTab]          = useState("Overview");
  const [client,       setClient]       = useState<any>(null);
  const [products,     setProducts]     = useState<any[]>([]);
  const [entries,      setEntries]      = useState<any[]>([]);
  const [leads,        setLeads]        = useState<any[]>([]);
  const [documents,    setDocuments]    = useState<any[]>([]);
  const [notifications,setNotifications]= useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [docCategory,  setDocCategory]  = useState("general");
  const [docDesc,      setDocDesc]      = useState("");

  // Notification compose
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody,  setNotifBody]  = useState("");
  const [notifType,  setNotifType]  = useState("admin_message");
  const [sendingNotif, setSendingNotif] = useState(false);

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true);
    const [
      { data: c },
      { data: mp },
      { data: e },
      { data: l },
      { data: docs },
      { data: notifs },
      { data: logins },
    ] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("client_products").select("products(id,name,category,description)").eq("client_id", id),
      supabase.from("data_entries").select("*").eq("client_id", id).order("period_start", { ascending: false }),
      supabase.from("leads").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("client_documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("portal_login_history").select("*").eq("client_id", id).order("logged_in_at", { ascending: false }).limit(50),
    ]);
    setClient(c);
    setProducts((mp ?? []).map((m: any) => m.products).filter(Boolean));
    setEntries(e ?? []);
    setLeads(l ?? []);
    setDocuments(docs ?? []);
    setNotifications(notifs ?? []);
    setLoginHistory(logins ?? []);
    setLoading(false);
  }

  // ── Upload document ────────────────────────────────────────────────────────
  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    // Ensure storage bucket exists (creates it if missing)
    try {
      await fetch("/api/admin/ensure-bucket", { method: "POST" });
    } catch (_) { /* non-fatal */ }
    const { data: { user } } = await supabase.auth.getUser();
    let successCount = 0;
    for (const file of Array.from(files)) {
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("client-documents")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) {
          console.error("Storage upload error:", upErr);
          toast.error(`Upload failed for "${file.name}": ${upErr.message}`);
          continue;
        }
        const { data: urlData } = supabase.storage.from("client-documents").getPublicUrl(path);
        const { error: dbErr } = await supabase.from("client_documents").insert({
          client_id:   id,
          uploaded_by: user?.id,
          file_name:   file.name,
          file_path:   path,
          file_url:    urlData.publicUrl,
          file_type:   file.type || "application/octet-stream",
          file_size:   file.size,
          category:    docCategory,
          description: docDesc || null,
        });
        if (dbErr) { toast.error(`DB error: ${dbErr.message}`); continue; }
        // Auto-notify client
        await supabase.from("notifications").insert({
          client_id:  id,
          type:       "document",
          title:      `📎 New document shared: ${file.name}`,
          body:       docDesc || `A new ${docCategory} document has been shared with you.`,
          metadata:   { file_name: file.name, category: docCategory },
          created_by: user?.id,
        });
        successCount++;
      } catch (err: any) {
        toast.error(`Error uploading "${file.name}": ${err?.message ?? "Unknown error"}`);
      }
    }
    if (successCount > 0) toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded successfully`);
    setDocDesc("");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    loadAll();
  }

  async function deleteDocument(doc: any) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    await supabase.storage.from("client-documents").remove([doc.file_path]);
    await supabase.from("client_documents").delete().eq("id", doc.id);
    toast.success("Document deleted");
    loadAll();
  }

  // ── Send notification ──────────────────────────────────────────────────────
  async function sendNotification() {
    if (!notifTitle.trim()) { toast.error("Title required"); return; }
    setSendingNotif(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("notifications").insert({
      client_id:  id,
      type:       notifType,
      title:      notifTitle.trim(),
      body:       notifBody.trim() || null,
      created_by: user?.id,
    });
    toast.success("Notification sent");
    setNotifTitle(""); setNotifBody(""); setNotifType("admin_message");
    setSendingNotif(false);
    loadAll();
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalRev      = entries.reduce((s, e) => s + (e.total_revenue_collected ?? 0), 0);
  const expectedRev   = entries.reduce((s, e) => s + (e.expected_collection ?? 0), 0);
  const totalLic      = entries.reduce((s, e) => s + (e.total_licences ?? 0), 0);
  const wonLeads      = leads.filter(l => l.status === "won").length;
  const activeLeads   = leads.filter(l => !["won","lost"].includes(l.status)).length;
  const lastEntry     = entries[0];
  const unreadNotifs  = notifications.filter(n => !n.is_read).length;
  const emailSent     = entries.reduce((s, e) => s + (e.email_sent ?? 0), 0);
  const waSent        = entries.reduce((s, e) => s + (e.whatsapp_sent ?? 0), 0);
  const callsMade     = entries.reduce((s, e) => s + (e.calls_made ?? 0), 0);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#A8A29E", fontSize: 14 }}>
      Loading client details...
    </div>
  );

  if (!client) return (
    <div style={{ textAlign: "center", padding: "80px 0", color: "#A8A29E" }}>
      Client not found. <Link href="/admin/clients" style={{ color: "#E8611A" }}>Go back</Link>
    </div>
  );

  return (
    <div>
      {/* ── Breadcrumb ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Link href="/admin/clients" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#78716C", textDecoration: "none" }}>
          <ArrowLeft size={14} /> Clients
        </Link>
        <span style={{ color: "#D6D3D1" }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1917" }}>{client.name}</span>
      </div>

      {/* ── Client Hero ── */}
      <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 16, padding: "24px 28px", marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: client.primary_color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 24, fontWeight: 800 }}>
            {client.name.charAt(0)}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1C1917", margin: 0 }}>{client.name}</h1>
            <div style={{ display: "flex", gap: 12, marginTop: 5, flexWrap: "wrap" }}>
              {client.industry && <span style={{ fontSize: 12.5, color: "#78716C" }}>🏢 {client.industry}</span>}
              {client.contact_email && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "#78716C" }}><Mail size={12}/>{client.contact_email}</span>}
              {client.contact_phone && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "#78716C" }}><Phone size={12}/>{client.contact_phone}</span>}
              <span style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 8, background: client.is_active ? "#DCFCE7" : "#F5F4F0", color: client.is_active ? "#15803D" : "#78716C", fontWeight: 600 }}>
                {client.is_active ? "Active" : "Inactive"}
              </span>
              {unreadNotifs > 0 && <span style={{ fontSize: 11.5, background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>🔔 {unreadNotifs} unread</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: client.primary_color, border: "2px solid #E7E5E4" }} title="Primary" />
            <div style={{ width: 28, height: 28, borderRadius: 8, background: client.accent_color, border: "2px solid #E7E5E4" }} title="Accent" />
          </div>
          <Link href={`/admin/clients/${id}/edit`}
            style={{ padding: "8px 14px", border: "1px solid #E7E5E4", borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: "#1C1917", textDecoration: "none", background: "#fff" }}>
            Edit
          </Link>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { icon: "📅", label: "Periods",    value: entries.length,        color: "#6366F1" },
          { icon: "🎯", label: "Total Leads", value: leads.length,          color: "#E8611A" },
          { icon: "✅", label: "Won Leads",  value: wonLeads,              color: "#16A34A" },
          { icon: "🔵", label: "Active",     value: activeLeads,           color: "#F59E0B" },
          { icon: "₹",  label: "Collected",  value: fmtINR(totalRev),      color: "#16A34A" },
          { icon: "🔮", label: "Expected",   value: fmtINR(expectedRev),   color: "#D97706" },
          { icon: "📦", label: "Licences",   value: totalLic,              color: "#0891B2" },
          { icon: "📎", label: "Documents",  value: documents.length,      color: "#7C3AED" },
        ].map((s,i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <p style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#A8A29E", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E7E5E4", marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "10px 22px", fontSize: 13.5, fontWeight: 600, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: tab === t ? "#E8611A" : "#78716C", borderBottom: tab === t ? "2px solid #E8611A" : "2px solid transparent", marginBottom: -2, transition: "all 0.15s" }}>
            {t}
            {t === "Notifications" && unreadNotifs > 0 && <span style={{ marginLeft: 6, fontSize: 10, background: "#EF4444", color: "#fff", borderRadius: "50%", padding: "1px 5px", fontWeight: 700 }}>{unreadNotifs}</span>}
          </button>
        ))}
      </div>

      {/* ══════════════════ OVERVIEW ══════════════════ */}
      {tab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Products */}
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: "#F9F8F7", borderBottom: "1px solid #F0EEEC" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917" }}>📦 Products Mapped</p>
            </div>
            <div style={{ padding: 16 }}>
              {products.length === 0 ? <p style={{ color: "#A8A29E", fontSize: 13 }}>No products mapped</p> : products.map((p: any) => (
                <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid #F5F4F0", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1C1917" }}>{p.name}</p>
                    {p.category && <p style={{ fontSize: 11.5, color: "#78716C" }}>{p.category}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campaign Summary */}
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: "#F9F8F7", borderBottom: "1px solid #F0EEEC" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917" }}>📊 Campaign Summary (All Time)</p>
            </div>
            <div style={{ padding: 16 }}>
              {[
                { icon: "📧", label: "Emails Sent",    value: emailSent, color: "#2563EB" },
                { icon: "💬", label: "WhatsApp Sent",  value: waSent,    color: "#16A34A" },
                { icon: "📞", label: "Calls Made",     value: callsMade, color: "#7C3AED" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F5F4F0" }}>
                  <span style={{ fontSize: 13, color: "#78716C" }}>{r.icon} {r.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: r.color }}>{r.value.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Summary */}
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: "#F9F8F7", borderBottom: "1px solid #F0EEEC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917" }}>🎯 Leads Summary</p>
              <Link href={`/admin/Leads`} style={{ fontSize: 11.5, color: "#E8611A", textDecoration: "none" }}>View All →</Link>
            </div>
            <div style={{ padding: 16 }}>
              {["new","contacted","qualified","proposal","negotiation","won","lost"].map(s => {
                const count = leads.filter(l => l.status === s).length;
                const pct = leads.length > 0 ? Math.round(count / leads.length * 100) : 0;
                if (!count) return null;
                const colors: Record<string,string> = { new:"#6366F1", contacted:"#F59E0B", qualified:"#F97316", proposal:"#8B5CF6", negotiation:"#F59E0B", won:"#16A34A", lost:"#EF4444" };
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #F5F4F0" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[s], flexShrink: 0, display: "inline-block" }} />
                    <span style={{ fontSize: 12.5, color: "#57534E", flex: 1 }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                    <div style={{ width: 80, height: 5, background: "#F0EEEC", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: colors[s], borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: colors[s], minWidth: 20, textAlign: "right" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue Summary */}
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: "#F9F8F7", borderBottom: "1px solid #F0EEEC" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917" }}>💰 Revenue Summary</p>
            </div>
            <div style={{ padding: 16 }}>
              {[
                { label: "Total Collected",  value: fmtINR(totalRev),    color: "#16A34A" },
                { label: "Expected Total",   value: fmtINR(expectedRev), color: "#D97706" },
                { label: "Total Licences",   value: totalLic.toLocaleString("en-IN"), color: "#0891B2" },
                { label: "Won Lead Revenue", value: fmtINR(leads.filter(l=>l.status==="won").reduce((s,l)=>s+(l.expected_revenue??0),0)), color: "#16A34A" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F5F4F0" }}>
                  <span style={{ fontSize: 13, color: "#78716C" }}>{r.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Last Data Update */}
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, overflow: "hidden", gridColumn: "span 2" }}>
            <div style={{ padding: "14px 18px", background: "#F9F8F7", borderBottom: "1px solid #F0EEEC" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917" }}>📋 Period History & Last Data Updates</p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#FAFAF9", borderBottom: "1px solid #F0EEEC" }}>
                  {["Period", "Label", "Email", "WhatsApp", "Calls", "Revenue", "Licences", "Last Updated"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#A8A29E" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: "32px 0", color: "#A8A29E" }}>No periods yet</td></tr>
                  ) : entries.map(e => (
                    <tr key={e.id} style={{ borderBottom: "1px solid #FAFAF9" }}>
                      <td style={{ padding: "9px 12px", fontSize: 12, color: "#78716C" }}>{e.period_start} – {e.period_end}</td>
                      <td style={{ padding: "9px 12px" }}><span style={{ background: "#EEF2FF", color: "#4338CA", padding: "2px 7px", borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>{e.entry_label || "—"}</span></td>
                      <td style={{ padding: "9px 12px", color: "#2563EB", fontWeight: 600 }}>{(e.email_sent ?? 0).toLocaleString()}</td>
                      <td style={{ padding: "9px 12px", color: "#16A34A", fontWeight: 600 }}>{(e.whatsapp_sent ?? 0).toLocaleString()}</td>
                      <td style={{ padding: "9px 12px", color: "#7C3AED", fontWeight: 600 }}>{(e.calls_made ?? 0).toLocaleString()}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#16A34A" }}>{fmtINR(e.total_revenue_collected ?? 0)}</td>
                      <td style={{ padding: "9px 12px", color: "#0891B2", fontWeight: 600 }}>{e.total_licences ?? 0}</td>
                      <td style={{ padding: "9px 12px", fontSize: 11.5, color: "#A8A29E" }}>{e.updated_at ? new Date(e.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ DOCUMENTS ══════════════════ */}
      {tab === "Documents" && (
        <div>
          {/* Upload area */}
          <div style={{ background: "#fff", border: "2px dashed #E7E5E4", borderRadius: 14, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "flex-end", marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#57534E", marginBottom: 5 }}>Category</label>
                <select value={docCategory} onChange={e => setDocCategory(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E7E5E4", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", cursor: "pointer" }}>
                  {DOC_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#57534E", marginBottom: 5 }}>Description (optional)</label>
                <input value={docDesc} onChange={e => setDocDesc(e.target.value)} placeholder="Brief description..."
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E7E5E4", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", background: "#E8611A", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: uploading ? 0.7 : 1 }}>
                <Upload size={15} /> {uploading ? "Uploading..." : "Upload Files"}
              </button>
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.mp4,.mp3,.wav,.png,.jpg,.jpeg,.txt"
              style={{ display: "none" }} onChange={e => handleUpload(e.target.files)} />
            <p style={{ fontSize: 12, color: "#A8A29E", textAlign: "center" }}>
              Supports PDF, Word, Excel, CSV, Audio, Video, Images · Client will be notified automatically
            </p>
          </div>

          {/* Document list */}
          {documents.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: "60px 0", textAlign: "center", color: "#A8A29E", fontSize: 13 }}>
              No documents uploaded yet
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {documents.map(doc => (
                <div key={doc.id} style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 40, height: 40, background: "#F5F4F0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FileIcon type={doc.file_type} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={doc.file_name}>{doc.file_name}</p>
                      <p style={{ fontSize: 11.5, color: "#A8A29E", marginTop: 2 }}>{fmtSize(doc.file_size ?? 0)} · {doc.category}</p>
                    </div>
                  </div>
                  {doc.description && <p style={{ fontSize: 12, color: "#78716C", lineHeight: 1.5 }}>{doc.description}</p>}
                  <p style={{ fontSize: 11, color: "#A8A29E" }}>📅 {fmtDate(doc.created_at)}</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a href={doc.file_url} target="_blank" rel="noreferrer"
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 0", border: "1px solid #E7E5E4", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#1C1917", textDecoration: "none" }}>
                      <Eye size={13} /> View
                    </a>
                    <a href={doc.file_url} download={doc.file_name}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 0", border: "1px solid #E7E5E4", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#1C1917", textDecoration: "none" }}>
                      <Download size={13} /> Download
                    </a>
                    <button onClick={() => deleteDocument(doc)}
                      style={{ padding: "7px 10px", border: "1px solid #FEE2E2", borderRadius: 7, background: "transparent", cursor: "pointer", display: "flex" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#FEE2E2")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <Trash2 size={13} color="#EF4444" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ NOTIFICATIONS ══════════════════ */}
      {tab === "Notifications" && (
        <div>
          {/* Compose */}
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1C1917", marginBottom: 14 }}>✉️ Send Notification to {client.name}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#57534E", marginBottom: 5 }}>Type</label>
                <select value={notifType} onChange={e => setNotifType(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E7E5E4", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                  {NOTIF_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#57534E", marginBottom: 5 }}>Title *</label>
                <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="Notification title..."
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E7E5E4", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <textarea value={notifBody} onChange={e => setNotifBody(e.target.value)} rows={3}
              placeholder="Message body (optional)..."
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #E7E5E4", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "none", marginBottom: 12, boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={sendNotification} disabled={sendingNotif || !notifTitle.trim()}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "#E8611A", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: sendingNotif ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: sendingNotif || !notifTitle.trim() ? 0.6 : 1 }}>
                <Send size={14} /> {sendingNotif ? "Sending..." : "Send Notification"}
              </button>
            </div>
          </div>

          {/* Notification history */}
          <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: "#F9F8F7", borderBottom: "1px solid #F0EEEC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917" }}>Notification History ({notifications.length})</p>
              {unreadNotifs > 0 && <span style={{ fontSize: 11.5, background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>{unreadNotifs} unread</span>}
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: "#A8A29E", fontSize: 13 }}>No notifications yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {notifications.map(n => {
                  const meta = NOTIF_META[n.type] ?? NOTIF_META.system;
                  return (
                    <div key={n.id} style={{ padding: "14px 18px", borderBottom: "1px solid #F5F4F0", display: "flex", alignItems: "flex-start", gap: 12, background: n.is_read ? "#fff" : "#FFFBEB" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                        {meta.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#1C1917" }}>{n.title}</p>
                          <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 6, background: meta.bg, color: meta.color, fontWeight: 600 }}>{n.type.replace(/_/g," ")}</span>
                          {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#F59E0B", display: "inline-block" }} />}
                        </div>
                        {n.body && <p style={{ fontSize: 12.5, color: "#78716C", lineHeight: 1.5 }}>{n.body}</p>}
                        <p style={{ fontSize: 11, color: "#A8A29E", marginTop: 4 }}>{fmtDate(n.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ LOGIN HISTORY ══════════════════ */}
      {tab === "Login History" && (
        <div style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", background: "#F9F8F7", borderBottom: "1px solid #F0EEEC" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917" }}>🔐 Portal Login History ({loginHistory.length} sessions)</p>
          </div>
          {loginHistory.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "#A8A29E", fontSize: 13 }}>
              No login history yet. Client has not logged in.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#FAFAF9", borderBottom: "1px solid #F0EEEC" }}>
                {["Email", "Login Time", "IP Address", "Device / Browser"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "9px 16px", fontSize: 11.5, fontWeight: 600, color: "#A8A29E" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loginHistory.map(l => (
                  <tr key={l.id} style={{ borderBottom: "1px solid #F5F4F0" }}>
                    <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1C1917" }}>{l.email || "—"}</td>
                    <td style={{ padding: "10px 16px", color: "#78716C", fontSize: 12.5 }}>{fmtDate(l.logged_in_at)}</td>
                    <td style={{ padding: "10px 16px", color: "#78716C", fontSize: 12, fontFamily: "monospace" }}>{l.ip_address || "—"}</td>
                    <td style={{ padding: "10px 16px", color: "#A8A29E", fontSize: 11.5, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.user_agent || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
