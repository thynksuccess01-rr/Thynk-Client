"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Download, Eye, FileText, FileSpreadsheet, Film, Music, File, Search } from "lucide-react";

const CAT_COLORS: Record<string,{bg:string,text:string}> = {
  general:  { bg:"#F5F4F0", text:"#57534E" },
  report:   { bg:"#EEF2FF", text:"#4338CA" },
  contract: { bg:"#FEF3C7", text:"#92400E" },
  invoice:  { bg:"#DCFCE7", text:"#15803D" },
  media:    { bg:"#F5F3FF", text:"#6D28D9" },
};

const fmtSize = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b > 1024 ? `${(b / 1024).toFixed(0)} KB` : `${b} B`;

function FileIcon({ type }: { type: string }) {
  const sz = 24;
  if (type.includes("pdf"))   return <FileText       size={sz} color="#EF4444" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return <FileSpreadsheet size={sz} color="#16A34A" />;
  if (type.includes("word") || type.includes("doc"))  return <FileText       size={sz} color="#2563EB" />;
  if (type.includes("video")) return <Film           size={sz} color="#7C3AED" />;
  if (type.includes("audio")) return <Music          size={sz} color="#F59E0B" />;
  return <File size={sz} color="#78716C" />;
}

const CATS = ["all","general","report","contract","invoice","media"];

export default function PortalDocumentsPage() {
  const [docs,    setDocs]    = useState<any[]>([]);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [accent,  setAccent]  = useState("#E8611A");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("client_id, clients(accent_color)").eq("id", user.id).single();
      if (!p?.client_id) return;
      const clientData = p.clients as any;
      if (clientData?.accent_color) setAccent(clientData.accent_color);
      const { data } = await supabase.from("client_documents")
        .select("*").eq("client_id", p.client_id).order("created_at", { ascending: false });
      setDocs(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = docs.filter(d => {
    if (filter !== "all" && d.category !== filter) return false;
    if (search && !d.file_name.toLowerCase().includes(search.toLowerCase()) && !(d.description??"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categoryCounts = CATS.reduce((acc, c) => {
    acc[c] = c === "all" ? docs.length : docs.filter(d => d.category === c).length;
    return acc;
  }, {} as Record<string,number>);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1C1917", letterSpacing: "-0.02em" }}>
            My <span style={{ color: accent }}>Documents</span>
          </h1>
          <p style={{ fontSize: 13, color: "#78716C", marginTop: 4 }}>
            {docs.length} documents shared by your account manager
          </p>
        </div>
      </div>

      {/* Category filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {CATS.map(c => {
          const count = categoryCounts[c] ?? 0;
          const active = filter === c;
          const meta = CAT_COLORS[c] ?? { bg: "#F5F4F0", text: "#57534E" };
          return (
            <button key={c} onClick={() => setFilter(c)}
              style={{ padding: "7px 16px", fontSize: 12.5, fontWeight: 600, border: active ? `2px solid ${meta.text}` : "2px solid #E7E5E4", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", background: active ? meta.bg : "#fff", color: active ? meta.text : "#78716C", transition: "all 0.15s" }}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
              {count > 0 && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 400, marginBottom: 20 }}>
        <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#A8A29E" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..."
          style={{ width: "100%", padding: "9px 14px 9px 34px", border: "1px solid #E7E5E4", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
      </div>

      {loading ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: "80px 0", textAlign: "center", color: "#A8A29E", fontSize: 13, border: "1px solid #E7E5E4" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: "80px 0", textAlign: "center", color: "#A8A29E", fontSize: 13, border: "1px solid #E7E5E4" }}>
          {docs.length === 0 ? "No documents have been shared yet" : "No documents match your filter"}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {filtered.map(doc => {
            const meta = CAT_COLORS[doc.category] ?? CAT_COLORS.general;
            return (
              <div key={doc.id} style={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
                {/* Preview area */}
                <div style={{ padding: "24px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, background: "#F9F8F7", borderBottom: "1px solid #F0EEEC" }}>
                  <div style={{ width: 56, height: 56, background: "#fff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E7E5E4", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <FileIcon type={doc.file_type} />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: meta.bg, color: meta.text }}>
                    {doc.category.charAt(0).toUpperCase() + doc.category.slice(1)}
                  </span>
                </div>

                {/* Info */}
                <div style={{ padding: "14px 16px", flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={doc.file_name}>
                    {doc.file_name}
                  </p>
                  {doc.description && <p style={{ fontSize: 12, color: "#78716C", marginBottom: 6, lineHeight: 1.5 }}>{doc.description}</p>}
                  <p style={{ fontSize: 11, color: "#A8A29E" }}>
                    {fmtSize(doc.file_size ?? 0)} · {new Date(doc.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ padding: "12px 16px", borderTop: "1px solid #F5F4F0", display: "flex", gap: 8 }}>
                  <a href={doc.file_url} target="_blank" rel="noreferrer"
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 0", border: "1px solid #E7E5E4", borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: "#1C1917", textDecoration: "none" }}>
                    <Eye size={13} /> View
                  </a>
                  <a href={doc.file_url} download={doc.file_name}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 0", background: accent, border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: "#fff", textDecoration: "none" }}>
                    <Download size={13} /> Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
